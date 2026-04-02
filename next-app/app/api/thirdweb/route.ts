import { NextResponse } from "next/server"
import { thirdweb } from "../../../lib/thirdweb"

const allowlist = new Set([
  "getMyWallet",
  "listUserWallets",
  "createUserWallet",
  "getWalletBalance",
  "readContract",
  "writeContract",
  "getContractEvents",
  "createPayment",
  "paymentsPurchase",
  "bridgeSwap",
  "createToken",
  "listTokens"
])

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { tool, params } = body
  if (!allowlist.has(tool)) {
    return NextResponse.json({ error: "tool_not_allowed" }, { status: 400 })
  }
  try {
    // @ts-ignore
    const fn = thirdweb[tool]
    const result = await fn(params || {})
    return NextResponse.json({ result })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
