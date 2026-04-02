import { Pool } from "pg"
import { config } from "../config"

export const db = new Pool({
  connectionString: config.databaseUrl
})

export async function ensureSchema() {
  await db.query(`
    create table if not exists agents (
      id text primary key,
      fid bigint,
      display_name text,
      name text,
      status text not null,
      created_at timestamptz default now()
    );

    alter table agents add column if not exists fid bigint;
    alter table agents add column if not exists display_name text;
    alter table agents add column if not exists name text;

    create table if not exists skills (
      id text primary key,
      name text not null,
      source text not null,
      version text,
      installed_at timestamptz default now()
    );

    create table if not exists a2a_messages (
      id text primary key,
      direction text not null,
      sender text not null,
      recipient text not null,
      message_type text not null,
      payload jsonb not null,
      created_at timestamptz default now()
    );

    create table if not exists tool_runs (
      id text primary key,
      tool text not null,
      input jsonb not null,
      output jsonb,
      status text not null,
      created_at timestamptz default now()
    );

    create table if not exists x402_payments (
      id text primary key,
      link text not null,
      amount text not null,
      chain_id integer not null,
      token_address text not null,
      created_at timestamptz default now(),
      used_at timestamptz
    );

    create table if not exists agent_wallets (
      id text primary key,
      agent_id text references agents(id) on delete cascade,
      chain text,
      address text not null,
      type text,
      status text,
      created_at timestamptz default now()
    );

    create table if not exists agent_api_keys (
      id text primary key,
      agent_id text references agents(id) on delete cascade,
      provider text not null,
      key_ciphertext text not null,
      key_kms_ref text,
      scopes text[],
      created_at timestamptz default now(),
      revoked_at timestamptz
    );

    create table if not exists agent_tools (
      id text primary key,
      agent_id text references agents(id) on delete cascade,
      tool_name text not null,
      endpoint text not null,
      schema_json jsonb,
      price_usdc numeric,
      active boolean default true,
      created_at timestamptz default now()
    );

    create table if not exists tool_usage (
      id text primary key,
      tool_id text references agent_tools(id) on delete cascade,
      caller_agent_id text references agents(id) on delete set null,
      api_call_id text,
      status text,
      cost_usdc numeric,
      created_at timestamptz default now()
    );

    create table if not exists agent_mcp_connections (
      id text primary key,
      agent_id text references agents(id) on delete cascade,
      server_name text,
      base_url text,
      auth_type text,
      auth_ref text,
      status text,
      last_seen timestamptz
    );

    create table if not exists agent_services (
      id text primary key,
      agent_id text references agents(id) on delete cascade,
      service_name text not null,
      capabilities jsonb,
      price_usdc numeric,
      active boolean default true,
      sla_json jsonb,
      created_at timestamptz default now()
    );

    create table if not exists service_requests (
      id text primary key,
      caller_agent_id text references agents(id) on delete set null,
      provider_agent_id text references agents(id) on delete set null,
      service_id text references agent_services(id) on delete set null,
      status text,
      api_call_id text,
      created_at timestamptz default now()
    );

    create table if not exists api_calls (
      id text primary key,
      caller_agent_id text references agents(id) on delete set null,
      provider_agent_id text references agents(id) on delete set null,
      tool_id text references agent_tools(id) on delete set null,
      service_id text references agent_services(id) on delete set null,
      status text,
      price_usdc numeric,
      nonce text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    create table if not exists payment_receipts (
      id text primary key,
      api_call_id text,
      payer_wallet text,
      payee_wallet text,
      tx_hash text unique not null,
      amount_usdc numeric,
      block_number bigint,
      confirmed_at timestamptz default now()
    );

    create table if not exists wallet_ledger (
      id bigserial primary key,
      agent_id text references agents(id) on delete set null,
      wallet text not null,
      direction text not null,
      amount_usdc numeric not null,
      reason text,
      api_call_id text,
      tx_hash text,
      created_at timestamptz default now()
    );

    create table if not exists reputation_events (
      id bigserial primary key,
      agent_id text references agents(id) on delete cascade,
      source text,
      delta numeric,
      reason text,
      created_at timestamptz default now()
    );

    create index if not exists idx_agents_fid on agents(fid);
    create index if not exists idx_wallets_address on agent_wallets(address);
    create index if not exists idx_wallets_agent on agent_wallets(agent_id);
    create index if not exists idx_api_keys_agent on agent_api_keys(agent_id);
    create index if not exists idx_tools_agent on agent_tools(agent_id);
    create index if not exists idx_tool_usage_tool on tool_usage(tool_id);
    create index if not exists idx_tool_usage_api_call on tool_usage(api_call_id);
    create index if not exists idx_mcp_conn_agent on agent_mcp_connections(agent_id);
    create index if not exists idx_services_agent on agent_services(agent_id);
    create index if not exists idx_service_requests_provider on service_requests(provider_agent_id);
    create index if not exists idx_service_requests_caller on service_requests(caller_agent_id);
    create index if not exists idx_payment_receipts_tx on payment_receipts(tx_hash);
    create index if not exists idx_wallet_ledger_wallet on wallet_ledger(wallet);
    create index if not exists idx_api_calls_nonce on api_calls(nonce);
    create index if not exists idx_reputation_agent on reputation_events(agent_id);
  `)

  await db.query(
    "alter table x402_payments add column if not exists used_at timestamptz"
  )

  await db.query(
    `insert into agents (id, name, display_name, status)
     values ($1, $2, $3, $4)
     on conflict (id) do nothing`,
    ["kai", "Kai Agent", "Kai Agent", "online"]
  )
}
