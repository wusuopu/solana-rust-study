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
  SendTransactionError,
  SYSVAR_RENT_PUBKEY
} from "@solana/web3.js"
import bs58 from "bs58"
import * as borsh from 'borsh';
import programSecret from "../target/deploy/close_account-keypair.json" with { type: 'json' }


dotenv.config();

const connection = new Connection(process.env.SOLANA_RPC || "http://127.0.0.1:8899", "confirmed")
const feePayer = Keypair.fromSecretKey(
  process.env.SOLANA_SECRET ? bs58.decode(process.env.SOLANA_SECRET) : new Uint8Array(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8")))
)

const programAccount = Keypair.fromSecretKey(new Uint8Array(programSecret))

const [userAccountAddress] = PublicKey.findProgramAddressSync(
  [Buffer.from("USER"), feePayer.publicKey.toBuffer()],
  programAccount.publicKey,
);


const UserSchema = {
  struct: {
    name: "string",
  },
}

async function main() {
  let user = { name: "John Doe1122" }
  let encodedUser = borsh.serialize(UserSchema, user)
  let data = new Uint8Array(2 + encodedUser.length)
  data.set(new Uint8Array([48, 49]), 0)   // "01"
  data.set(encodedUser, 2)

  console.log("new account:", userAccountAddress.toBase58())
  console.log("data:", data)

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
      { pubkey: userAccountAddress, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false}
    ],
    programId: programAccount.publicKey,
    data: Buffer.from(data),
  })

  const tx = new Transaction().add(ix)
  let signature
  try {
    signature = await sendAndConfirmTransaction(connection, tx, [feePayer])
  } catch (error) {
    console.log("send error:", await (error as SendTransactionError).getLogs(connection))
    return
  }
  console.log("signature:", signature)

  const transaction = await connection.getParsedTransaction(signature, {commitment: "confirmed"})
  console.log("transaction info:", JSON.stringify(transaction, undefined, 2))
}

main()
