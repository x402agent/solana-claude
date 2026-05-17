use crate::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = GlobalPool::DATA_SIZE,
        seeds = [GLOBAL_AUTHORITY_SEED],
        bump
    )]
    pub global_pool: Account<'info, GlobalPool>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_handler(ctx: Context<Initialize>) -> Result<()> {
    let global_pool = &mut ctx.accounts.global_pool;

    global_pool.admin = ctx.accounts.admin.key();
    global_pool.total_agents_staked = 0;
    global_pool.reserved = 0;

    Ok(())
}
