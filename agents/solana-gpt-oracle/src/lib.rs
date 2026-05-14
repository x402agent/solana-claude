use anchor_lang::prelude::*;

// Interface-only fallback. Set ORACLE_PROGRAM_ID in llm_oracle for real
// deployments instead of relying on this placeholder id.
declare_id!("11111111111111111111111111111111");

#[account]
#[derive(Debug)]
pub struct Interaction {
    pub is_processed: bool,
    pub context: Pubkey,
    pub text: String,
    pub callback_program_id: Pubkey,
    pub callback_account_metas: Vec<CallbackAccountMeta>,
}

#[account]
#[derive(Debug)]
pub struct ContextAccount {
    pub text: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CallbackAccountMeta {
    pub pubkey: Pubkey,
    pub is_signer: bool,
    pub is_writable: bool,
}

pub mod instruction {
    use anchor_lang::Discriminator;

    pub struct CallbackFromLlm;

    impl Discriminator for CallbackFromLlm {
        const DISCRIMINATOR: &'static [u8] = &[64, 202, 209, 39, 156, 18, 216, 170];
    }
}
