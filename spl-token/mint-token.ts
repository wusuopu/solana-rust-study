import { connection, feePayer, mintAccount } from "./common.ts";
import {
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import {
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToCheckedInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";


async function main() {
  // 租赁豁免最小费用
  const mintRent = await getMinimumBalanceForRentExemptMint(connection)
  const decimals = 6

  // 1. 创建 Mint Account
  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: feePayer.publicKey,
    newAccountPubkey: mintAccount.publicKey,
    space: MINT_SIZE,
    lamports: mintRent,
    programId: TOKEN_PROGRAM_ID,
  })
  // 2. 初始化 Mint Account
  const initMintIx = createInitializeMint2Instruction(
    mintAccount.publicKey,
    decimals,    // decimals； 代币最小精度
    feePayer.publicKey,   // mint authority
    feePayer.publicKey,   // freeze authority
    TOKEN_PROGRAM_ID,
  )

  // 3. 创建关联 associated token account
  const associatedTokenAccount = getAssociatedTokenAddressSync(
    mintAccount.publicKey,
    feePayer.publicKey,
    false, // allow owner off-curve
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )
  const createAssociatedTokenAccountIx = createAssociatedTokenAccountInstruction(
    feePayer.publicKey,
    associatedTokenAccount,
    feePayer.publicKey,
    mintAccount.publicKey,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  // 发币1W
  const mintAmount = BigInt(10000e6)
  const mintToCheckIx = createMintToCheckedInstruction(
    mintAccount.publicKey,
    associatedTokenAccount,
    feePayer.publicKey,
    mintAmount,
    decimals,
  )

  const transaction = new Transaction()
    .add(
      createAccountIx,
      initMintIx,
      createAssociatedTokenAccountIx,
      mintToCheckIx,
    )

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [feePayer, mintAccount],
  )

  console.log("✅ Mint Address:", mintAccount.publicKey.toBase58());
  console.log("✅ ATA Address:", associatedTokenAccount.toBase58());
  console.log("✅ Transaction Signature:", signature);
}
main()