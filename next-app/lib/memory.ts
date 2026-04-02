import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"
import { createEmbedding } from "./openrouter"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function upsertMemory(userId: string, content: string) {
  const embedding = await createEmbedding(content)
  const { error } = await supabase.from("memories").upsert({
    id: uuidv4(),
    user_id: userId,
    content,
    embedding
  })
  if (error) throw error
}

export async function searchMemory(userId: string, query: string, limit = 5) {
  const queryEmbedding = await createEmbedding(query)
  const { data, error } = await supabase.rpc("match_memories", {
    query_embedding: queryEmbedding,
    user_id: userId,
    match_count: limit
  })
  if (error) throw error
  return data || []
}
