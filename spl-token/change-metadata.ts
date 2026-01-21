// 修改 SPL Token 的 metadata
import { feePayer, mintAccount } from "./common.ts";
import {
  updateV1,
  createV1,
  fetchMetadataFromSeeds,
  mplTokenMetadata,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import type { Metadata, DataArgs } from '@metaplex-foundation/mpl-token-metadata';
import {
  percentAmount,
  signerIdentity,
  createSignerFromKeypair,
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { web3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js';
import bs58 from "bs58";

// 1. Initialize Umi and connect to an RPC (e.g., devnet, mainnet-beta)
const umi = createUmi(process.env.SOLANA_RPC || "http://127.0.0.1:8899");
// Add necessary plugins/adapters if required
umi.use(web3JsEddsa());

// 2. Set the update authority as the signer
const userWallet = umi.eddsa.createKeypairFromSecretKey(feePayer.secretKey)
const userWalletSigner = createSignerFromKeypair(umi, userWallet)
umi.use(signerIdentity(userWalletSigner))
umi.use(mplTokenMetadata())


// 3. Define the mint address of the token to be updated
const mint = createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSecretKey(mintAccount.secretKey))
console.log('mint account:', mint.publicKey)

async function main() {
  let initialMetadata: Metadata|undefined = undefined
  try {
    // 4. Fetch the existing metadata to ensure you are only updating specific fields
    initialMetadata = await fetchMetadataFromSeeds(umi, { mint: mint.publicKey });
    console.log('Old Metadata:', initialMetadata)
    console.log('---------------------------------------------')
  } catch (error) {
    // console.error('Error fetch metadata:', error);
  }
  try {
    // 5. Define the updated data
    const updatedData: DataArgs = {
      ...initialMetadata, // Keep existing fields
      name: "Demo SPL Token",
      symbol: "DST-02",
      uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
      // sellerFeeBasisPoints: percentAmount(25, 2), // Update seller fees (e.g., to 0.25%)
    };

    // 6. Send the update instruction
    let tx
    if (!initialMetadata) {
      tx = await createV1(umi, {
        mint: mint.publicKey,
        authority: userWalletSigner,
        isMutable: true,
        name: updatedData.name,
        symbol: updatedData.symbol,
        uri: updatedData.uri,
        sellerFeeBasisPoints: percentAmount(0, 2),
        creators: null,
        tokenStandard: TokenStandard.Fungible,
      }).sendAndConfirm(umi);
    } else {
      tx = await updateV1(umi, {
        authority: userWalletSigner,
        mint: mint.publicKey,
        data: updatedData as DataArgs,
        // You can also change the update authority itself by providing a `newUpdateAuthority`
        // newUpdateAuthority: newAuthority.publicKey,
      }).sendAndConfirm(umi);
    }

    console.log('Token metadata updated successfully:', bs58.encode(tx.signature));
  } catch (error) {
    console.error('Error updating metadata:', error);
  }
}
main()

