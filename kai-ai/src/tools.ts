import { tool } from '@openrouter/sdk';
import { z } from 'zod';
import { getBalance, setupWallet, transfer } from './wallet.js';
import { x402Fetch } from './x402.js';

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

export const defaultTools = [
  timeTool,
  calculatorTool,
  walletSetupTool,
  walletBalanceTool,
  walletTransferTool,
  x402Tool,
];

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

export const defaultWalletTools = [walletSetupTool, walletBalanceTool, walletTransferTool];
export const defaultX402Tools = [x402Tool];
