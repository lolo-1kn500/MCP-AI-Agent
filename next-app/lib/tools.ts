import { z } from "zod"

export type ToolFn = (args: any) => Promise<any>

export const toolSchemas = {
  weather: z.object({ city: z.string() }),
  analysis: z.object({ text: z.string() })
}

async function fetchWeather(city: string) {
  // Geocode city -> lat/long
  const geo = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  ).then((r) => r.json())
  const loc = geo.results?.[0]
  if (!loc) return { city, error: "location_not_found" }
  const weather = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weathercode`
  ).then((r) => r.json())
  const current = weather.current || {}
  return {
    city: loc.name,
    country: loc.country,
    tempC: current.temperature_2m,
    weathercode: current.weathercode
  }
}

export const tools: Record<string, ToolFn> = {
  weather: async ({ city }) => fetchWeather(city),
  analysis: async ({ text }) => {
    // call LLM summarizer for richer output
    const { summarizeText } = await import("./openrouter")
    const summary = await summarizeText(text)
    return { summary }
  }
}

export async function executeTool(name: string, args: any) {
  const schema = toolSchemas[name as keyof typeof toolSchemas]
  if (!schema) throw new Error(`unknown tool ${name}`)
  const parsed = schema.parse(args)
  return tools[name](parsed)
}
