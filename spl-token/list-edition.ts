// 列出一个 Master Edition NFT 的所有副本（Editions）
import { connection, nftMintAccount } from "./common.ts";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import {
  fetchMasterEditionFromSeeds,
  fetchMetadataFromSeeds,
  findMasterEditionPda,
  findMetadataPda,
  mplTokenMetadata,
  Key,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  publicKey,
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import bs58 from "bs58";

// Edition 账户数据结构（简化）
interface EditionAccount {
  key: number; // 应该是 Key.EditionV1 (1)
  parent: string; // Master Edition mint
  edition: bigint; // Edition number
}

async function main() {
  console.log("📋 列出 Master Edition NFT 的所有副本...\n");

  // 初始化 Umi
  const umi = createUmi(connection.rpcEndpoint);
  umi.use(web3JsEddsa());
  umi.use(mplTokenMetadata());

  // Master Edition NFT mint
  const masterMint = publicKey(nftMintAccount.publicKey.toBase58());
  const masterEditionPda = findMasterEditionPda(umi, { mint: masterMint });

  // 获取 Master Edition 信息
  let masterEditionData;
  try {
    masterEditionData = await fetchMasterEditionFromSeeds(umi, { mint: masterMint });
    const masterMetadata = await fetchMetadataFromSeeds(umi, { mint: masterMint });

    console.log("📊 Master Edition 信息:");
    console.log("   Master Mint:", nftMintAccount.publicKey.toBase58());
    console.log("   Master Edition PDA:", masterEditionPda[0].toString());
    console.log("   Name:", masterMetadata.name);
    console.log("   Symbol:", masterMetadata.symbol);

    const maxSupply = masterEditionData.maxSupply?.__option === 'Some'
      ? masterEditionData.maxSupply.value
      : null;
    const currentSupply = masterEditionData.supply;

    console.log("   Current Supply:", currentSupply.toString());
    console.log("   Max Supply:", maxSupply?.toString() ?? "Unlimited");
    console.log();

    if (currentSupply === 0n) {
      console.log("✅ 还没有打印任何副本");
      return;
    }

    console.log(`📦 正在获取 ${currentSupply} 个副本的信息...\n`);

  } catch (error) {
    console.error("❌ 无法获取 Master Edition 信息");
    console.error("   请确保该 NFT 已创建 Master Edition");
    throw error;
  }

  // 使用 getProgramAccounts 查询所有属于这个 Master Edition 的 Editions
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const currentSupply = masterEditionData.supply;

  try {
    // 获取所有 Metadata 程序的账户
    // 筛选条件：查找所有 Edition (key = 1) 账户
    const allAccounts = await connection.getProgramAccounts(
      TOKEN_METADATA_PROGRAM_ID,
      {
        filters: [
          // 第一个字节是 key，我们要找 key = 1 (EditionV1)
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(Buffer.from([Key.EditionV1])),
            },
          },
        ],
      }
    );

    const editions = [];

    // 解析每个账户，检查是否属于我们的 Master Edition
    for (const account of allAccounts) {
      try {
        const data = account.account.data;

        // 验证这是一个 Edition 账户 (key = 1)
        const key = data[0];

        if (key !== Key.EditionV1) {
          continue;
        }

        // 读取 parent (master edition PDA, not mint)
        const parent = new PublicKey(data.slice(1, 33));

        // 检查是否属于我们的 Master Edition
        // 注意：parent 是 Master Edition PDA，不是 Master Mint
        const masterEditionPdaPublicKey = new PublicKey(masterEditionPda[0].toString());
        if (parent.equals(masterEditionPdaPublicKey)) {
          // 读取 edition number (u64 little-endian)
          const editionNumber = data.readBigUInt64LE(33);

          // Edition PDA 就是当前账户地址
          const editionPda = account.pubkey;

          editions.push({
            editionNumber: editionNumber.toString(),
            editionPda: editionPda.toBase58(),
            parent: parent.toBase58(),
          });
        }
      } catch (error) {
        // 解析失败，跳过
        console.log(`      ❌ 解析失败: ${error.message}`);
        continue;
      }
    }

    // 按 edition number 排序
    editions.sort((a, b) => Number(a.editionNumber) - Number(b.editionNumber));

    const accounts = editions;

    console.log(`✅ 找到 ${editions.length} 个副本\n`);

    if (editions.length === 0) {
      console.log("⚠️  没有找到任何副本");
      console.log("   Master Edition 显示 supply = " + currentSupply.toString());
      console.log("   但未能通过 Edition Marker 找到对应的副本");
      return;
    }

    // 显示所有 Edition
    console.log("\n" + "=".repeat(80));
    console.log("📋 所有副本列表:");
    console.log("=".repeat(80));

    for (const edition of editions) {
      console.log(`\n   📦 Edition #${edition.editionNumber}`);
      console.log(`      ├─ Edition PDA: ${edition.editionPda}`);
      console.log(`      └─ Parent (Master): ${edition.parent}`);

      // 尝试通过浏览器链接显示
      console.log(`      🔗 Explorer: https://explorer.solana.com/address/${edition.editionPda}?cluster=custom`);
    }

    console.log("\n" + "=".repeat(80));
    console.log(`✅ 总计 ${editions.length} 个副本`);
    console.log("=".repeat(80));

    // 提示
    console.log("\n💡 说明:");
    console.log("   - Edition PDA：Edition 账户的唯一地址");
    console.log("   - Edition Number：副本的编号 (#1, #2, #3...)");
    console.log("   - Parent：指向 Master Edition PDA");
    console.log("\n📝 关于 Edition Mint 地址:");
    console.log("   - Edition Mint 是每个副本的唯一 Token Mint");
    console.log("   - Edition PDA 是从 [\"metadata\", program_id, edition_mint, \"edition\"] 派生");
    console.log("   - 由于 PDA 派生是单向的，无法直接从 Edition PDA 反推 edition_mint");
    console.log("   - 建议：在打印 Edition 时记录 Edition Mint 地址以便后续查询");

  } catch (error) {
    console.error("❌ 获取 Edition 列表失败:", error);
    throw error;
  }
}

main().catch(console.error);