import { v4 as uuidv4 } from "uuid"
import { createEmbedding } from "./openrouter"
import { supabase } from "./supabase"

export async function upsertMemory(userId: string, content: string) {
  if (!supabase) return
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
  if (!supabase) return []
  const queryEmbedding = await createEmbedding(query)
  const { data, error } = await supabase.rpc("match_memories", {
    query_embedding: queryEmbedding,
    user_id: userId,
    match_count: limit
  })
  if (error) throw error
  return data || []
}
