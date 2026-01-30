// 为创建了 Master Edition 的 NFT 创建副本（Edition）
import { connection, feePayer, nftMintAccount } from "./common.ts";
import {
  fetchMasterEditionFromSeeds,
  findMetadataPda,
  findMasterEditionPda,
  mplTokenMetadata,
  printV1,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  signerIdentity,
  createSignerFromKeypair,
  publicKey,
  generateSigner,
} from '@metaplex-foundation/umi';
import type {
  Umi,
  KeypairSigner,
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import {
  Keypair,
} from "@solana/web3.js"
import bs58 from "bs58";


async function main() {
  console.log("🎨 开始为 Master Edition NFT 创建副本...\n");

  // 初始化 Umi
  const umi = createUmi(connection.rpcEndpoint);
  umi.use(web3JsEddsa());

  // 设置签名者（Master Edition 持有者，支付费用）
  const userWallet = umi.eddsa.createKeypairFromSecretKey(feePayer.secretKey);
  const userWalletSigner = createSignerFromKeypair(umi, userWallet);

  // 设置接收者（副本持有者）
  const recipientAccount = Keypair.generate()
  const recipientWallet = umi.eddsa.createKeypairFromSecretKey(recipientAccount.secretKey);
  const recipientWalletSigner = createSignerFromKeypair(umi, recipientWallet);

  umi.use(signerIdentity(userWalletSigner));
  umi.use(mplTokenMetadata());

  console.log("📋 配置信息:");
  console.log("   Master Edition 持有者:", userWalletSigner.publicKey.toString());
  console.log("   Edition 接收者:", recipientAccount.publicKey.toString());
  console.log();

  // Master Edition NFT mint
  const masterMint = publicKey(nftMintAccount.publicKey.toBase58());
  const masterMetadata = findMetadataPda(umi, { mint: masterMint });
  const masterEditionPda = findMasterEditionPda(umi, { mint: masterMint });

  // 获取 Master Edition 信息
  let masterEditionData;
  try {
    masterEditionData = await fetchMasterEditionFromSeeds(umi, { mint: masterMint });
  } catch (error) {
    console.error("❌ 无法获取 Master Edition 信息");
    console.error("   请确保已经为该 NFT 创建了 Master Edition");
    console.error("   Master Mint:", nftMintAccount.publicKey.toBase58());
    throw error;
  }

  const maxSupply = masterEditionData.maxSupply?.__option === 'Some'
    ? masterEditionData.maxSupply.value
    : null;
  const currentSupply = masterEditionData.supply;

  console.log("📊 Master Edition 信息:");
  console.log("   Master Mint:", nftMintAccount.publicKey.toBase58());
  console.log("   Master Edition PDA:", masterEditionPda[0].toString());
  console.log("   Current Supply:", currentSupply.toString());
  console.log("   Max Supply:", maxSupply?.toString() ?? "Unlimited");

  // 检查是否可以继续打印
  if (maxSupply !== null && currentSupply >= maxSupply) {
    console.log("\n❌ 已达到最大供应量，无法打印更多副本");
    return;
  }

  const editionNumber = currentSupply + 1n;
  console.log("\n📝 准备打印副本 #" + editionNumber.toString());

  // ========================================
  // 使用 printV1 打印副本（Umi 会自动处理所有必要的账户创建）
  // ========================================
  console.log("\n步骤: 使用 printV1 打印副本");

  // 生成新的 edition mint
  const editionMint = generateSigner(umi);      // 每个副本是一个新的 Mint Account
  console.log("   Edition Mint:", editionMint.publicKey.toString());

  try {
    // https://developers.metaplex.com/smart-contracts/token-metadata/print
    const printTx = await printV1(umi, {
      masterTokenAccountOwner: userWalletSigner,  // Master Edition 持有者（支付费用）
      masterEditionMint: masterMint,              // Master Edition Mint Account
      editionMint: editionMint,                   // 新的 Edition Mint Account
      editionTokenAccountOwner: recipientWalletSigner.publicKey, // Edition 接收者
      // editionMintAuthority: recipientWalletSigner, // Edition Mint 权限
      editionNumber: editionNumber,
      tokenStandard: TokenStandard.NonFungible,
    }).sendAndConfirm(umi);

    console.log("✅ Edition 打印成功!");
    console.log("   Edition Number:", editionNumber.toString());
    console.log("   Edition Mint:", editionMint.publicKey.toString());
    console.log("   Edition 所有者:", recipientAccount.publicKey.toString());
    console.log("   Transaction:", bs58.encode(printTx.signature));

    // 显示更新后的 Master Edition 信息
    console.log("\n📊 更新后的 Master Edition 状态:");
    const updatedMasterEdition = await fetchMasterEditionFromSeeds(umi, { mint: masterMint });
    console.log("   Current Supply:", updatedMasterEdition.supply.toString());
    const remaining = maxSupply !== null
      ? (maxSupply - updatedMasterEdition.supply).toString()
      : "Unlimited";
    console.log("   Remaining:", remaining);

    console.log("\n" + "=".repeat(70));
    console.log("🎉 副本创建完成!");
    console.log("\n📦 NFT 所有权:");
    console.log("   1. Master Edition (原始)");
    console.log("      - Mint: " + nftMintAccount.publicKey.toBase58());
    console.log("      - 所有者: " + userWalletSigner.publicKey.toString());
    console.log("=".repeat(70));
  } catch (error) {
    console.error("❌ 打印 Edition 失败:", error);
    throw error;
  }
}

main().catch(console.error);
