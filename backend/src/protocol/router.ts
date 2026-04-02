import { Router } from "express"
import { Readable } from "stream"
import { randomUUID } from "crypto"
import { chatWithOpenRouter } from "../llm/openrouter"
import { config } from "../config"
import {
  createPendingApiCall,
  createX402Payment,
  getPayerAllowlist,
  setPayerAllowlist,
  verifyAndFinalizeX402Payment
} from "../payments/x402"
import { db } from "../storage/db"
import {
  completeAuth,
  getThirdwebStatus,
  initiateAuth,
  thirdwebAiRequest,
  thirdwebStreamRequest,
  thirdwebBridgeRequest,
  thirdwebGatewayRequest,
  thirdwebRequest,
  thirdwebTokensRequest,
  thirdwebWalletsRequest
} from "../tools/thirdweb"

export const protocolRouter = Router()

function requireAdmin(req: any, res: any) {
  if (!config.adminApiKey) {
    res.status(500).json({ error: "admin_api_key_not_configured" })
    return false
  }
  const provided = String(req.header("x-admin-key") || "")
  if (provided !== config.adminApiKey) {
    res.status(401).json({ error: "unauthorized" })
    return false
  }
  return true
}

function parseQueryArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean)
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function parseChainIds(value: unknown): number[] {
  return parseQueryArray(value)
    .map((item) => Number(item))
    .filter((item) => !Number.isNaN(item))
}

async function requireX402Payment(
  req: any,
  res: any,
  options?: { priceUsdc?: string; payeeWallet?: string }
) {
  const paymentId = String(req.header("x402-payment-id") || "")
  const paymentTx = String(req.header("x402-payment-tx") || "")
  const priceUsdc = options?.priceUsdc || config.x402Amount
  const payee = options?.payeeWallet || config.x402Recipient

  if (paymentId && paymentTx) {
    const verified = await verifyAndFinalizeX402Payment(
      paymentId,
      paymentTx,
      priceUsdc,
      payee
    )
    if (verified) {
      return true
    }
  }

  const payment = await createX402Payment()
  await createPendingApiCall({ id: payment.id, priceUsdc })
  res.status(402).json({
    error: "payment_required",
    payment,
    api_call_id: payment.id,
    price_usdc: priceUsdc,
    payee_wallet: payee
  })
  return false
}

protocolRouter.get("/health", async (_req, res) => {
  res.json({ status: "ok" })
})

protocolRouter.get("/agents", async (_req, res) => {
  const result = await db.query(
    "select id, name, status, created_at from agents order by created_at asc"
  )
  res.json(result.rows)
})

protocolRouter.get("/agents/:agentId/tools", async (req, res) => {
  const { agentId } = req.params
  const result = await db.query(
    `select id, tool_name, endpoint, schema_json, price_usdc, active, created_at
     from agent_tools where agent_id = $1 order by created_at desc`,
    [agentId]
  )
  res.json(result.rows)
})

protocolRouter.post("/agents/:agentId/tools", async (req, res) => {
  const { agentId } = req.params
  const { toolName, endpoint, schema, priceUsdc, active = true } = req.body || {}
  if (!toolName || !endpoint) {
    return res.status(400).json({ error: "toolName and endpoint are required" })
  }
  const id = randomUUID()
  await db.query(
    `insert into agent_tools (id, agent_id, tool_name, endpoint, schema_json, price_usdc, active)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [id, agentId, toolName, endpoint, schema || null, priceUsdc || null, active]
  )
  res.json({ id, toolName, endpoint, priceUsdc: priceUsdc || null, active })
})

protocolRouter.get("/agents/:agentId/services", async (req, res) => {
  const { agentId } = req.params
  const result = await db.query(
    `select id, service_name, capabilities, price_usdc, active, sla_json, created_at
     from agent_services where agent_id = $1 order by created_at desc`,
    [agentId]
  )
  res.json(result.rows)
})

protocolRouter.post("/agents/:agentId/services", async (req, res) => {
  const { agentId } = req.params
  const { serviceName, capabilities, priceUsdc, active = true, sla } = req.body || {}
  if (!serviceName) {
    return res.status(400).json({ error: "serviceName is required" })
  }
  const id = randomUUID()
  await db.query(
    `insert into agent_services (id, agent_id, service_name, capabilities, price_usdc, active, sla_json)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [id, agentId, serviceName, capabilities || null, priceUsdc || null, active, sla || null]
  )
  res.json({ id, serviceName, priceUsdc: priceUsdc || null, active })
})

