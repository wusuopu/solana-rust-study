// 转账操作
import { connection, feePayer, mintAccount } from "./common.ts";
import {
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58"



async function main() {
  // node transfer.ts [<sourceSerectKey> <destinationPubkey> <amount>]
  let sourceAccount = feePayer
  let destinationAccount: Keypair|undefined = Keypair.generate()
  let destinationPubkey = destinationAccount.publicKey
  let amount = BigInt(20e6)

  if (process.argv.length === 5) {
    let sourceSecretKey = process.argv[2]
    sourceAccount = Keypair.fromSecretKey(bs58.decode(sourceSecretKey))
    destinationAccount = undefined
    destinationPubkey = new PublicKey(process.argv[3])

    amount = BigInt(Number(process.argv[4]) * 1e6)
  }

  // 收款账户
  const destinationTokenAccount = getAssociatedTokenAddressSync(
    mintAccount.publicKey,
    destinationPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  const sourceTokenAccount = getAssociatedTokenAddressSync(
    mintAccount.publicKey,
    sourceAccount.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  let items: TransactionInstruction[] = []
  if (!await connection.getAccountInfo(destinationTokenAccount)) {
    // 创建收款账户
    const createAssociatedTokenAccountIx = createAssociatedTokenAccountIdempotentInstruction(
      sourceAccount.publicKey,
      destinationTokenAccount,
      destinationPubkey,
      mintAccount.publicKey,
    )
    items.push(createAssociatedTokenAccountIx)
  }

  const transferIx = await createTransferInstruction(
    sourceTokenAccount,
    destinationTokenAccount,
    sourceAccount.publicKey,
    amount,
  )
  items.push(transferIx)

  const transaction = new Transaction().add(...items)

  console.log(`try to tranfer from ${sourceAccount.publicKey.toBase58()} to ${destinationPubkey.toBase58()}`)
  if (destinationAccount) {
    console.log(`Destination SecretKey: ${bs58.encode(destinationAccount.secretKey)}`)
  }

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [sourceAccount],
  )
  
  console.log("✅ Mint Address:", mintAccount.publicKey.toBase58());
  console.log("✅ Source ATA Address:", sourceTokenAccount.toBase58());
  console.log("✅ Destination Account:", destinationPubkey.toBase58());
  console.log("✅ Destination ATA Address:", destinationTokenAccount.toBase58());
  console.log("✅ Transaction Signature:", signature);
}
main()