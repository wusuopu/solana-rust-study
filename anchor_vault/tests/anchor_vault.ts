import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorVault } from "../target/types/anchor_vault";
import assert from "assert";

describe("anchor_vault", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const program = anchor.workspace.anchorVault as Program<AnchorVault>;

  const wallet = Keypair.generate()

  before(async () => {
    let signature = await provider.connection.requestAirdrop(wallet.publicKey, 100 * LAMPORTS_PER_SOL)
    await provider.connection.confirmTransaction(signature)
    console.log(`airdrop 100 to ${wallet.publicKey.toBase58()}`)
  })

  it("test deposit", async () => {
    // Add your test here.
    const [vault, _] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), wallet.publicKey.toBuffer()],
      program.programId
    )
    const tx = await program.methods.deposit(new anchor.BN(1000000000)).accounts({
      vault,
      signer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([wallet])
    .rpc();
    console.log("Deposit transaction signature", tx);

    const balance = await provider.connection.getBalance(vault)
    assert.equal(balance, 1000000000);
    console.log("Vault balance:", balance);
  });

  it("test withdraw", async () => {
    const [vault, _] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), wallet.publicKey.toBuffer()],
      program.programId
    )
    const tx = await program.methods.withdraw().accounts({
      vault,
      signer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([wallet])
    .rpc();
    console.log("Withdraw transaction signature", tx);

    const balance = await provider.connection.getBalance(vault)
    assert.equal(balance, 0);
    console.log("Vault balance:", balance);
  });
});
