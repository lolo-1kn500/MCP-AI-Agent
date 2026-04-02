import { NextResponse } from "next/server"
import { executeTool } from "../../../lib/tools"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const text = body.text || ""
  const data = await executeTool("analysis", { text })
  return NextResponse.json({ data })
}
