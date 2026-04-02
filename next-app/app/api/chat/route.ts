import { NextResponse } from "next/server"
import { orchestrate } from "../../../agents/orchestrator"
import { paidFetch } from "../../../lib/paidFetch"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const messages = body.messages || []

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

  const result = await orchestrate(messages)
  return NextResponse.json({ message: result })
}
