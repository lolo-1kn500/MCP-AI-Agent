import { ethers } from "ethers"
import { ENV } from "../config/env"

export const agentWallet = new ethers.Wallet(
 ENV.privateKey
)