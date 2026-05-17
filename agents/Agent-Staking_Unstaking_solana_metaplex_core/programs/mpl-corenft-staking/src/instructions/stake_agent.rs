use crate::*;
use mpl_core::{
    accounts::BaseAssetV1,
    instructions::AddPluginV1CpiBuilder,
    types::{FreezeDelegate, Plugin, UpdateAuthority},
    ID as CORE_PROGRAM_ID,
};

#[derive(Accounts)]
pub struct StakeAgent<'info> {
    /// Owner of the agent NFT being staked. The `user` signer must match this
    /// account and the Metaplex Core asset owner.
    /// CHECK: validated against the decoded Metaplex Core asset in the handler.
    pub owner: UncheckedAccount<'info>,

    /// Tx fee payer and staking authority. Must equal `owner`.
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED],
        bump
    )]
    pub global_pool: Account<'info, GlobalPool>,

    /// The Metaplex Core agent asset to stake.
    #[account(
        mut,
        owner = CORE_PROGRAM_ID,
    )]
    /// CHECK: account owner is pinned to Metaplex Core and decoded in handler.
    pub asset: UncheckedAccount<'info>,

    #[account(mut, owner = CORE_PROGRAM_ID)]
    /// CHECK: account owner is pinned to Metaplex Core and referenced by asset update authority.
    pub collection: UncheckedAccount<'info>,

    #[account(address = CORE_PROGRAM_ID)]
    /// CHECK: pinned by address constraint; CPI'd into directly.
    pub core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn stake_agent_handler(ctx: Context<StakeAgent>) -> Result<()> {
    let global_pool = &mut ctx.accounts.global_pool;
    let asset = BaseAssetV1::try_from(&ctx.accounts.asset.to_account_info())
        .map_err(|_| error!(StakingError::InvalidMetadata))?;

    require_keys_eq!(
        ctx.accounts.user.key(),
        ctx.accounts.owner.key(),
        StakingError::InvalidOwner
    );
    require_keys_eq!(
        asset.owner,
        ctx.accounts.owner.key(),
        StakingError::InvalidOwner
    );
    require!(
        asset.update_authority == UpdateAuthority::Collection(ctx.accounts.collection.key()),
        StakingError::InvalidCollection
    );

    // Add the FreezeDelegate plugin (frozen=true) so the asset is non-transferable
    // while staked. The asset itself never leaves the owner's wallet.
    AddPluginV1CpiBuilder::new(&ctx.accounts.core_program.to_account_info())
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&ctx.accounts.user.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .plugin(Plugin::FreezeDelegate(FreezeDelegate { frozen: true }))
        .invoke()?;

    global_pool.total_agents_staked = global_pool
        .total_agents_staked
        .checked_add(1)
        .ok_or(StakingError::CounterOverflow)?;

    Ok(())
}
