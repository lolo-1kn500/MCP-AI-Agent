import { chatOpenRouter, analysisTool, weatherTool } from "../lib/openrouter"
import { executeTool } from "../lib/tools"
import { z } from "zod"

const toolMap = {
  get_weather: async (args: any) => executeTool("weather", args),
  run_analysis: async (args: any) => executeTool("analysis", args)
}

export async function orchestrate(messages: any[]) {
  // loop: let model choose tool calls until stop
  const tools = [weatherTool, analysisTool].map((t) => ({
    type: "function" as const,
    function: {
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters as z.ZodTypeAny
    }
  }))
  let running = true
  let history = messages

  while (running) {
    const res = await chatOpenRouter({ messages: history, tools })
    const choice = res.choices[0]
    const msg = choice.message
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const call of msg.tool_calls) {
        const name = call.function.name
        const args = JSON.parse(call.function.arguments || "{}")
        const toolResult = await toolMap[name](args)
        history = [
          ...history,
          { role: "assistant", content: null, tool_calls: [call] },
          { role: "tool", tool_call_id: call.id, content: JSON.stringify(toolResult) }
        ]
      }
      continue
    }
    running = false
    return msg
  }
}
