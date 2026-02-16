/**
 * Rate-limited HTTP client for legislation.gov.uk
 *
 * - 250ms minimum delay between requests
 * - User-Agent header identifying the MCP
 * - Handles XML and Atom feed responses
 * - No auth needed (Open Government Licence v3)
 */

const USER_AGENT = 'UK-Law-MCP/1.0 (https://github.com/Ansvar-Systems/UK-law-mcp; hello@ansvar.ai)';
const MIN_DELAY_MS = 250;

let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export interface FetchResult {
  status: number;
  body: string;
  contentType: string;
}

/**
 * Fetch a URL with rate limiting and proper headers.
 * Retries up to 3 times on 429/5xx errors with exponential backoff.
 */
export async function fetchWithRateLimit(url: string, maxRetries = 3): Promise<FetchResult> {
  await rateLimit();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/xml, application/atom+xml, text/xml, */*',
      },
    });

    if (response.status === 429 || response.status >= 500) {
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt + 1) * 1000;
        console.log(`  HTTP ${response.status} for ${url}, retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
    }

    const body = await response.text();
    return {
      status: response.status,
      body,
      contentType: response.headers.get('content-type') ?? '',
    };
  }

  throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

/**
 * Fetch an Atom feed page from legislation.gov.uk
 */
export async function fetchAtomFeed(page: number): Promise<FetchResult> {
  const url = `https://www.legislation.gov.uk/ukpga/data.feed?page=${page}`;
  return fetchWithRateLimit(url);
}

/**
 * Fetch Akoma Ntoso XML for a specific act
 */
export async function fetchAknXml(year: number, number: number): Promise<FetchResult> {
  const url = `https://www.legislation.gov.uk/ukpga/${year}/${number}/data.akn`;
  return fetchWithRateLimit(url);
}
