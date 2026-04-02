import { supabase } from "./supabase"

export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  if (!supabase) return null
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}
