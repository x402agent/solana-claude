use crate::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + GlobalPool::INIT_SPACE,
        seeds = [GLOBAL_POOL_SEED],
        bump
    )]
    pub global_pool: Account<'info, GlobalPool>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_handler(ctx: Context<Initialize>) -> Result<()> {
    let global_pool = &mut ctx.accounts.global_pool;

    global_pool.admin = ctx.accounts.admin.key();
    global_pool.total_staked = 0;
    global_pool.bump = ctx.bumps.global_pool;

    Ok(())
}
