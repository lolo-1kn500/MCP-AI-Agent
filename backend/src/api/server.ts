import express from "express"
import cors from "cors"

import taskRoutes from "./routes/task"
import { agentRouter } from "../routes/agent"

export function startServer(){

 const app = express()

 app.use(cors())
 app.use(express.json())

 app.use("/task",taskRoutes)
 app.use("/agent",agentRouter)

 app.listen(3001,()=>{
  console.log("OmniClaw running")
 })

}
