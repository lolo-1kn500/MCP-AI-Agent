import { NextResponse } from "next/server"
import { viemWallet } from "../../lib/wallet"
import { paidFetch } from "../../lib/paidFetch"

export const config = {
  matcher: ["/api/:path*"]
}

export async function middleware(req: Request) {
  // Simple x402 paywall: if caller already paid, allow.
  // Expect headers: x402-payment-id, x402-payment-tx
  const paymentId = req.headers.get("x402-payment-id")
  const paymentTx = req.headers.get("x402-payment-tx")
  if (paymentId && paymentTx) {
    // trust upstream verification in route handlers
    return NextResponse.next()
  }

  // Otherwise, create payment link via paidFetch helper (Base mainnet)
  const url = new URL(req.url)
  const price = req.headers.get("x-price-usdc") || process.env.X402_PRICE_USDC || "0.1"
  const payee = process.env.X402_PAYEE || viemWallet.address

  const payment = await paidFetch.createPayment({
    amountUsdc: price,
    payee,
    reason: `access ${url.pathname}`
  })

  return NextResponse.json(
    { error: "payment_required", payment },
    { status: 402 }
  )
}
