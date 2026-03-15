import { JsonRpcProvider } from "ethers"

export const baseProvider =
 new JsonRpcProvider(process.env.BASE_RPC)

export const monadProvider =
 new JsonRpcProvider(process.env.MONAD_RPC)
