import dotenv from "dotenv"
import fs from 'fs'
import {
  Keypair,
  Connection,
} from "@solana/web3.js"
import bs58 from "bs58"
import mintSecret from "./mint.json" with { type : "json" }
import nftMintSecret from "./nft-mint.json" with { type : "json" }

dotenv.config();

export const connection = new Connection(process.env.SOLANA_RPC || "http://127.0.0.1:8899", "confirmed")
export const feePayer = Keypair.fromSecretKey(
  process.env.SOLANA_SECRET ? bs58.decode(process.env.SOLANA_SECRET) : new Uint8Array(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8")))
)
export const mintAccount = Keypair.fromSecretKey(new Uint8Array(mintSecret))
export const nftMintAccount = Keypair.fromSecretKey(new Uint8Array(nftMintSecret))


export default {
  connection,
  feePayer,
  mintAccount,
  nftMintAccount,
}