// 在 Solana 链上创建一个 NFT，设置 metadata 信息，并创建 Master Edition
import { connection, feePayer, nftMintAccount } from "./common.ts";
import {
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
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
import {
  createV1,
  updateV1,
  fetchMetadataFromSeeds,
  fetchMasterEditionFromSeeds,
  findMetadataPda,
  findMasterEditionPda,
  createMasterEditionV3,
  mplTokenMetadata,
  TokenStandard,
  MPL_TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import type { Metadata, DataArgs } from '@metaplex-foundation/mpl-token-metadata';
import {
  percentAmount,
  signerIdentity,
  createSignerFromKeypair,
  createNoopSigner,
  publicKey,
} from '@metaplex-foundation/umi';
import type {
  Umi,
  KeypairSigner,
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import bs58 from "bs58";

async function createNFTAccout() {
  let info = await connection.getAccountInfo(nftMintAccount.publicKey);
  if (info) {
    console.log(`🚀 NFT Mint Account 已经存在: ${nftMintAccount.publicKey.toBase58()}`);
    return;
  }

  console.log("🚀 开始创建 NFT...\n");

  // ========================================
  // 第一步：创建 Token Mint Account（NFT 特征：decimals=0, supply=1）
  // ========================================
  console.log("📝 步骤 1: 创建 NFT Mint Account");

  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  const decimals = 0; // NFT 的 decimals 必须为 0

  // 1. 创建 Mint Account
  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: feePayer.publicKey,
    newAccountPubkey: nftMintAccount.publicKey,
    space: MINT_SIZE,
    lamports: mintRent,
    programId: TOKEN_PROGRAM_ID,
  });

  // 2. 初始化 Mint Account
  const initMintIx = createInitializeMint2Instruction(
    nftMintAccount.publicKey,
    decimals,                // NFT decimals 为 0
    feePayer.publicKey,      // mint authority
    feePayer.publicKey,      // freeze authority
    TOKEN_PROGRAM_ID,
  );

  // 3. 创建关联 token account
  const associatedTokenAccount = getAssociatedTokenAddressSync(
    nftMintAccount.publicKey,
    feePayer.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const createAssociatedTokenAccountIx = createAssociatedTokenAccountInstruction(
    feePayer.publicKey,
    associatedTokenAccount,
    feePayer.publicKey,
    nftMintAccount.publicKey,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  // 4. 铸造 1 个 NFT
  const mintAmount = BigInt(1); // NFT 的供应量为 1
  const mintToCheckIx = createMintToCheckedInstruction(
    nftMintAccount.publicKey,
    associatedTokenAccount,
    feePayer.publicKey,
    mintAmount,
    decimals,
  );

  // 发送交易
  const transaction = new Transaction().add(
    createAccountIx,
    initMintIx,
    createAssociatedTokenAccountIx,
    mintToCheckIx,
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [feePayer, nftMintAccount],
  );

  console.log("✅ NFT Mint 创建成功!");
  console.log("   Mint Address:", nftMintAccount.publicKey.toBase58());
  console.log("   ATA Address:", associatedTokenAccount.toBase58());
  console.log("   Transaction:", signature);
  console.log();
}

async function updateMetadata(umi: Umi, nftMint: KeypairSigner, walletSigner: KeypairSigner) {
  // ========================================
  // 第二步：使用 Metaplex 创建 NFT Metadata
  // ========================================
  console.log("📝 步骤 2: 创建 NFT Metadata");

  let initialMetadata: Metadata|undefined = undefined
  try {
    // 4. Fetch the existing metadata to ensure you are only updating specific fields
    initialMetadata = await fetchMetadataFromSeeds(umi, { mint: nftMint.publicKey });
  } catch (error) {
    // console.error('Error fetch metadata:', error);
  }
  // 创建 NFT metadata
  const metadataData = {
    ...initialMetadata,
    name: "Long NFT",
    symbol: "LNFT",
    uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
  };

  try {
    let tx
    if (!initialMetadata) {
      // 不指定 tokenStandard，让 createMasterEditionV3 来确定
      // 或者使用 FungibleAsset，稍后通过 createMasterEditionV3 转换为 NFT
      tx = await createV1(umi, {
        mint: nftMint.publicKey,
        authority: walletSigner,
        name: metadataData.name,
        symbol: metadataData.symbol,
        uri: metadataData.uri,
        sellerFeeBasisPoints: percentAmount(0, 2), // 0.00% 版税
        decimals: 0,
        tokenStandard: TokenStandard.FungibleAsset, // 使用 FungibleAsset，避免自动创建 Master Edition
        isMutable: true,
      }).sendAndConfirm(umi);
    } else {
      tx = await updateV1(umi, {
        authority: walletSigner,
        mint: nftMint.publicKey,
        data: metadataData as DataArgs,
      }).sendAndConfirm(umi);
    }

    let metadataPda = findMetadataPda(umi, {mint: nftMint.publicKey})
    console.log(`✅ NFT Metadata 创建成功!: ${metadataPda[0].toString()}`);
    console.log("   Name:", metadataData.name);
    console.log("   Symbol:", metadataData.symbol);
    console.log("   Transaction:", bs58.encode(tx.signature));
    console.log();
  } catch (error) {
    console.error("❌ 创建 Metadata 失败:", error);
    throw error;
  }
}

async function createMasterEdition(umi: Umi, nftMint: KeypairSigner, walletSigner: KeypairSigner) {
  // ========================================
  // 第三步：创建 Master Edition (max_supply = 100)
  // ========================================
  let metadataPda = findMetadataPda(umi, {mint: nftMint.publicKey})
  let masterEditionPda = findMasterEditionPda(umi, {mint: nftMint.publicKey})
  console.log(`📝 步骤 3: 创建 Master Edition ${masterEditionPda[0].toString()}`);

  // 检查 Master Edition 是否已存在
  try {
    const masterEdition = await fetchMasterEditionFromSeeds(umi, {mint: nftMint.publicKey})
    const maxSupplyValue = masterEdition.maxSupply?.__option === 'Some'
      ? masterEdition.maxSupply.value.toString()
      : "Unlimited";
    console.log("✅ Master Edition 已存在");
    console.log("   Max Supply:", maxSupplyValue);
    return;
  } catch (error) {
    // Master Edition 不存在，继续创建
  }

  try {

    const masterEditionTx = await createMasterEditionV3(umi, {
      edition: masterEditionPda,
      mint: nftMint.publicKey,
      updateAuthority: walletSigner,
      mintAuthority: walletSigner,
      payer: walletSigner,
      metadata: metadataPda,
      maxSupply: 50, // null - 无限供应； 0 - 唯一主版，不可创建副本； 具体数字 - 限量副本
    }).sendAndConfirm(umi);

    const masterEdition = await fetchMasterEditionFromSeeds(umi, {mint: nftMint.publicKey})

    console.log(`✅ Master Edition 创建成功!: ${masterEditionPda[0].toString()}`);
    console.log(`   Max Supply: ${masterEdition.maxSupply?.value}`);
    console.log("   Transaction:", bs58.encode(masterEditionTx.signature));
    console.log();
  } catch (error) {
    console.error("❌ 创建 Master Edition 失败:", error);
    throw error;
  }
}

async function main() {
  await createNFTAccout()

  // 初始化 Umi
  const umi = createUmi(connection.rpcEndpoint);
  umi.use(web3JsEddsa());

  // 设置签名者
  const userWallet = umi.eddsa.createKeypairFromSecretKey(feePayer.secretKey);
  const userWalletSigner = createSignerFromKeypair(umi, userWallet);
  umi.use(signerIdentity(userWalletSigner));
  umi.use(mplTokenMetadata());

  // 创建 mint signer
  const nftMint = createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSecretKey(nftMintAccount.secretKey));

  await updateMetadata(umi, nftMint, userWalletSigner)

  await createMasterEdition(umi, nftMint, userWalletSigner)

}

main().catch(console.error);
