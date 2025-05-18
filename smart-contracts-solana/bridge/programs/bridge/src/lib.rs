use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, Burn, MintTo};

declare_id!("vmZU1JdnRT25XyyFeoWh2bpprNWDuZAfBsbyctHzn5D");

#[program]
pub mod bridge {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        transfer_fee_basis_points: u16,
        operation_fee: u64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.global_config;
        
        config.token_mint = ctx.accounts.token_mint.key();
        config.authority = ctx.accounts.authority.key();
        config.fee_recipient = ctx.accounts.fee_recipient.key();
        config.transfer_fee_basis_points = transfer_fee_basis_points;
        config.operation_fee = operation_fee;
        config.offchain_processor = ctx.accounts.offchain_processor.key();
        config.paused = false;

        // Validate fees
        require!(transfer_fee_basis_points <= 1000, BridgeError::FeeTooHigh); // Max 10%

        Ok(())
    }

    pub fn receive_asset(
        ctx: Context<ReceiveAsset>,
        amount: u64,
        destination_chain: String,
        destination_address: String,
    ) -> Result<()> {
        require!(
            destination_chain.len() <= BridgeState::MAX_DESTINATION_LEN,
            BridgeError::InvalidDestination
        );

        let bridge_state = &mut ctx.accounts.bridge_state;
        let config = &ctx.accounts.global_config;
        
        // Calculate fees
        let fee_amount = (amount as u128)
            .checked_mul(config.transfer_fee_basis_points as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64
            + config.operation_fee;
        
        require!(fee_amount < amount, BridgeError::FeeExceedsAmount);
        
        let amount_after_fee = amount.checked_sub(fee_amount).unwrap();

        // Initialize bridge state
        bridge_state.user = ctx.accounts.user.key();
        bridge_state.amount = amount;
        bridge_state.destination_chain = destination_chain.clone();
        bridge_state.destination_address = destination_address.clone();
        bridge_state.status = BridgeStatus::Pending;

        // Transfer tokens from user to bridge token account
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.bridge_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        // Burn tokens (except fee)
        let config_seeds = &[
            b"global_config".as_ref(),
            &[config.bump],
        ];
        let config_signer = &[&config_seeds[..]];

        let burn_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.bridge_token_account.to_account_info(),
                authority: ctx.accounts.global_config.to_account_info(),
            },
            config_signer,
        );
        token::burn(burn_ctx, amount_after_fee)?;

        // Emit an event
        emit!(BridgeStartedEvent {
            user: ctx.accounts.user.key(),
            amount,
            amount_after_fee,
            destination_chain,
            destination_address,
        });

        Ok(())
    }

    pub fn mint_asset(
        ctx: Context<MintAsset>,
        amount: u64,
        _destination_chain: String,
        _destination_address: String,
    ) -> Result<()> {
        // Check if bridge is paused
        require!(!ctx.accounts.global_config.paused, BridgeError::BridgePaused);
        // Check if caller is the offchain processor
        require!(
            ctx.accounts.offchain_processor.key() == ctx.accounts.global_config.offchain_processor,
            BridgeError::OnlyOffchainProcessor
        );

        // Mint tokens to recipient
        let config_seeds = &[
            b"global_config".as_ref(),
            &[ctx.accounts.global_config.bump],
        ];
        let config_signer = &[&config_seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.global_config.to_account_info(),
            },
            config_signer,
        );
        token::mint_to(mint_ctx, amount)?;

        // Emit an event
        emit!(AssetMintedEvent {
            recipient: ctx.accounts.recipient.key(),
            amount,
        });

        Ok(())
    }

    pub fn update_transfer_fee(
        ctx: Context<UpdateConfig>,
        new_fee: u16,
    ) -> Result<()> {
        // Max 10%
        require!(new_fee <= 1000, BridgeError::FeeTooHigh);
        
        ctx.accounts.global_config.transfer_fee_basis_points = new_fee;
        Ok(())
    }

    pub fn update_operation_fee(
        ctx: Context<UpdateConfig>,
        new_fee: u64,
    ) -> Result<()> {
        ctx.accounts.global_config.operation_fee = new_fee;
        Ok(())
    }

    pub fn change_offchain_processor(
        ctx: Context<UpdateConfig>,
        new_processor: Pubkey,
    ) -> Result<()> {
        require!(new_processor != Pubkey::default(), BridgeError::InvalidAddress);
        
        ctx.accounts.global_config.offchain_processor = new_processor;
        Ok(())
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
        let bridge_token_balance = ctx.accounts.bridge_token_account.amount;
        
        // Transfer all tokens from bridge token account to fee recipient
        let config_seeds = &[
            b"global_config".as_ref(),
            &[ctx.accounts.global_config.bump],
        ];
        let config_signer = &[&config_seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.bridge_token_account.to_account_info(),
                to: ctx.accounts.fee_recipient_token_account.to_account_info(),
                authority: ctx.accounts.global_config.to_account_info(),
            },
            config_signer,
        );
        token::transfer(transfer_ctx, bridge_token_balance)?;

        Ok(())
    }

    pub fn set_paused(ctx: Context<UpdateConfig>, paused: bool) -> Result<()> {
        ctx.accounts.global_config.paused = paused;
        Ok(())
    }

    pub fn close(_ctx: Context<Close>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = GlobalConfig::LEN,
        seeds = [b"global_config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    pub token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: This is the fee recipient address
    pub fee_recipient: UncheckedAccount<'info>,
    
    /// CHECK: This is the offchain processor address
    pub offchain_processor: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, destination_chain: String, destination_address: String)]
