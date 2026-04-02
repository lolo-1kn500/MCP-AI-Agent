import { Router } from "express"
import { db } from "../storage/db"

export const agentRouter = Router()

agentRouter.get("/", async (_req, res) => {
  const result = await db.query(
    "select id, name, display_name, status, created_at from agents order by created_at asc"
  )
  res.json(result.rows)
})
