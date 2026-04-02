export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Kai.AI Agent SaaS</h1>
      <p style={{ marginTop: 8 }}>
        Multi-agent orchestrator with x402 paywall, Supabase auth, and vector memory.
      </p>
      <p style={{ marginTop: 12 }}>
        Try the API endpoints: /api/chat, /api/weather, /api/analysis
      </p>
    </main>
  )
}