pub struct ReceiveAsset<'info> {
    #[account(
        seeds = [b"global_config"],
        bump = global_config.bump,
        constraint = !global_config.paused @ BridgeError::BridgePaused,
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = user,
        space = BridgeState::LEN,
        seeds = [
            b"bridge_state",
            user.key().as_ref(),
            destination_chain.as_bytes(),
            destination_address.as_bytes()
        ],
        bump
    )]
    pub bridge_state: Account<'info, BridgeState>,
    
    #[account(
        mut,
        constraint = token_mint.key() == global_config.token_mint @ BridgeError::InvalidMint
    )]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = user_token_account.mint == global_config.token_mint @ BridgeError::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = bridge_token_account.mint == global_config.token_mint @ BridgeError::InvalidMint,
        constraint = bridge_token_account.owner == global_config.key() @ BridgeError::InvalidOwner
    )]
    pub bridge_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(amount: u64, destination_chain: String, destination_address: String)]
pub struct MintAsset<'info> {
    #[account(
        seeds = [b"global_config"],
        bump = global_config.bump,
        constraint = !global_config.paused @ BridgeError::BridgePaused,
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        seeds = [
            b"bridge_state",
            recipient.key().as_ref(),
            destination_chain.as_bytes(),
            destination_address.as_bytes()
        ],
        bump = bridge_state.bump,
    )]
    pub bridge_state: Account<'info, BridgeState>,
    
    #[account(
        mut,
        constraint = token_mint.key() == global_config.token_mint @ BridgeError::InvalidMint
    )]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = recipient_token_account.mint == global_config.token_mint @ BridgeError::InvalidMint
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: This is the recipient address
    pub recipient: UncheckedAccount<'info>,
    
    #[account(
        constraint = offchain_processor.key() == global_config.offchain_processor @ BridgeError::OnlyOffchainProcessor,
    )]
    pub offchain_processor: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"global_config"],
        bump = global_config.bump,
        constraint = authority.key() == global_config.authority @ BridgeError::OnlyOwner
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        seeds = [b"global_config"],
        bump = global_config.bump,
        constraint = authority.key() == global_config.authority @ BridgeError::OnlyOwner
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    #[account(
        mut,
        constraint = bridge_token_account.mint == global_config.token_mint @ BridgeError::InvalidMint,
        constraint = bridge_token_account.owner == global_config.key() @ BridgeError::InvalidOwner
    )]
    pub bridge_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = fee_recipient_token_account.mint == global_config.token_mint @ BridgeError::InvalidMint,
        constraint = fee_recipient_token_account.owner == global_config.fee_recipient @ BridgeError::InvalidOwner
    )]
    pub fee_recipient_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(
        mut,
        seeds = [b"global_config"],
        bump = global_config.bump,
        constraint = authority.key() == global_config.authority @ BridgeError::OnlyOwner,
        close = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
pub struct GlobalConfig {
    pub token_mint: Pubkey,
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub transfer_fee_basis_points: u16,
    pub operation_fee: u64,
    pub offchain_processor: Pubkey,
    pub paused: bool,
    pub bump: u8,
}

impl GlobalConfig {
    pub const LEN: usize = 8 + // discriminator
                          32 + // token_mint
                          32 + // authority
                          32 + // fee_recipient
                          2 + // transfer_fee_basis_points
                          8 + // operation_fee
                          32 + // offchain_processor
                          1 + // paused
                          1; // bump
}

#[account]
pub struct BridgeState {
    pub user: Pubkey,
    pub amount: u64,
    pub destination_chain: String,
    pub destination_address: String,
    pub status: BridgeStatus,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum BridgeStatus {
    Pending,
    Completed,
    Failed,
}

impl BridgeState {
    pub const MAX_DESTINATION_LEN: usize = 64;
    pub const LEN: usize = 8 + // discriminator
                          32 + // user
                          8 + // amount
                          (4 + Self::MAX_DESTINATION_LEN) + // destination_chain (string)
                          (4 + 42) + // destination_address (string, assuming ETH address)
                          1 + // status
                          1; // bump
}

#[error_code]
pub enum BridgeError {
    #[msg("The bridge is paused")]
    BridgePaused,
    #[msg("Only the owner can perform this action")]
    OnlyOwner,
    #[msg("Only the offchain processor can perform this action")]
    OnlyOffchainProcessor,
    #[msg("Fee is too high")]
    FeeTooHigh,
    #[msg("Fee exceeds amount")]
    FeeExceedsAmount,
    #[msg("Invalid token mint")]
    InvalidMint,
    #[msg("Invalid token account owner")]
    InvalidOwner,
    #[msg("Invalid address")]
    InvalidAddress,
    #[msg("Invalid destination")]
    InvalidDestination,
}

#[event]
pub struct BridgeStartedEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub amount_after_fee: u64,
    pub destination_chain: String,
    pub destination_address: String,
}

#[event]
pub struct AssetMintedEvent {
    pub recipient: Pubkey,
    pub amount: u64,
}
