import { createAgent } from './agent.js';
import { defaultTools } from './tools.js';

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required');
  }

  const agent = createAgent({
    apiKey,
    model: 'openrouter/auto',
    instructions: 'You are a helpful assistant with access to tools.',
    tools: defaultTools,
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
