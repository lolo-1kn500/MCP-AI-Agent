import { http, createPublicClient, createWalletClient, parseUnits } from "viem"
import { base } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"

const rpcUrl = process.env.BASE_RPC || "https://mainnet.base.org"
const tokenAddress = process.env.X402_USDC_TOKEN || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // USDC
const decimals = Number(process.env.X402_USDC_DECIMALS || 6)
const payerKey = process.env.X402_PAYER_PRIVATE_KEY || ""
const account = payerKey ? privateKeyToAccount(payerKey as `0x${string}`) : undefined

const publicClient = createPublicClient({
  chain: base,
  transport: http(rpcUrl)
})

const walletClient = account
  ? createWalletClient({
      chain: base,
      account,
      transport: http(rpcUrl)
    })
  : undefined

async function sendPayment(opts: { to: string; amountUsdc: string }) {
  if (!walletClient || !account) throw new Error("No payer wallet configured")
  const value = parseUnits(opts.amountUsdc, decimals)
  // ERC20 transfer: minimal ABI
  const data = "0xa9059cbb" + opts.to.replace("0x", "").padStart(64, "0") + value.toString(16).padStart(64, "0")
  const hash = await walletClient.sendTransaction({
    to: tokenAddress as `0x${string}`,
    data: data as `0x${string}`,
    account
  })
  return hash
}

export const paidFetch = {
  async createPayment({ amountUsdc, payee, reason }: { amountUsdc: string; payee: string; reason?: string }) {
    // In a real x402 flow this would hit a payment service; here we return instructions.
    return {
      chain: "base",
      token: tokenAddress,
      amount: amountUsdc,
      payee,
      reason: reason || "access",
      payer: account?.address,
      autoPaySupported: Boolean(walletClient && account)
    }
  },

  async verifyPayment({ txHash, payee, minAmountUsdc }: { txHash: string; payee: string; minAmountUsdc: string }) {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` })
    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    const payeeLower = payee.toLowerCase()
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== tokenAddress.toLowerCase()) continue
      if (log.topics[0]?.toLowerCase() !== transferTopic) continue
      if (log.topics.length < 3) continue
      const to = `0x${log.topics[2].slice(26)}`.toLowerCase()
      if (to !== payeeLower) continue
      const amount = BigInt(log.data || "0x0")
      const min = BigInt(parseUnits(minAmountUsdc, decimals))
      if (amount >= min) return true
    }
    return false
  },

  async autoPay({ payee, amountUsdc }: { payee: string; amountUsdc: string }) {
    const hash = await sendPayment({ to: payee, amountUsdc })
    return hash
  }
}
