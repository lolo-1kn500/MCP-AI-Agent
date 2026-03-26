import { createAgent } from './agent.js';
import { defaultTools } from './tools.js';

async function main() {
  const provider = (process.env.CHAT_PROVIDER as 'openrouter' | 'elizacloud') ??
    (process.env.ELIZA_API_KEY ? 'elizacloud' : 'openrouter');
  const apiKey =
    provider === 'elizacloud'
      ? process.env.ELIZA_API_KEY
      : process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      provider === 'elizacloud'
        ? 'ELIZA_API_KEY is required'
        : 'OPENROUTER_API_KEY is required'
    );
  }

  const agent = createAgent({
    apiKey,
    model: provider === 'elizacloud' ? 'gpt-4o' : 'openrouter/auto',
    instructions: 'You are Kai, a helpful assistant with access to tools.',
    tools: defaultTools,
    provider,
    baseUrl: process.env.ELIZA_API_URL,
  });

  agent.on('thinking:start', () => console.log('\nThinking...'));
  agent.on('tool:call', (name, args) => console.log(`Using ${name}:`, args));
  agent.on('stream:delta', (delta) => process.stdout.write(delta));
  agent.on('stream:end', () => console.log('\n'));
  agent.on('error', (err) => console.error('Error:', err.message));

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('Agent ready.');
  console.log('Type your message (Ctrl+C to exit):\n');

  const prompt = () => {
    rl.question('You: ', async (input) => {
      if (!input.trim()) {
        prompt();
        return;
      }
      await agent.send(input);
      prompt();
    });
  };

  prompt();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
