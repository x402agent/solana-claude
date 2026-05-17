use crate::*;
use mpl_core::{
    accounts::BaseAssetV1,
    instructions::{RemovePluginV1CpiBuilder, UpdatePluginV1CpiBuilder},
    types::{FreezeDelegate, Plugin, PluginType, UpdateAuthority},
    ID as CORE_PROGRAM_ID,
};

#[derive(Accounts)]
pub struct UnstakeAgent<'info> {
    /// Owner of the staked agent NFT.
    /// CHECK: validated against the decoded Metaplex Core asset in the handler.
    pub owner: UncheckedAccount<'info>,

    /// Tx fee payer. Either `owner` (normal flow) or the program admin
    /// (emergency-recovery flow — see handler below).
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED],
        bump
    )]
    pub global_pool: Account<'info, GlobalPool>,

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

pub fn unstake_agent_handler(ctx: Context<UnstakeAgent>) -> Result<()> {
    let global_pool = &mut ctx.accounts.global_pool;
    let asset = BaseAssetV1::try_from(&ctx.accounts.asset.to_account_info())
        .map_err(|_| error!(StakingError::InvalidMetadata))?;

    // Authorization: tx-fee-payer (`user`) must be the asset owner OR the program admin.
    // Admin-as-payer covers emergency unfreezing if the owner key is compromised/lost.
    if !ctx.accounts.user.key().eq(&ctx.accounts.owner.key()) {
        require!(
            global_pool.admin.eq(&ctx.accounts.user.key()),
            StakingError::InvalidAdmin
        );
    }
    require_keys_eq!(
        asset.owner,
        ctx.accounts.owner.key(),
        StakingError::InvalidOwner
    );
    require!(
        asset.update_authority == UpdateAuthority::Collection(ctx.accounts.collection.key()),
        StakingError::InvalidCollection
    );

    // Step 1: flip FreezeDelegate.frozen to false so the asset can be moved.
    UpdatePluginV1CpiBuilder::new(&ctx.accounts.core_program.to_account_info())
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&ctx.accounts.user.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .plugin(Plugin::FreezeDelegate(FreezeDelegate { frozen: false }))
        .invoke()?;

    // Step 2: remove the FreezeDelegate plugin entirely (cleanup).
    RemovePluginV1CpiBuilder::new(&ctx.accounts.core_program)
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&ctx.accounts.user)
        .system_program(&ctx.accounts.system_program)
        .plugin_type(PluginType::FreezeDelegate)
        .invoke()?;

    global_pool.total_agents_staked = global_pool
        .total_agents_staked
        .checked_sub(1)
        .ok_or(StakingError::CounterUnderflow)?;

    Ok(())
}
