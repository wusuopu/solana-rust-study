import dotenv from "dotenv"
import {
  Keypair,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  Connection,
  PublicKey,
  SendTransactionError,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js"
import * as borsh from 'borsh';
import programSecret from "../target/deploy/pinocchio_vault-keypair.json" with { type: 'json' }


dotenv.config();

const connection = new Connection(process.env.SOLANA_RPC || "http://127.0.0.1:8899", "confirmed")
const wallet = Keypair.generate()

const programAccount = Keypair.fromSecretKey(new Uint8Array(programSecret))
const programId = programAccount.publicKey

async function requestAirdrop() {
  let signature = await connection.requestAirdrop(wallet.publicKey, 10 * LAMPORTS_PER_SOL)
  console.log(`airdrop 10 to ${wallet.publicKey.toBase58()}`)
}

async function deposit() {
  const [vault, _] = PublicKey.findProgramAddressSync([Buffer.from("vault"), wallet.publicKey.toBuffer()], programId)

  let amount = borsh.serialize("u64", 3 * LAMPORTS_PER_SOL)
  let data = new Uint8Array(1 + amount.length)
  data.set(new Uint8Array([0]), 0)   //
  data.set(amount, 1)

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
    ],
    programId,
    data: Buffer.from(data),
  })

  const tx = new Transaction().add(ix)
  let signature
  try {
    signature = await sendAndConfirmTransaction(connection, tx, [wallet])
  } catch (error) {
    console.log("send error:", await (error as SendTransactionError).getLogs(connection))
    return
  }
  console.log("deposit signature:", signature)

  const vaultAccount = await connection.getAccountInfo(vault)
  console.log(`vaultAccount lamports: ${vaultAccount?.lamports}`)
}

async function withdraw() {
  const [vault, _] = PublicKey.findProgramAddressSync([Buffer.from("vault"), wallet.publicKey.toBuffer()], programId)

  let data = new Uint8Array([1])

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
    ],
    programId,
    data: Buffer.from(data),
  })

  const tx = new Transaction().add(ix)
  let signature
  try {
    signature = await sendAndConfirmTransaction(connection, tx, [wallet])
  } catch (error) {
    console.log("send error:", await (error as SendTransactionError).getLogs(connection))
    return
  }
  console.log("withdraw signature:", signature)

  const vaultAccount = await connection.getAccountInfo(vault)
  console.log(`vaultAccount lamports: ${vaultAccount?.lamports}`)
}


async function main() {
  await requestAirdrop()

  await deposit()

  await withdraw()
}
main()