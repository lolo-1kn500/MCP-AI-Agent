const BASE_URL = "https://portal.thirdweb.com/mcp"

const clientId = process.env.THIRDWEB_CLIENT_ID
const secretKey = process.env.THIRDWEB_SECRET_KEY

async function twFetch<T>(tool: string, payload: any): Promise<T> {
  if (!clientId || !secretKey) {
    throw new Error("Thirdweb ClientID/Secret missing")
  }
  const res = await fetch(`${BASE_URL}/${tool}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": clientId,
      "x-secret-key": secretKey
    },
    body: JSON.stringify(payload || {})
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`thirdweb ${tool} failed: ${res.status} ${text}`)
  }
  return res.json()
}

export const thirdweb = {
  getMyWallet: () => twFetch("getMyWallet", {}),
  listUserWallets: (userId: string) => twFetch("listUserWallets", { userId }),
  createUserWallet: (userId: string, chainId?: number) =>
    twFetch("createUserWallet", { userId, chainId }),
  getWalletBalance: (walletAddress: string, chainId: number) =>
    twFetch("getWalletBalance", { walletAddress, chainId }),
  readContract: (params: any) => twFetch("readContract", params),
  writeContract: (params: any) => twFetch("writeContract", params),
  getContractEvents: (params: any) => twFetch("getContractEvents", params),
  createPayment: (params: any) => twFetch("createPayment", params),
  paymentsPurchase: (params: any) => twFetch("paymentsPurchase", params),
  bridgeSwap: (params: any) => twFetch("bridgeSwap", params),
  createToken: (params: any) => twFetch("createToken", params),
  listTokens: (params: any) => twFetch("listTokens", params)
}
