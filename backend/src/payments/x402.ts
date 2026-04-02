import { randomUUID } from "crypto"
import { JsonRpcProvider, Log, formatUnits } from "ethers"
import { config } from "../config"
import { db } from "../storage/db"
import { thirdwebBridgeRequest } from "../tools/thirdweb"

const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

let payerAllowlist = new Set(
  (config.x402PayerAllowlist || []).map((a) => a.toLowerCase())
)

export type X402Payment = {
  id: string
  link: string
  amount: string
  chainId: number
  tokenAddress: string
}

export type PaymentVerificationResult = {
  payer: string
  payee: string
  amount: string
  blockNumber: number
}

export type ApiCallContext = {
  id?: string
  callerAgentId?: string
  providerAgentId?: string
  toolId?: string
  serviceId?: string
  priceUsdc: string
  nonce?: string
}

export async function createX402Payment(): Promise<X402Payment> {
  const amountWei = toUsdcBaseUnits(config.x402Amount)
  const payload = {
    name: "Kai Agent write access",
    description: `Payment required for write operations (${config.x402Amount} USDC).`,
    token: {
      address: config.x402TokenAddress,
      chainId: config.x402ChainId,
      amount: amountWei
    },
    recipient: config.x402Recipient,
    purchaseData: {
      reason: "thirdweb_write_access",
      projectId: config.thirdwebProjectId || undefined
    }
  }

  const result = await thirdwebBridgeRequest({
    path: "/v1/bridge/payments",
    method: "POST",
    body: payload
  })

  const payment = {
    id: result?.result?.id || result?.id,
    link: result?.result?.link || result?.link,
    amount: config.x402Amount,
    chainId: config.x402ChainId,
    tokenAddress: config.x402TokenAddress
  }

  if (payment.id && payment.link) {
    await db.query(
      "insert into x402_payments (id, link, amount, chain_id, token_address) values ($1, $2, $3, $4, $5) on conflict (id) do nothing",
      [
        payment.id,
        payment.link,
        payment.amount,
        payment.chainId,
        payment.tokenAddress
      ]
    )
  }

  return payment
}

export async function verifyAndFinalizeX402Payment(
  paymentId: string,
  txHash: string,
  expectedPriceUsdc: string,
  expectedPayee: string
): Promise<boolean> {
  if (!paymentId || !txHash) return false

  const apiCall = await db.query(
    "select id, status, price_usdc from api_calls where id = $1",
    [paymentId]
  )
  if (apiCall.rows.length === 0) {
    return false
  }
  if (apiCall.rows[0].status === "paid") {
    return true
  }

  const verified = await verifyOnChainPayment(
    txHash,
    expectedPayee,
    expectedPriceUsdc || apiCall.rows[0].price_usdc?.toString() || "0"
  )

  if (!verified) return false

  await markPaymentSettled(paymentId, txHash, verified)
  return true
}

export async function createPendingApiCall(context: ApiCallContext) {
  const id = context.id || randomUUID()
  const nonce = context.nonce || randomUUID()
  await db.query(
    `insert into api_calls (id, caller_agent_id, provider_agent_id, tool_id, service_id, status, price_usdc, nonce)
     values ($1, $2, $3, $4, $5, 'pending_payment', $6, $7)
     on conflict (id) do nothing`,
    [
      id,
      context.callerAgentId || null,
      context.providerAgentId || null,
      context.toolId || null,
      context.serviceId || null,
      context.priceUsdc,
      nonce
    ]
  )
  return { apiCallId: id, priceUsdc: context.priceUsdc }
}

export function getPayerAllowlist() {
  return Array.from(payerAllowlist)
}

export function setPayerAllowlist(addresses: string[]) {
  payerAllowlist = new Set(addresses.map((a) => a.toLowerCase()).filter(Boolean))
}

async function markPaymentSettled(
  apiCallId: string,
  txHash: string,
  receipt: PaymentVerificationResult
) {
  await db.query(
    `insert into payment_receipts (id, api_call_id, payer_wallet, payee_wallet, tx_hash, amount_usdc, block_number)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (tx_hash) do nothing`,
    [
      randomUUID(),
      apiCallId,
      receipt.payer,
      receipt.payee,
      txHash,
      receipt.amount,
      receipt.blockNumber
    ]
  )

  await db.query(
    `update api_calls set status = 'paid', updated_at = now() where id = $1`,
    [apiCallId]
  )

  await db.query(
    `insert into wallet_ledger (agent_id, wallet, direction, amount_usdc, reason, api_call_id, tx_hash)
     values (null, $1, 'credit', $2, 'x402_payment', $3, $4)
     on conflict do nothing`,
    [receipt.payee, receipt.amount, apiCallId, txHash]
  )
}

async function verifyOnChainPayment(
  txHash: string,
  expectedPayee: string,
  expectedAmountUsdc: string
): Promise<PaymentVerificationResult | null> {
  if (!config.x402RpcUrl) {
    throw new Error("X402_RPC_URL or BASE_RPC must be set for payment verification")
  }

  const provider = new JsonRpcProvider(config.x402RpcUrl)
  const receipt = await provider.getTransactionReceipt(txHash)
  if (!receipt) return null

  const tokenAddress = config.x402TokenAddress.toLowerCase()
  const payee = expectedPayee.toLowerCase()
  const expected = BigInt(toUsdcBaseUnits(expectedAmountUsdc))

  const transfer = findMatchingTransfer(receipt.logs as Log[], tokenAddress, payee)
  if (!transfer) return null

  const amount = BigInt(transfer.amount)
  if (amount < expected) return null

  const allowlist = payerAllowlist
  if (allowlist.size > 0 && !allowlist.has(transfer.from)) {
    return null
  }

  return {
    payer: transfer.from,
    payee: transfer.to,
    amount: formatUnits(amount, config.x402UsdcDecimals),
    blockNumber: Number(receipt.blockNumber)
  }
}

function findMatchingTransfer(logs: Log[], tokenAddress: string, payee: string) {
  for (const log of logs) {
    if (log.address.toLowerCase() !== tokenAddress) continue
    if (!log.topics || log.topics[0]?.toLowerCase() !== ERC20_TRANSFER_TOPIC) continue
    if (log.topics.length < 3) continue
    const from = `0x${log.topics[1].slice(26)}`.toLowerCase()
    const to = `0x${log.topics[2].slice(26)}`.toLowerCase()
    if (to !== payee) continue
    const amount = log.data ? BigInt(log.data) : 0n
    return { from, to, amount }
  }
  return null
}

function toUsdcBaseUnits(amount: string) {
  const decimals = config.x402UsdcDecimals || 6
  const [whole, fraction = ""] = amount.split(".")
  const zeros = "0".repeat(Math.max(decimals, 0))
  const padded = `${fraction}${zeros}`.slice(0, decimals)
  const numeric = `${whole}${padded}`.replace(/^0+/, "") || "0"
  return numeric
}
