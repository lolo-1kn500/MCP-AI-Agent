type NeynarCast = {
  hash?: string;
  text?: string;
  timestamp?: string;
  author?: {
    username?: string;
    display_name?: string;
  };
};

type NeynarTrendingResponse = {
  casts?: NeynarCast[];
  result?: {
    casts?: NeynarCast[];
  };
};

function getApiKey(): string {
  const key = process.env.NEYNAR_API_KEY;
  if (!key) {
    throw new Error('NEYNAR_API_KEY is required for Farcaster tools.');
  }
  return key;
}

function extractTickers(text: string): string[] {
  const matches = text.match(/\$[A-Za-z0-9]{2,10}/g) ?? [];
  return matches.map((m) => m.toUpperCase());
}

function extractAddresses(text: string): string[] {
  const matches = text.match(/0x[a-fA-F0-9]{40}/g) ?? [];
  return matches.map((m) => m.toLowerCase());
}

export async function fetchTrendingTokens(options: {
  limit?: number;
  query?: string;
  minMentions?: number;
}): Promise<{
  source: 'trending' | 'search';
  tokens: Array<{ token: string; mentions: number }>;
  addresses: Array<{ address: string; mentions: number }>;
  sampleCasts: Array<{ hash?: string; text?: string; author?: string; timestamp?: string }>;
}> {
  const apiKey = getApiKey();
  const limit = Math.max(1, Math.min(options.limit ?? 50, 200));
  const minMentions = Math.max(1, options.minMentions ?? 2);

  const source = options.query ? 'search' : 'trending';
  const url = options.query
    ? `https://api.neynar.com/v2/farcaster/cast/search/?q=${encodeURIComponent(
        options.query
      )}`
    : 'https://api.neynar.com/v2/farcaster/feed/trending/';

  const response = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Neynar error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as NeynarTrendingResponse;
  const casts = (data.casts ?? data.result?.casts ?? []).slice(0, limit);

  const tickerCounts = new Map<string, number>();
  const addressCounts = new Map<string, number>();

  for (const cast of casts) {
    const text = cast.text ?? '';
    for (const ticker of extractTickers(text)) {
      tickerCounts.set(ticker, (tickerCounts.get(ticker) ?? 0) + 1);
    }
    for (const address of extractAddresses(text)) {
      addressCounts.set(address, (addressCounts.get(address) ?? 0) + 1);
    }
  }

  const tokens = Array.from(tickerCounts.entries())
    .filter(([, count]) => count >= minMentions)
    .sort((a, b) => b[1] - a[1])
    .map(([token, mentions]) => ({ token, mentions }));

  const addresses = Array.from(addressCounts.entries())
    .filter(([, count]) => count >= minMentions)
    .sort((a, b) => b[1] - a[1])
    .map(([address, mentions]) => ({ address, mentions }));

  const sampleCasts = casts.slice(0, 20).map((cast) => ({
    hash: cast.hash,
    text: cast.text,
    author: cast.author?.username ?? cast.author?.display_name,
    timestamp: cast.timestamp,
  }));

  return { source, tokens, addresses, sampleCasts };
}
