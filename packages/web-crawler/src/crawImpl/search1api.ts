import { CrawlImpl, CrawlSuccessResult } from '../type';
import { NetworkConnectionError, PageNotFoundError, TimeoutError } from '../utils/errorType';
import { DEFAULT_TIMEOUT, withTimeout } from '../utils/withTimeout';

interface Search1ApiResponse {
  crawlParameters: {
    url: string;
  };
  results: {
    title?: string;
    link?: string;
    content?: string;
  };
}

export const search1api: CrawlImpl = async (url, { filterOptions }) => {
  // Get API key from environment variable
  const apiKey = process.env.SEARCH1API_API_KEY;
  
  if (!apiKey) {
    throw new Error('SEARCH1API_API_KEY environment variable is not set. Visit https://www.search1api.com to get free quota.');
  }

  let res: Response;

  try {
    res = await withTimeout(
      fetch('https://api.search1api.com/crawl', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
        }),
      }),
      DEFAULT_TIMEOUT,
    );
  } catch (e) {
    const error = e as Error;
    if (error.message === 'fetch failed') {
      throw new NetworkConnectionError();
    }

    if (error instanceof TimeoutError) {
      throw error;
    }

    throw e;
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new PageNotFoundError(res.statusText);
    }
    
    throw new Error(`Search1API request failed with status ${res.status}: ${res.statusText}`);
  }

  try {
    const data = await res.json() as Search1ApiResponse;
    
    // Check if content is empty or too short
    if (!data.results.content || data.results.content.length < 100) {
      return;
    }
    
    return {
      content: data.results.content,
      contentType: 'text',
      title: data.results.title,
      description: data.results.title, // Using title as description since API doesn't provide a separate description
      length: data.results.content.length,
      siteName: new URL(url).hostname,
      url: data.results.link || url,
    } satisfies CrawlSuccessResult;
  } catch (error) {
    console.error(error);
  }
  
  return;
}; 