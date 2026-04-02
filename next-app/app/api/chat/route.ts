import { NextResponse } from "next/server"
import { orchestrate } from "../../../agents/orchestrator"
import { paidFetch } from "../../../lib/paidFetch"
import { searchMemory, upsertMemory } from "../../../lib/memory"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const messages = body.messages || []
  const userId = body.userId || "anonymous"

  // Payment verification (retry if 402)
  const paymentId = req.headers.get("x402-payment-id")
  const paymentTx = req.headers.get("x402-payment-tx")
  const payee = process.env.X402_PAYEE || process.env.AGENT_WALLET_ADDRESS
  const price = process.env.X402_PRICE_USDC || "0.1"

  if (!paymentId || !paymentTx) {
    return NextResponse.json(
      { error: "payment_required", payment: await paidFetch.createPayment({ amountUsdc: price, payee: payee! }) },
      { status: 402 }
    )
  }

  const verified = await paidFetch.verifyPayment({
    txHash: paymentTx,
    payee: payee!,
    minAmountUsdc: price
  })
  if (!verified) {
    return NextResponse.json({ error: "payment_not_verified" }, { status: 402 })
  }

  // Semantic recall
  const recalled = await searchMemory(userId, messages.map((m: any) => m.content || "").join("\n"), 3)
  const recallMessages =
    recalled?.map((r: any) => ({
      role: "system" as const,
      content: `Relevant memory: ${r.content}`
    })) || []

  const result = await orchestrate([...recallMessages, ...messages])

  // Store short transcript chunk
  const lastUser = [...messages].reverse().find((m: any) => m.role === "user")
  if (lastUser?.content) {
    await upsertMemory(userId, String(lastUser.content).slice(0, 500))
  }

  return NextResponse.json({ message: result })
}
