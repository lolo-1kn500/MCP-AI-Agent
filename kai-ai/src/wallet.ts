import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';

const execFileAsync = promisify(execFile);

export type WalletSetupResult = {
  success: boolean;
  address: string;
  created_at?: string;
};

export type WalletBalanceResult = Record<string, unknown>;
export type WalletTransferResult = Record<string, unknown>;

function getSkillDir(): string {
  return (
    process.env.EVM_WALLET_SKILL_DIR ??
    path.resolve(process.cwd(), 'skills', 'evm-wallet')
  );
}

function getWalletPath(): string {
  return (
    process.env.EVM_WALLET_PATH ??
    path.resolve(process.cwd(), '.secrets', 'evm-wallet.json')
  );
}

async function assertSkillInstalled(): Promise<string> {
  const skillDir = getSkillDir();
  try {
    await fs.access(path.join(skillDir, 'src'));
  } catch {
    throw new Error(
      `EVM wallet skill not found at ${skillDir}. Set EVM_WALLET_SKILL_DIR or install the skill.`
    );
  }
  return skillDir;
}

async function assertWalletExists(): Promise<void> {
  const walletPath = getWalletPath();
  try {
    await fs.access(walletPath);
  } catch {
    throw new Error('No wallet found. Run wallet_setup first.');
  }
}

async function runWalletCommand(script: string, args: string[]): Promise<unknown> {
  const skillDir = await assertSkillInstalled();
  const walletPath = getWalletPath();
  const { stdout } = await execFileAsync(
    'node',
    [path.join('src', script), ...args],
    {
      cwd: skillDir,
      env: {
        ...process.env,
        EVM_WALLET_PATH: walletPath,
      },
    }
  );
  try {
    return JSON.parse(stdout);
  } catch {
    return { raw: stdout.trim() };
  }
}

export async function setupWallet(): Promise<WalletSetupResult> {
  const result = await runWalletCommand('setup.js', ['--json']);
  if (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    'address' in result
  ) {
    return result as WalletSetupResult;
  }
  throw new Error('Unexpected wallet setup response.');
}

export async function getBalance(options: {
  chain?: string;
  all?: boolean;
  tokenAddress?: string;
}): Promise<WalletBalanceResult> {
  await assertWalletExists();
  const args: string[] = [];
  if (options.all) {
    args.push('--all');
  } else if (options.chain) {
    args.push(options.chain);
  } else {
    throw new Error('Provide chain or set all=true.');
  }
  if (options.tokenAddress) {
    args.push(options.tokenAddress);
  }
  args.push('--json');
  return (await runWalletCommand('balance.js', args)) as WalletBalanceResult;
}

export async function transfer(options: {
  chain: string;
  to: string;
  amount: string;
  tokenAddress?: string;
  confirm: boolean;
}): Promise<WalletTransferResult> {
  await assertWalletExists();
  if (!options.confirm) {
    throw new Error('Transfer requires confirm=true.');
  }
  const args = [
    options.chain,
    options.to,
    options.amount,
    ...(options.tokenAddress ? [options.tokenAddress] : []),
    '--yes',
    '--json',
  ];
  return (await runWalletCommand('transfer.js', args)) as WalletTransferResult;
}