protocolRouter.get("/agents/:agentId/mcp-connections", async (req, res) => {
  const { agentId } = req.params
  const result = await db.query(
    `select id, server_name, base_url, auth_type, auth_ref, status, last_seen
     from agent_mcp_connections where agent_id = $1 order by last_seen desc nulls last`,
    [agentId]
  )
  res.json(result.rows)
})

protocolRouter.post("/agents/:agentId/mcp-connections", async (req, res) => {
  const { agentId } = req.params
  const { serverName, baseUrl, authType, authRef, status, lastSeen } = req.body || {}
  if (!serverName || !baseUrl) {
    return res
      .status(400)
      .json({ error: "serverName and baseUrl are required" })
  }
  const id = randomUUID()
  await db.query(
    `insert into agent_mcp_connections (id, agent_id, server_name, base_url, auth_type, auth_ref, status, last_seen)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, agentId, serverName, baseUrl, authType || null, authRef || null, status || null, lastSeen || null]
  )
  res.json({ id, serverName, baseUrl, status: status || null })
})

protocolRouter.get("/agents/:agentId/api-keys", async (req, res) => {
  if (!requireAdmin(req, res)) return
  const { agentId } = req.params
  const result = await db.query(
    `select id, provider, scopes, created_at, revoked_at
     from agent_api_keys where agent_id = $1 order by created_at desc`,
    [agentId]
  )
  res.json(result.rows)
})

protocolRouter.post("/agents/:agentId/api-keys", async (req, res) => {
  if (!requireAdmin(req, res)) return
  const { agentId } = req.params
  const { provider, keyCiphertext, keyKmsRef, scopes } = req.body || {}
  if (!provider || !keyCiphertext) {
    return res.status(400).json({ error: "provider and keyCiphertext are required" })
  }
  const id = randomUUID()
  await db.query(
    `insert into agent_api_keys (id, agent_id, provider, key_ciphertext, key_kms_ref, scopes)
     values ($1, $2, $3, $4, $5, $6)`,
    [id, agentId, provider, keyCiphertext, keyKmsRef || null, scopes || null]
  )
  res.json({ id, provider, scopes: scopes || [] })
})

protocolRouter.get("/skills", async (_req, res) => {
  const result = await db.query(
    "select id, name, source, version, installed_at from skills order by installed_at desc"
  )
  res.json(result.rows)
})

protocolRouter.get("/payments/receipts", async (req, res) => {
  if (!requireAdmin(req, res)) return
  const status = String(req.query.status || "")
  const clauses: string[] = []
  const params: any[] = []

  if (status) {
    clauses.push("api.status = $1")
    params.push(status)
  }

  const where = clauses.length ? `where ${clauses.join(" and ")}` : ""
  const sql = `
    select pr.id, pr.api_call_id, pr.payer_wallet, pr.payee_wallet, pr.tx_hash, pr.amount_usdc,
           pr.block_number, pr.confirmed_at, api.status
    from payment_receipts pr
    left join api_calls api on api.id = pr.api_call_id
    ${where}
    order by pr.confirmed_at desc
    limit 200
  `
  const result = await db.query(sql, params)
  res.json(result.rows)
})

protocolRouter.get("/api-calls", async (req, res) => {
  if (!requireAdmin(req, res)) return
  const status = String(req.query.status || "")
  const clauses: string[] = []
  const params: any[] = []
  if (status) {
    clauses.push("status = $1")
    params.push(status)
  }
  const where = clauses.length ? `where ${clauses.join(" and ")}` : ""
  const sql = `
    select id, caller_agent_id, provider_agent_id, tool_id, service_id, status, price_usdc, nonce, created_at, updated_at
    from api_calls
    ${where}
    order by created_at desc
    limit 200
  `
  const result = await db.query(sql, params)
  res.json(result.rows)
})

protocolRouter.get("/admin/wallet/address", async (req, res) => {
  if (!requireAdmin(req, res)) return
  try {
    const { agentWallet } = await import("../wallet/agentWallet")
    res.json({ address: agentWallet.address })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

protocolRouter.get("/admin/payer-allowlist", (req, res) => {
  if (!requireAdmin(req, res)) return
  res.json({ allowlist: getPayerAllowlist() })
})

protocolRouter.post("/admin/payer-allowlist", (req, res) => {
  if (!requireAdmin(req, res)) return
  const list = Array.isArray(req.body?.allowlist)
    ? req.body.allowlist
    : []
  setPayerAllowlist(list as string[])
  res.json({ allowlist: getPayerAllowlist() })
})

protocolRouter.post("/skills/install", async (req, res) => {
  const { name, source, version } = req.body || {}
  if (!name || !source) {
    return res.status(400).json({ error: "name and source are required" })
  }

  const id = randomUUID()
  await db.query(
    "insert into skills (id, name, source, version) values ($1, $2, $3, $4)",
    [id, name, source, version || null]
  )

  res.json({ id, name, source, version: version || null })
})

protocolRouter.get("/a2a/inbox", async (req, res) => {
  const recipient = String(req.query.recipient || "kai")
  const result = await db.query(
    "select id, sender, recipient, message_type, payload, created_at from a2a_messages where direction = 'in' and recipient = $1 order by created_at desc limit 100",
    [recipient]
  )
  res.json(result.rows)
})

protocolRouter.post("/a2a/inbox", async (req, res) => {
  const { sender, recipient, messageType, payload } = req.body || {}
  if (!sender || !recipient || !messageType) {
    return res
      .status(400)
      .json({ error: "sender, recipient, messageType are required" })
  }

  const id = randomUUID()
  await db.query(
    "insert into a2a_messages (id, direction, sender, recipient, message_type, payload) values ($1, 'in', $2, $3, $4, $5)",
    [id, sender, recipient, messageType, payload || {}]
  )

  res.json({ id, status: "accepted" })
})

protocolRouter.post("/a2a/outbox", async (req, res) => {
  const { sender, recipient, messageType, payload } = req.body || {}
  if (!sender || !recipient || !messageType) {
    return res
      .status(400)
      .json({ error: "sender, recipient, messageType are required" })
  }

  const id = randomUUID()
  await db.query(
    "insert into a2a_messages (id, direction, sender, recipient, message_type, payload) values ($1, 'out', $2, $3, $4, $5)",
    [id, sender, recipient, messageType, payload || {}]
  )

  res.json({ id, status: "queued" })
})

protocolRouter.get("/a2a/outbox", async (req, res) => {
  const sender = String(req.query.sender || "kai")
  const result = await db.query(
    "select id, sender, recipient, message_type, payload, created_at from a2a_messages where direction = 'out' and sender = $1 order by created_at desc limit 100",
    [sender]
  )
  res.json(result.rows)
})

protocolRouter.post("/llm/chat", async (req, res) => {
  const { messages } = req.body || {}
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages must be an array" })
  }

  const toolRunId = randomUUID()
  await db.query(
    "insert into tool_runs (id, tool, input, status) values ($1, $2, $3, $4)",
    [toolRunId, "openrouter.chat", { messages }, "running"]
  )

  try {
    const output = await chatWithOpenRouter(messages)
    await db.query(
      "update tool_runs set output = $1, status = $2 where id = $3",
      [output, "succeeded", toolRunId]
    )
    res.json(output)
  } catch (error) {
    await db.query(
      "update tool_runs set output = $1, status = $2 where id = $3",
      [{ error: String(error) }, "failed", toolRunId]
    )
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.get("/tools/thirdweb/status", async (_req, res) => {
  res.json(getThirdwebStatus())
})

protocolRouter.post("/tools/thirdweb/request", async (req, res) => {
  const { path, method, query, body, headers } = req.body || {}
  if (!path) {
    return res.status(400).json({ error: "path is required" })
  }

  try {
    const result = await thirdwebRequest({ path, method, query, body, headers })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/wallets", async (req, res) => {
  try {
    const result = await thirdwebWalletsRequest(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.get("/tools/thirdweb/wallets/balance", async (req, res) => {
  const address = String(req.query.address || "")
  const tokenAddress = req.query.tokenAddress
    ? String(req.query.tokenAddress)
    : undefined
  if (!address) {
    return res.status(400).json({ error: "address is required" })
  }

  const chainIds = parseChainIds(req.query.chainId)

  if (chainIds.length === 0) {
    return res.status(400).json({ error: "chainId is required" })
  }

  try {
    const result = await thirdwebWalletsRequest({
      path: `/v1/wallets/${address}/balance`,
      method: "GET",
      query: {
        chainId: chainIds,
        ...(tokenAddress ? { tokenAddress } : {})
      }
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.get("/tools/thirdweb/wallets/transactions", async (req, res) => {
  const address = String(req.query.address || "")
  if (!address) {
    return res.status(400).json({ error: "address is required" })
  }

  const chainIds = parseChainIds(req.query.chainId)
  if (chainIds.length === 0) {
    return res.status(400).json({ error: "chainId is required" })
  }

  try {
    const query: Record<
      string,
      string | number | boolean | Array<string | number | boolean>
    > = {
      chainId: chainIds
    }
    const optionalKeys = [
      "filterBlockTimestampGte",
      "filterBlockTimestampLte",
      "filterBlockNumberGte",
      "filterBlockNumberLte",
      "filterValueGt",
      "filterFunctionSelector",
      "page",
      "limit",
      "sortOrder"
    ]
    optionalKeys.forEach((key) => {
      const value = req.query[key]
      if (value !== undefined) {
        query[key] = value as string | string[]
      }
    })

    const result = await thirdwebWalletsRequest({
      path: `/v1/wallets/${address}/transactions`,
      method: "GET",
      query
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.get("/tools/thirdweb/wallets/tokens", async (req, res) => {
  const address = String(req.query.address || "")
  if (!address) {
    return res.status(400).json({ error: "address is required" })
  }

  const chainIds = parseChainIds(req.query.chainId)
  if (chainIds.length === 0) {
    return res.status(400).json({ error: "chainId is required" })
  }

  try {
    const tokenAddresses = parseQueryArray(req.query.tokenAddresses)
    const query: Record<
      string,
      string | number | boolean | Array<string | number | boolean>
    > = {
      chainId: chainIds
    }
    if (tokenAddresses.length > 0) {
      query.tokenAddresses = tokenAddresses
    }
    const optionalKeys = [
      "limit",
      "page",
      "metadata",
      "resolveMetadataLinks",
      "includeSpam",
      "includeNative",
      "sortBy",
      "sortOrder",
      "includeWithoutPrice"
    ]
    optionalKeys.forEach((key) => {
      const value = req.query[key]
      if (value !== undefined) {
        query[key] = value as string | string[]
      }
    })

    const result = await thirdwebWalletsRequest({
      path: `/v1/wallets/${address}/tokens`,
      method: "GET",
      query
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.get("/tools/thirdweb/wallets/nfts", async (req, res) => {
  const address = String(req.query.address || "")
  if (!address) {
    return res.status(400).json({ error: "address is required" })
  }

  const chainIds = parseChainIds(req.query.chainId)
  if (chainIds.length === 0) {
    return res.status(400).json({ error: "chainId is required" })
  }

  try {
    const contractAddresses = parseQueryArray(req.query.contractAddresses)
    const query: Record<
      string,
      string | number | boolean | Array<string | number | boolean>
    > = {
      chainId: chainIds
    }
    if (contractAddresses.length > 0) {
      query.contractAddresses = contractAddresses
    }
    const optionalKeys = ["limit", "page"]
    optionalKeys.forEach((key) => {
      const value = req.query[key]
      if (value !== undefined) {
        query[key] = value as string | string[]
      }
    })

    const result = await thirdwebWalletsRequest({
      path: `/v1/wallets/${address}/nfts`,
      method: "GET",
      query
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/wallets/sign-message", async (req, res) => {
  try {
    if (!(await requireX402Payment(req, res))) {
      return
    }
    const result = await thirdwebWalletsRequest({
      path: "/v1/wallets/sign-message",
      method: "POST",
      body: req.body
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post(
  "/tools/thirdweb/wallets/sign-typed-data",
  async (req, res) => {
    try {
      if (!(await requireX402Payment(req, res))) {
        return
      }
      const result = await thirdwebWalletsRequest({
        path: "/v1/wallets/sign-typed-data",
        method: "POST",
        body: req.body
      })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  }
)

protocolRouter.post("/tools/thirdweb/wallets/send", async (req, res) => {
  try {
    if (!(await requireX402Payment(req, res))) {
      return
    }
    const result = await thirdwebWalletsRequest({
      path: "/v1/wallets/send",
      method: "POST",
      body: req.body
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/gateway", async (req, res) => {
  try {
    const result = await thirdwebGatewayRequest(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/gateway/read", async (req, res) => {
  try {
    const result = await thirdwebGatewayRequest({
      path: "/v1/contracts/read",
      method: "POST",
      body: req.body
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/gateway/write", async (req, res) => {
  try {
    if (!(await requireX402Payment(req, res))) {
      return
    }
    const result = await thirdwebGatewayRequest({
      path: "/v1/contracts/write",
      method: "POST",
      body: req.body
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.get("/tools/thirdweb/gateway/contracts", async (req, res) => {
  try {
    const result = await thirdwebGatewayRequest({
      path: "/v1/contracts",
      method: "GET",
      query: req.query as Record<string, string>
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.get(
  "/tools/thirdweb/gateway/contracts/transactions",
  async (req, res) => {
    const chainId = String(req.query.chainId || "")
    const address = String(req.query.address || "")
    if (!chainId || !address) {
      return res
        .status(400)
        .json({ error: "chainId and address are required" })
    }
    try {
      const query = { ...req.query }
      delete (query as Record<string, unknown>).chainId
      delete (query as Record<string, unknown>).address
      const result = await thirdwebGatewayRequest({
        path: `/v1/contracts/${chainId}/${address}/transactions`,
        method: "GET",
        query: query as Record<string, string>
      })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  }
)

protocolRouter.get(
  "/tools/thirdweb/gateway/contracts/events",
  async (req, res) => {
    const chainId = String(req.query.chainId || "")
    const address = String(req.query.address || "")
    if (!chainId || !address) {
      return res
        .status(400)
        .json({ error: "chainId and address are required" })
    }
    try {
      const query = { ...req.query }
      delete (query as Record<string, unknown>).chainId
      delete (query as Record<string, unknown>).address
      const result = await thirdwebGatewayRequest({
        path: `/v1/contracts/${chainId}/${address}/events`,
        method: "GET",
        query: query as Record<string, string>
      })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  }
)

protocolRouter.get(
  "/tools/thirdweb/gateway/contracts/metadata",
  async (req, res) => {
    const chainId = String(req.query.chainId || "")
    const address = String(req.query.address || "")
    if (!chainId || !address) {
      return res
        .status(400)
        .json({ error: "chainId and address are required" })
    }
    try {
      const result = await thirdwebGatewayRequest({
        path: `/v1/contracts/${chainId}/${address}/metadata`,
        method: "GET"
      })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  }
)

protocolRouter.get(
  "/tools/thirdweb/gateway/contracts/signatures",
  async (req, res) => {
    const chainId = String(req.query.chainId || "")
    const address = String(req.query.address || "")
    if (!chainId || !address) {
      return res
        .status(400)
        .json({ error: "chainId and address are required" })
    }
    try {
      const result = await thirdwebGatewayRequest({
        path: `/v1/contracts/${chainId}/${address}/signatures`,
        method: "GET"
      })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  }
)

protocolRouter.post("/tools/thirdweb/tokens", async (req, res) => {
  try {
    const result = await thirdwebTokensRequest(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.get("/tools/thirdweb/tokens/list", async (req, res) => {
  try {
    const result = await thirdwebTokensRequest({
      path: "/v1/tokens",
      method: "GET",
      query: req.query as Record<string, string>
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/tokens/create", async (req, res) => {
  try {
    if (!(await requireX402Payment(req, res))) {
      return
    }
    const result = await thirdwebTokensRequest({
      path: "/v1/tokens",
      method: "POST",
      body: req.body
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.get("/tools/thirdweb/tokens/owners", async (req, res) => {
  const chainId = String(req.query.chainId || "")
  const address = String(req.query.address || "")
  if (!chainId || !address) {
    return res
      .status(400)
      .json({ error: "chainId and address are required" })
  }
  try {
    const query = { ...req.query }
    delete (query as Record<string, unknown>).chainId
    delete (query as Record<string, unknown>).address
    const result = await thirdwebTokensRequest({
      path: `/v1/tokens/${chainId}/${address}/owners`,
      method: "GET",
      query: query as Record<string, string>
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/bridge", async (req, res) => {
  try {
    const result = await thirdwebBridgeRequest(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.get("/tools/thirdweb/bridge/chains", async (_req, res) => {
  try {
    const result = await thirdwebBridgeRequest({
      path: "/v1/bridge/chains",
      method: "GET"
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.get("/tools/thirdweb/bridge/routes", async (req, res) => {
  try {
    const result = await thirdwebBridgeRequest({
      path: "/v1/bridge/routes",
      method: "GET",
      query: req.query as Record<string, string>
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/bridge/convert", async (req, res) => {
  try {
    if (!(await requireX402Payment(req, res))) {
      return
    }
    const result = await thirdwebBridgeRequest({
      path: "/v1/bridge/convert",
      method: "POST",
      body: req.body
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/bridge/swap", async (req, res) => {
  try {
    if (!(await requireX402Payment(req, res))) {
      return
    }
    const result = await thirdwebBridgeRequest({
      path: "/v1/bridge/swap",
      method: "POST",
      body: req.body
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/bridge/payments", async (req, res) => {
  try {
    if (!(await requireX402Payment(req, res))) {
      return
    }
    const result = await thirdwebBridgeRequest({
      path: "/v1/bridge/payments",
      method: "POST",
      body: req.body
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post(
  "/tools/thirdweb/bridge/payments/:id",
  async (req, res) => {
    const { id } = req.params
    if (!id) {
      return res.status(400).json({ error: "id is required" })
    }
    try {
      if (!(await requireX402Payment(req, res))) {
        return
      }
      const result = await thirdwebBridgeRequest({
        path: `/v1/bridge/payments/${id}`,
        method: "POST",
        body: req.body
      })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  }
)

protocolRouter.post("/tools/thirdweb/ai", async (req, res) => {
  try {
    const result = await thirdwebAiRequest(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/ai/chat", async (req, res) => {
  try {
    if (!(await requireX402Payment(req, res))) {
      return
    }
    const result = await thirdwebAiRequest({
      path: "/ai/chat",
      method: "POST",
      body: req.body
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/ai/chat/stream", async (req, res) => {
  try {
    if (!(await requireX402Payment(req, res))) {
      return
    }
    const response = await thirdwebStreamRequest({
      path: "/ai/chat",
      method: "POST",
      body: { ...req.body, stream: true },
      headers: {
        Accept: "text/event-stream"
      }
    })

    res.status(response.status)
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")

    if (!response.body) {
      const text = await response.text()
      res.write(text)
      res.end()
      return
    }

    Readable.fromWeb(response.body as any).pipe(res)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/auth/initiate", async (req, res) => {
  try {
    const result = await initiateAuth(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

protocolRouter.post("/tools/thirdweb/auth/complete", async (req, res) => {
  try {
    const result = await completeAuth(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})
