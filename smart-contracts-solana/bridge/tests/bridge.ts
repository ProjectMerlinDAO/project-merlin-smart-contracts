import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Bridge } from "../target/types/bridge";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo, 
  getAccount,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { expect } from 'chai';

describe("bridge", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Bridge as Program<Bridge>;
  
  // Test accounts
  const authority = (provider.wallet as any).payer;
  const feeRecipient = Keypair.generate();
  const offchainProcessor = Keypair.generate();
  const user = Keypair.generate();
  let tokenMint: PublicKey;
  let globalConfig: PublicKey;
  let globalConfigBump: number;
  
  // Token accounts
  let userTokenAccount: PublicKey;
  let bridgeTokenAccount: PublicKey;
  let feeRecipientTokenAccount: PublicKey;
  
  // Bridge parameters
  const transferFeeBasisPoints = 100; // 1%
  const operationFee = 10_000_000; // 0.01 tokens (assuming 6 decimals)
  const testAmount = 100_000_000; // 0.1 tokens

  before(async () => {
    // Find PDA for global config
    const [_globalConfig, _globalConfigBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_config")],
      program.programId
    );
    globalConfig = _globalConfig;
    globalConfigBump = _globalConfigBump;
    
    // Fund accounts
    const accounts = [user.publicKey, feeRecipient.publicKey, offchainProcessor.publicKey];
    for (const account of accounts) {
      const fundTx = await provider.connection.requestAirdrop(
        account, 
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(fundTx);
    }
  });

  beforeEach(async () => {
    // Try to close any existing global config account
    try {
      await program.methods
        .close()
        .accounts({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();
    } catch (e) {
      // Ignore errors if account doesn't exist
    }

    // Create a new token mint for testing
    tokenMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,  // Set authority as initial mint authority
      null,
      6 // decimals
    );

    // Create token accounts
    userTokenAccount = (await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority,
      tokenMint,
      user.publicKey
    )).address;

    bridgeTokenAccount = (await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority,
      tokenMint,
      globalConfig,
      true  // allowOwnerOffCurve
    )).address;

    feeRecipientTokenAccount = (await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority,
      tokenMint,
      feeRecipient.publicKey
    )).address;

    // Mint some tokens to user for testing
    await mintTo(
      provider.connection,
      authority,
      tokenMint,
      userTokenAccount,
      authority,
      testAmount * 10  // Mint enough for multiple tests
    );
  });

  it("Initializes the bridge", async () => {
    const tx = await program.methods
      .initialize(
        transferFeeBasisPoints,
        new anchor.BN(operationFee)
      )
      .accounts({
        tokenMint: tokenMint,
        authority: authority.publicKey,
        feeRecipient: feeRecipient.publicKey,
        offchainProcessor: offchainProcessor.publicKey,
      })
      .rpc();
      
    console.log("Initialize transaction signature:", tx);
    
    // Verify the state was initialized correctly
    const configAccount = await program.account.globalConfig.fetch(globalConfig);
    expect(configAccount.tokenMint.toBase58()).to.equal(tokenMint.toBase58());
    expect(configAccount.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(configAccount.feeRecipient.toBase58()).to.equal(feeRecipient.publicKey.toBase58());
    expect(configAccount.transferFeeBasisPoints).to.equal(transferFeeBasisPoints);
    expect(configAccount.operationFee.toString()).to.equal(operationFee.toString());
    expect(configAccount.offchainProcessor.toBase58()).to.equal(offchainProcessor.publicKey.toBase58());
    expect(configAccount.paused).to.be.false;
  });

  it("Receives assets and burns them", async () => {
    // First initialize the bridge
    await program.methods
      .initialize(transferFeeBasisPoints, new anchor.BN(operationFee))
      .accounts({
        tokenMint: tokenMint,
        authority: authority.publicKey,
        feeRecipient: feeRecipient.publicKey,
        offchainProcessor: offchainProcessor.publicKey,
      })
      .signers([authority])
      .rpc();

    // Calculate expected fees
    const feeAmount = Math.floor(testAmount * (transferFeeBasisPoints / 10000)) + operationFee;
    const amountAfterFee = testAmount - feeAmount;

    // Find the bridge state PDA for this specific request
    const destinationChain = "ethereum";
    const destinationAddress = "0x1234567890123456789012345678901234567890";
    const [bridgeState] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bridge_state"),
        user.publicKey.toBuffer(),
        Buffer.from(destinationChain),
        Buffer.from(destinationAddress),
      ],
      program.programId
    );

    // Receive assets
    const tx = await program.methods
      .receiveAsset(
        new anchor.BN(testAmount),
        destinationChain,
        destinationAddress
      )
      .accounts({
        tokenMint: tokenMint,
        userTokenAccount: userTokenAccount,
        bridgeTokenAccount: bridgeTokenAccount,
        user: user.publicKey,
      })
      .signers([user])
      .rpc();

    console.log("Receive asset transaction signature:", tx);

    // Verify the token balances
    const bridgeTokenAccountInfo = await getAccount(provider.connection, bridgeTokenAccount);
    expect(bridgeTokenAccountInfo.amount.toString()).to.equal(feeAmount.toString());

    // Verify the bridge state
    const bridgeStateAccount = await program.account.bridgeState.fetch(bridgeState);
    expect(bridgeStateAccount.user.toBase58()).to.equal(user.publicKey.toBase58());
    expect(bridgeStateAccount.amount.toString()).to.equal(testAmount.toString());
    expect(bridgeStateAccount.destinationChain).to.equal(destinationChain);
    expect(bridgeStateAccount.destinationAddress).to.equal(destinationAddress);
    expect(bridgeStateAccount.status).to.deep.equal({ pending: {} });
  });

  /*
  it("Mints assets to recipient", async () => {
    // First initialize the bridge if not already initialized
    try {
      await program.methods
        .initialize(transferFeeBasisPoints, new anchor.BN(operationFee))
        .accounts({
          authority: authority.publicKey,
        })
        .rpc();
    } catch (e) {
      // Ignore if already initialized
    }

    const recipient = Keypair.generate();
    const recipientTokenAccount = (await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority,
      tokenMint,
      recipient.publicKey
    )).address;

    const mintAmount = new anchor.BN(testAmount);

    const tx = await program.methods
      .mintAsset(mintAmount)
      .accounts({
        tokenMint: tokenMint,
        recipientTokenAccount: recipientTokenAccount,
        offchainProcessor: offchainProcessor.publicKey,
        recipient: recipient.publicKey,
      })
      .signers([offchainProcessor])
      .rpc();

    console.log("Mint asset transaction signature:", tx);

    // Verify the recipient received the tokens
    const recipientTokenAccountInfo = await getAccount(provider.connection, recipientTokenAccount);
    expect(recipientTokenAccountInfo.amount.toString()).to.equal(mintAmount.toString());
  });

  it("Updates bridge configuration", async () => {
    // First initialize the bridge if not already initialized
    try {
      await program.methods
        .initialize(transferFeeBasisPoints, new anchor.BN(operationFee))
        .accounts({
          authority: authority.publicKey,
        })
        .rpc();
    } catch (e) {
      // Ignore if already initialized
    }

    const newTransferFee = 200; // 2%
    const newOperationFee = new anchor.BN(20_000_000);
    const newOffchainProcessor = Keypair.generate();

    // Update transfer fee
    await program.methods
      .updateTransferFee(newTransferFee)
      .accounts({
        authority: authority.publicKey,
      })
      .rpc();

    // Update operation fee
    await program.methods
      .updateOperationFee(newOperationFee)
      .accounts({
        authority: authority.publicKey,
      })
      .rpc();

    // Update offchain processor
    await program.methods
      .changeOffchainProcessor(newOffchainProcessor.publicKey)
      .accounts({
        authority: authority.publicKey,
      })
      .rpc();

    // Verify the updates
    const bridgeStateAccount = await program.account.bridgeState.fetch(bridgeState);
    expect(bridgeStateAccount.transferFeeBasisPoints).to.equal(newTransferFee);
    expect(bridgeStateAccount.operationFee.toString()).to.equal(newOperationFee.toString());
    expect(bridgeStateAccount.offchainProcessor.toBase58()).to.equal(newOffchainProcessor.publicKey.toBase58());
  });

  it("Withdraws fees", async () => {
    // First initialize the bridge if not already initialized
    try {
      await program.methods
        .initialize(transferFeeBasisPoints, new anchor.BN(operationFee))
        .accounts({
          tokenMint: tokenMint,
          authority: authority.publicKey,
          feeRecipient: feeRecipient.publicKey,
          offchainProcessor: offchainProcessor.publicKey,
        })
        .rpc();
    } catch (e) {
      // Ignore if already initialized
    }

    // First receive some assets to generate fees
    await program.methods
      .receiveAsset(
        new anchor.BN(testAmount),
        "ethereum",
        "0x1234567890123456789012345678901234567890"
      )
      .accounts({
        tokenMint: tokenMint,
        userTokenAccount: userTokenAccount,
        bridgeTokenAccount: bridgeTokenAccount,
        user: user.publicKey,
      })
      .signers([user])
      .rpc();

    // Get bridge token account balance before withdrawal
    const bridgeBalanceBefore = (await getAccount(provider.connection, bridgeTokenAccount)).amount;

    // Withdraw fees
    const tx = await program.methods
      .withdrawFees()
      .accounts({
        bridgeTokenAccount: bridgeTokenAccount,
        feeRecipientTokenAccount: feeRecipientTokenAccount,
        authority: authority.publicKey,
      })
      .rpc();

    console.log("Withdraw fees transaction signature:", tx);

    // Verify the fees were transferred
    const feeRecipientTokenAccountInfo = await getAccount(provider.connection, feeRecipientTokenAccount);
    expect(feeRecipientTokenAccountInfo.amount.toString()).to.equal(bridgeBalanceBefore.toString());

    const bridgeTokenAccountInfo = await getAccount(provider.connection, bridgeTokenAccount);
    expect(bridgeTokenAccountInfo.amount.toString()).to.equal("0");
  });

  it("Pauses and unpauses the bridge", async () => {
    // First initialize the bridge if not already initialized
    try {
      await program.methods
        .initialize(transferFeeBasisPoints, new anchor.BN(operationFee))
        .accounts({
          tokenMint: tokenMint,
          authority: authority.publicKey,
          feeRecipient: feeRecipient.publicKey,
          offchainProcessor: offchainProcessor.publicKey,
        })
        .rpc();
    } catch (e) {
      // Ignore if already initialized
    }

    // Pause the bridge
    await program.methods
      .setPaused(true)
      .accounts({
        authority: authority.publicKey,
      })
      .rpc();

    // Verify bridge is paused
    let bridgeStateAccount = await program.account.bridgeState.fetch(bridgeState);
    expect(bridgeStateAccount.paused).to.be.true;

    // Try to receive assets while paused (should fail)
    try {
      await program.methods
        .receiveAsset(
          new anchor.BN(testAmount),
          "ethereum",
          "0x1234567890123456789012345678901234567890"
        )
        .accounts({
          tokenMint: tokenMint,
          userTokenAccount: userTokenAccount,
          bridgeTokenAccount: bridgeTokenAccount,
          user: user.publicKey,
        })
        .signers([user])
        .rpc();
      expect.fail("Should not be able to receive assets while bridge is paused");
    } catch (e) {
      expect(e.toString()).to.include("The bridge is paused");
    }

    // Unpause the bridge
    await program.methods
      .setPaused(false)
      .accounts({
        authority: authority.publicKey,
      })
      .rpc();

    // Verify bridge is unpaused
    bridgeStateAccount = await program.account.bridgeState.fetch(bridgeState);
    expect(bridgeStateAccount.paused).to.be.false;
  }); */
});
