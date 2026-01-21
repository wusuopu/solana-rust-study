// 销币 - 只能销毁 owner 自己 ATA 账户中的代币
import { connection, feePayer, mintAccount } from "./common.ts";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createBurnCheckedInstruction,
  createBurnInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Keypair,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import bs58 from "bs58"

async function main() {
  // node burn.ts <amount>
  let sourceSecretKey = process.argv[2]
  let sourceAccount = Keypair.fromSecretKey(bs58.decode(sourceSecretKey))

  const amount = BigInt(Number(process.argv[3]) * 1e6)
  if (!amount) {
    console.log("请输入正确的参数")
    return
  }

  const associatedTokenAccount = getAssociatedTokenAddressSync(
    mintAccount.publicKey,
    sourceAccount.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  if (!await connection.getAccountInfo(associatedTokenAccount)) {
    console.log("该 ATA 账户不存在")
    return
  }

  const burnIx = createBurnInstruction(
    associatedTokenAccount,
    mintAccount.publicKey,
    sourceAccount.publicKey,
    amount,
  )

  const transaction = new Transaction().add(burnIx)
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [sourceAccount],
  )

  console.log(`✅ Burn ${amount} tokens from ${sourceAccount.publicKey.toBase58()}(${associatedTokenAccount}) in Mint ${mintAccount.publicKey.toBase58()}`)
  console.log("✅ Transaction Signature:", signature);
}
main()