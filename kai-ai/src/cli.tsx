import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import type { StreamableOutputItem } from '@openrouter/sdk';
import { createAgent, type Message } from './agent.js';
import { defaultTools } from './tools.js';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error('OPENROUTER_API_KEY is required');
}

const agent = createAgent({
  apiKey,
  model: 'openrouter/auto',
  instructions: 'You are Kai, a helpful assistant. Be concise.',
  tools: defaultTools,
});

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={isUser ? 'green' : 'cyan'}>{isUser ? '▶ You' : '◀ Assistant'}</Text>
      <Text>{message.content}</Text>
    </Box>
  );
}

function ItemRenderer({ item }: { item: StreamableOutputItem }) {
  switch (item.type) {
    case 'message': {
      const textContent = item.content?.find(
        (c: { type: string }) => c.type === 'output_text'
      );
      const text = textContent && 'text' in textContent ? (textContent.text as string) : '';
      return (
        <Box flexDirection="row" marginBottom={1}>
          <Text color="cyan">◀ Assistant </Text>
          <Text>{text}</Text>
          {item.status !== 'completed' && <Text color="cyan">▌</Text>}
        </Box>
      );
    }
    case 'function_call':
      return (
        <Box flexDirection="row" marginBottom={1}>
          <Text color="yellow">
            {item.status === 'completed' ? '✓' : '•'} {item.name}{' '}
            {item.status === 'in_progress' && '...'}
          </Text>
        </Box>
      );
    case 'reasoning': {
      const reasoningText = item.content?.find(
        (c: { type: string }) => c.type === 'reasoning_text'
      );
      const text =
        reasoningText && 'text' in reasoningText ? (reasoningText.text as string) : '';
      return (
        <Box flexDirection="row" marginBottom={1}>
          <Text color="magenta">Thinking </Text>
          <Text color="magenta">{text}</Text>
        </Box>
      );
    }
    default:
      return null;
  }
}

function InputField({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  useInput((input, key) => {
    if (disabled) return;
    if (key.return) onSubmit();
    else if (key.backspace || key.delete) onChange(value.slice(0, -1));
    else if (input && !key.ctrl && !key.meta) onChange(value + input);
  });

  return (
    <Box>
      <Text>{'> '}</Text>
      <Text>{value}</Text>
      <Text color={disabled ? 'gray' : 'green'}>{disabled ? ' ···' : '█'}</Text>
    </Box>
  );
}

function App() {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<Map<string, StreamableOutputItem>>(new Map());

  useInput((_, key) => {
    if (key.escape) exit();
  });

  useEffect(() => {
    const onThinkingStart = () => {
      setIsLoading(true);
      setItems(new Map());
    };

    const onItemUpdate = (item: StreamableOutputItem) => {
      setItems((prev) => new Map(prev).set(item.id, item));
    };

    const onMessageAssistant = () => {
      setMessages(agent.getMessages());
      setItems(new Map());
      setIsLoading(false);
    };

    const onError = () => {
      setIsLoading(false);
    };

    agent.on('thinking:start', onThinkingStart);
    agent.on('item:update', onItemUpdate);
    agent.on('message:assistant', onMessageAssistant);
    agent.on('error', onError);

    return () => {
      agent.off('thinking:start', onThinkingStart);
      agent.off('item:update', onItemUpdate);
      agent.off('message:assistant', onMessageAssistant);
      agent.off('error', onError);
    };
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    await agent.send(text);
  }, [input, isLoading]);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan">Kai</Text>
        <Text> (Esc to exit)</Text>
      </Box>

      {messages.map((msg, i) => (
        <ChatMessage key={`${msg.role}-${i}`} message={msg} />
      ))}

      {Array.from(items.values()).map((item) => (
        <ItemRenderer key={item.id} item={item} />
      ))}

      <InputField
        value={input}
        onChange={setInput}
        onSubmit={sendMessage}
        disabled={isLoading}
      />
    </Box>
  );
}

render(<App />);
