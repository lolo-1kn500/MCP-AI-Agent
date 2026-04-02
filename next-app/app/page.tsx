import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export default async function Home() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from("todos").select()

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Kai.AI Agent SaaS</h1>
      <p style={{ marginTop: 8 }}>
        Multi-agent orchestrator with x402 paywall, Supabase auth, and vector memory.
      </p>
      <p style={{ marginTop: 12 }}>Try the API endpoints: /api/chat, /api/weather, /api/analysis</p>
      <h2 style={{ marginTop: 16 }}>Todos (Supabase SSR)</h2>
      <ul>
        {todos?.map((todo: any) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>
    </main>
  )
}
