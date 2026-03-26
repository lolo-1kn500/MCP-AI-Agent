import { tool } from '@openrouter/sdk';
import { z } from 'zod';
import { getBalance, setupWallet, transfer, swap, contractCall } from './wallet.js';
import { x402Fetch } from './x402.js';
import { mcporterCall } from './mcporter.js';
import { fetchTrendingTokens } from './farcaster.js';

export const timeTool = tool({
  name: 'get_current_time',
  description: 'Get the current date and time',
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe('Timezone (e.g., "UTC", "America/New_York")'),
  }),
  execute: async ({ timezone }) => {
    return {
      time: new Date().toLocaleString('en-US', {
        timeZone: timezone || 'UTC',
      }),
      timezone: timezone || 'UTC',
    };
  },
});

export const calculatorTool = tool({
  name: 'calculate',
  description: 'Perform mathematical calculations',
  inputSchema: z.object({
    expression: z
      .string()
      .describe('Math expression (e.g., "2 + 2", "sqrt(16)")'),
  }),
  execute: async ({ expression }) => {
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    const result = Function(`"use strict"; return (${sanitized})`)();
    return { expression, result };
  },
});

export const walletSetupTool = tool({
  name: 'wallet_setup',
  description: 'Create an EVM wallet for the agent (only needed once).',
  inputSchema: z.object({}),
  execute: async () => setupWallet(),
});

export const walletBalanceTool = tool({
  name: 'wallet_balance',
  description: 'Check wallet balance on a chain or across all chains.',
  inputSchema: z.object({
    chain: z.string().optional().describe('Chain name (e.g., base, ethereum).'),
    all: z.boolean().optional().describe('Set true to check all chains.'),
    tokenAddress: z
      .string()
      .optional()
      .describe('ERC20 token address (optional).'),
  }),
  execute: async ({ chain, all, tokenAddress }) =>
    getBalance({ chain, all, tokenAddress }),
});

export const walletTransferTool = tool({
  name: 'wallet_transfer',
  description:
    'Transfer native tokens or ERC20 tokens. Requires explicit confirm=true.',
  inputSchema: z.object({
    chain: z.string().describe('Chain name (e.g., base, ethereum).'),
    to: z.string().describe('Recipient address.'),
    amount: z.string().describe('Amount to send.'),
    tokenAddress: z.string().optional().describe('ERC20 token address (optional).'),
    confirm: z.boolean().describe('Must be true to execute transfer.'),
  }),
  execute: async ({ chain, to, amount, tokenAddress, confirm }) =>
    transfer({ chain, to, amount, tokenAddress, confirm }),
});

export const walletSwapTool = tool({
  name: 'wallet_swap',
  description:
    'Swap tokens using the agent wallet. Use quoteOnly first, then confirm=true to execute.',
  inputSchema: z.object({
    chain: z.string().describe('Chain name (e.g., base, ethereum).'),
    fromToken: z.string().describe('Token symbol (eth) or token address.'),
    toToken: z.string().describe('Token symbol (eth) or token address.'),
    amount: z.string().describe('Amount to swap.'),
    quoteOnly: z.boolean().optional().describe('Get quote only (no execution).'),
    slippage: z.string().optional().describe('Override slippage percent.'),
    confirm: z.boolean().optional().describe('Set true to execute swap.'),
  }),
  execute: async ({ chain, fromToken, toToken, amount, quoteOnly, slippage, confirm }) =>
    swap({ chain, fromToken, toToken, amount, quoteOnly, slippage, confirm }),
});

export const walletContractTool = tool({
  name: 'wallet_contract',
  description:
    'Call a smart contract function. For writes, set write=true and confirm=true.',
  inputSchema: z.object({
    chain: z.string().describe('Chain name (e.g., base, ethereum).'),
    contract: z.string().describe('Contract address.'),
    signature: z.string().describe('Function signature (e.g., "balanceOf(address)").'),
    args: z.array(z.string()).optional().describe('Arguments for the function.'),
    write: z.boolean().optional().describe('Set true for write operations.'),
    confirm: z.boolean().optional().describe('Required for write operations.'),
  }),
  execute: async ({ chain, contract, signature, args, write, confirm }) =>
    contractCall({ chain, contract, signature, args, write, confirm }),
});

export const x402Tool = tool({
  name: 'x402_fetch',
  description:
    'Call an HTTP endpoint. Uses x402 payments for write operations; reads are free.',
  inputSchema: z.object({
    url: z.string().describe('Full endpoint URL.'),
    method: z.string().optional().describe('HTTP method (default GET).'),
    body: z.unknown().optional().describe('Request body for write operations.'),
    headers: z.record(z.string()).optional().describe('Extra headers.'),
    paymentNetwork: z
      .enum(['base', 'solana'])
      .optional()
      .describe('Payment network for x402.'),
    write: z
      .boolean()
      .optional()
      .describe('Force treated as write (paid) or read (free).'),
  }),
  execute: async ({ url, method, body, headers, paymentNetwork, write }) =>
    x402Fetch({ url, method, body, headers, paymentNetwork, write }),
});

export const mcporterTool = tool({
  name: 'mcporter_call',
  description:
    'Call an MCP server/tool via the mcporter CLI. Requires mcporter to be installed.',
  inputSchema: z.object({
    target: z.string().describe('Server tool selector or full MCP URL.'),
    args: z.record(z.unknown()).optional().describe('Arguments object.'),
    outputJson: z.boolean().optional().describe('Return JSON output if supported.'),
    stdioCommand: z.string().optional().describe('Optional stdio command for ad-hoc servers.'),
  }),
  execute: async ({ target, args, outputJson, stdioCommand }) =>
    mcporterCall({ target, args, outputJson, stdioCommand }),
});

export const farcasterTrendingTool = tool({
  name: 'farcaster_trending_tokens',
  description:
    'Collect trending token tickers and addresses from Farcaster trending feed or search.',
  inputSchema: z.object({
    limit: z.number().int().min(1).max(200).optional().describe('Max casts to analyze.'),
    query: z.string().optional().describe('Optional search query for casts.'),
    minMentions: z.number().int().min(1).optional().describe('Min mentions threshold.'),
  }),
  execute: async ({ limit, query, minMentions }) =>
    fetchTrendingTokens({ limit, query, minMentions }),
});

export const defaultWalletTools = [
  walletSetupTool,
  walletBalanceTool,
  walletTransferTool,
  walletSwapTool,
  walletContractTool,
];
export const defaultX402Tools = [x402Tool];

export const defaultTools = [
  timeTool,
  calculatorTool,
  walletSetupTool,
  walletBalanceTool,
  walletTransferTool,
  walletSwapTool,
  walletContractTool,
  x402Tool,
  mcporterTool,
  farcasterTrendingTool,
];
