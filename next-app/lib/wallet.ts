import { http, createWalletClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { base } from "viem/chains"

const rpcUrl = process.env.BASE_RPC || "https://mainnet.base.org"
const pk = process.env.AGENT_WALLET_PRIVATE_KEY || process.env.X402_PAYER_PRIVATE_KEY || ""
export const account = pk ? privateKeyToAccount(pk as `0x${string}`) : undefined

export const viemWallet = account
  ? createWalletClient({
      chain: base,
      account,
      transport: http(rpcUrl)
    })
  : undefined
