export const config = {
  port: Number(process.env.PORT || 3001),
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openRouterModel:
    process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct",
  thirdwebClientId: process.env.THIRDWEB_CLIENT_ID || "",
  thirdwebSecretKey: process.env.THIRDWEB_SECRET_KEY || "",
  thirdwebProjectId: process.env.THIRDWEB_PROJECT_ID || "",
  x402ChainId: Number(process.env.X402_USDC_CHAIN_ID || 8453),
  x402TokenAddress:
    process.env.X402_USDC_TOKEN_ADDRESS ||
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  x402UsdcDecimals: Number(process.env.X402_USDC_DECIMALS || 6),
  x402RpcUrl:
    process.env.X402_RPC_URL || process.env.BASE_RPC || "https://mainnet.base.org",
  x402Amount: process.env.X402_USDC_AMOUNT || "0.1",
  x402Recipient:
    process.env.X402_USDC_RECIPIENT ||
    "0xbf2De1074f82A6cF37D5134694e7315956AE6d3F",
  x402PayerAllowlist: (process.env.X402_PAYER_ALLOWLIST || "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean),
  adminApiKey: process.env.ADMIN_API_KEY || "",
  redisDisabled: process.env.REDIS_DISABLED === "true",
  a2aPublicBaseUrl: process.env.A2A_PUBLIC_BASE_URL || "http://localhost:3001",
  databaseUrl:
    process.env.DATABASE_URL || "postgres://kai:kai@localhost:5432/kai_agent",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379"
}
