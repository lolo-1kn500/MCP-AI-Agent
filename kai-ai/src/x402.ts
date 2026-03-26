import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type X402FetchResult = {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
  raw?: string;
};

function normalizeMethod(method?: string): string {
  return (method || 'GET').toUpperCase();
}

function isWriteMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

export async function x402Fetch(options: {
  url: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  paymentNetwork?: 'base' | 'solana';
  write?: boolean;
}): Promise<X402FetchResult> {
  const method = normalizeMethod(options.method);
  const write = options.write ?? isWriteMethod(method);

  if (!write) {
    const response = await fetch(options.url, {
      method,
      headers: options.headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  }

  const args = ['agentcash@latest', 'fetch', options.url, '-m', method];
  if (options.body !== undefined) {
    args.push('-b', JSON.stringify(options.body));
  }
  if (options.paymentNetwork) {
    args.push('--payment-network', options.paymentNetwork);
  }

  const { stdout } = await execFileAsync('npx', args);
  try {
    return { body: JSON.parse(stdout) };
  } catch {
    return { raw: stdout.trim() };
  }
}
