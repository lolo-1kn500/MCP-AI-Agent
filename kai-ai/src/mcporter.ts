import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type McporterResult = {
  raw?: string;
  data?: unknown;
};

export async function mcporterCall(options: {
  target: string;
  args?: Record<string, unknown>;
  outputJson?: boolean;
  stdioCommand?: string;
}): Promise<McporterResult> {
  const args: string[] = ['call'];
  if (options.stdioCommand) {
    args.push('--stdio', options.stdioCommand);
  }
  args.push(options.target);
  if (options.args) {
    args.push('--args', JSON.stringify(options.args));
  }
  if (options.outputJson) {
    args.push('--output', 'json');
  }

  const { stdout } = await execFileAsync('mcporter', args);
  if (options.outputJson) {
    try {
      return { data: JSON.parse(stdout) };
    } catch {
      return { raw: stdout.trim() };
    }
  }
  return { raw: stdout.trim() };
}
