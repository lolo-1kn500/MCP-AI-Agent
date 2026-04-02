import { NextResponse } from "next/server"
import { executeTool } from "../../../lib/tools"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const city = body.city || "Unknown"
  const data = await executeTool("weather", { city })
  return NextResponse.json({ data })
}
