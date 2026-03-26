import { OpenRouter, stepCountIs } from '@openrouter/sdk';
import type { Tool, StreamableOutputItem } from '@openrouter/sdk';
import { EventEmitter } from 'eventemitter3';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentEvents {
  'message:user': (message: Message) => void;
  'message:assistant': (message: Message) => void;
  'item:update': (item: StreamableOutputItem) => void;
  'stream:start': () => void;
  'stream:delta': (delta: string, accumulated: string) => void;
  'stream:end': (fullText: string) => void;
  'tool:call': (name: string, args: unknown) => void;
  'tool:result': (callId: string, result: unknown) => void;
  'reasoning:update': (text: string) => void;
  'error': (error: Error) => void;
  'thinking:start': () => void;
  'thinking:end': () => void;
}

export interface AgentConfig {
  apiKey: string;
  model?: string;
  instructions?: string;
  tools?: Tool[];
  maxSteps?: number;
  provider?: 'openrouter' | 'elizacloud';
  baseUrl?: string;
}

export class Agent extends EventEmitter<AgentEvents> {
  private client: OpenRouter;
  private messages: Message[] = [];
  private config: Required<AgentConfig>;

  constructor(config: AgentConfig) {
    super();
    const provider = config.provider ?? 'openrouter';
    const defaultModel = provider === 'elizacloud' ? 'gpt-4o' : 'openrouter/auto';
    this.client = new OpenRouter({ apiKey: config.apiKey });
    this.config = {
      apiKey: config.apiKey,
      model: config.model ?? defaultModel,
      instructions: config.instructions ?? 'You are a helpful assistant.',
      tools: config.tools ?? [],
      maxSteps: config.maxSteps ?? 5,
      provider,
      baseUrl: config.baseUrl ?? 'https://elizacloud.ai/api/v1',
    };
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  clearHistory(): void {
    this.messages = [];
  }

  setInstructions(instructions: string): void {
    this.config.instructions = instructions;
  }

  addTool(newTool: Tool): void {
    this.config.tools.push(newTool);
  }

  async send(content: string): Promise<string> {
    const userMessage: Message = { role: 'user', content };
    this.messages.push(userMessage);
    this.emit('message:user', userMessage);
    this.emit('thinking:start');

    try {
      if (this.config.provider === 'elizacloud') {
        this.emit('stream:start');
        const fullText = await this.sendViaElizaCloudStream((delta, accumulated) => {
          if (delta) {
            this.emit('stream:delta', delta, accumulated);
          }
        });
        this.emit('stream:end', fullText);
        const assistantMessage: Message = { role: 'assistant', content: fullText };
        this.messages.push(assistantMessage);
        this.emit('message:assistant', assistantMessage);
        return fullText;
      }

      const result = this.client.callModel({
        model: this.config.model,
        instructions: this.config.instructions,
        input: this.messages.map((m) => ({ role: m.role, content: m.content })),
        tools: this.config.tools.length > 0 ? this.config.tools : undefined,
        stopWhen: [stepCountIs(this.config.maxSteps)],
      });

      this.emit('stream:start');
      let fullText = '';

      for await (const item of result.getItemsStream()) {
        this.emit('item:update', item);

        switch (item.type) {
          case 'message': {
            const textContent = item.content?.find(
              (c: { type: string }) => c.type === 'output_text'
            );
            if (textContent && 'text' in textContent) {
              const newText = textContent.text as string;
              if (newText !== fullText) {
                const delta = newText.slice(fullText.length);
                fullText = newText;
                this.emit('stream:delta', delta, fullText);
              }
            }
            break;
          }
          case 'function_call':
            if (item.status === 'completed') {
              this.emit('tool:call', item.name, JSON.parse(item.arguments || '{}'));
            }
            break;
          case 'function_call_output':
            this.emit('tool:result', item.callId, item.output);
            break;
          case 'reasoning': {
            const reasoningText = item.content?.find(
              (c: { type: string }) => c.type === 'reasoning_text'
            );
            if (reasoningText && 'text' in reasoningText) {
              this.emit('reasoning:update', reasoningText.text as string);
            }
            break;
          }
          default:
            break;
        }
      }

      if (!fullText) {
        fullText = await result.getText();
      }

      this.emit('stream:end', fullText);
      const assistantMessage: Message = { role: 'assistant', content: fullText };
      this.messages.push(assistantMessage);
      this.emit('message:assistant', assistantMessage);
      return fullText;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      throw error;
    } finally {
      this.emit('thinking:end');
    }
  }

  async sendSync(content: string): Promise<string> {
    const userMessage: Message = { role: 'user', content };
    this.messages.push(userMessage);
    this.emit('message:user', userMessage);

    try {
      if (this.config.provider === 'elizacloud') {
        const fullText = await this.sendViaElizaCloud();
        const assistantMessage: Message = { role: 'assistant', content: fullText };
        this.messages.push(assistantMessage);
        this.emit('message:assistant', assistantMessage);
        return fullText;
      }

      const result = this.client.callModel({
        model: this.config.model,
        instructions: this.config.instructions,
        input: this.messages.map((m) => ({ role: m.role, content: m.content })),
        tools: this.config.tools.length > 0 ? this.config.tools : undefined,
        stopWhen: [stepCountIs(this.config.maxSteps)],
      });

      const fullText = await result.getText();
      const assistantMessage: Message = { role: 'assistant', content: fullText };
      this.messages.push(assistantMessage);
      this.emit('message:assistant', assistantMessage);
      return fullText;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      throw error;
    }
  }

  private async sendViaElizaCloud(): Promise<string> {
    const body = {
      model: this.config.model,
      messages: [
        { role: 'system', content: this.config.instructions },
        ...this.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    };

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ElizaCloud error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('ElizaCloud response missing message content');
    }
    return content;
  }

  private async sendViaElizaCloudStream(
    onDelta: (delta: string, accumulated: string) => void
  ): Promise<string> {
    const body = {
      model: this.config.model,
      messages: [
        { role: 'system', content: this.config.instructions },
        ...this.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      stream: true,
    };

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ElizaCloud error ${response.status}: ${text}`);
    }

    if (!response.body) {
      throw new Error('ElizaCloud response missing body stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;

        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }

        const delta =
          typeof parsed === 'object' && parsed !== null
            ? (parsed as { choices?: Array<{ delta?: { content?: string } }> })
                .choices?.[0]?.delta?.content
            : undefined;

        if (delta) {
          fullText += delta;
          onDelta(delta, fullText);
        }
      }
    }

    return fullText;
  }
}

export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
