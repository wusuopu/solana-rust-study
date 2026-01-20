// 调用合约程序
import dotenv from "dotenv"
import fs from 'fs'
import {
  Keypair,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  Connection,
  PublicKey,
} from "@solana/web3.js"
import bs58 from "bs58"
import programSecret from "../target/deploy/hello_solana-keypair.json" with { type: 'json' }


dotenv.config();

const connection = new Connection(process.env.SOLANA_RPC || "http://127.0.0.1:8899", "confirmed")
const feePayer = Keypair.fromSecretKey(
  process.env.SOLANA_SECRET ? bs58.decode(process.env.SOLANA_SECRET) : new Uint8Array(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8")))
)

const programAccount = Keypair.fromSecretKey(new Uint8Array(programSecret))

async function call_hello_solana() {
  const ix = new TransactionInstruction({
    keys: [{ pubkey: feePayer.publicKey, isSigner: true, isWritable: true }],
    programId: programAccount.publicKey,
  })

  const tx = new Transaction().add(ix)
  const signature = await sendAndConfirmTransaction(connection, tx, [feePayer])
  console.log("signature:", signature)

  const transaction = await connection.getParsedTransaction(signature, {commitment: "confirmed"})
  console.log("transaction info:", JSON.stringify(transaction, undefined, 2))
}

async function main() {
  await call_hello_solana()
}
main()
