import dotenv from "dotenv"

dotenv.config()

export const ENV = {

 openai:process.env.OPENAI_KEY!,
 baseRpc:process.env.BASE_RPC!,
 monadRpc:process.env.MONAD_RPC!,
 privateKey:process.env.AGENT_PRIVATE_KEY || process.env.AGENT_WALLET_PRIVATE_KEY!,
 port:process.env.PORT || 3001

}
