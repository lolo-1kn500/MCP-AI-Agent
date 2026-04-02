import { z } from "zod"

export type ToolFn = (args: any) => Promise<any>

export const toolSchemas = {
  weather: z.object({ city: z.string() }),
  analysis: z.object({ text: z.string() })
}

export const tools: Record<string, ToolFn> = {
  weather: async ({ city }) => {
    // simple stub; replace with real API call
    return { city, tempC: 22, condition: "Sunny" }
  },
  analysis: async ({ text }) => {
    return { summary: text.slice(0, 120), sentiment: "neutral" }
  }
}

export async function executeTool(name: string, args: any) {
  const schema = toolSchemas[name as keyof typeof toolSchemas]
  if (!schema) throw new Error(`unknown tool ${name}`)
  const parsed = schema.parse(args)
  return tools[name](parsed)
}
