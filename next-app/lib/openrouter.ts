import OpenAI from "openai"
import { z } from "zod"

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
})

export async function chatOpenRouter({
  messages,
  tools
}: {
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
  tools?: OpenAI.Chat.ChatCompletionTool[]
}) {
  return client.chat.completions.create({
    model: "openrouter/auto",
    messages,
    tools,
    tool_choice: tools ? "auto" : undefined
  })
}

export async function createEmbedding(text: string) {
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  })
  return res.data[0].embedding
}

export const weatherTool = {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get current weather for a city",
    parameters: z
      .object({
        city: z.string()
      })
      .passthrough()
  }
}

export const analysisTool = {
  type: "function",
  function: {
    name: "run_analysis",
    description: "Run a brief analysis over supplied text",
    parameters: z
      .object({
        text: z.string()
      })
      .passthrough()
  }
}
