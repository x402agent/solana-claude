use core::mem::size_of;
use pinocchio::{program_error::ProgramError, pubkey::Pubkey};

#[repr(C)]
pub struct AgentState {
    pub owner: Pubkey,
    pub agent_asset: Pubkey,
    pub agent_token_mint: Pubkey,
    pub executive: Pubkey,
    pub metadata_hash: [u8; 32],
    flags: [u8; 1],
    bump: [u8; 1],
}

impl AgentState {
    pub const LEN: usize = size_of::<Self>();
    pub const FLAG_BOUND: u8 = 1;
    pub const FLAG_GRADUATED: u8 = 2;

    #[inline(always)]
    pub fn load(data: &[u8]) -> Result<&Self, ProgramError> {
        if data.len() != Self::LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(unsafe { &*(data.as_ptr() as *const Self) })
    }

    #[inline(always)]
    pub fn load_mut(data: &mut [u8]) -> Result<&mut Self, ProgramError> {
        if data.len() != Self::LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(unsafe { &mut *(data.as_mut_ptr() as *mut Self) })
    }

    #[inline(always)]
    pub fn flags(&self) -> u8 {
        self.flags[0]
    }

    #[inline(always)]
    pub fn is_bound(&self) -> bool {
        self.flags() & Self::FLAG_BOUND != 0
    }

    #[inline(always)]
    pub fn set_bound(&mut self) {
        self.flags[0] |= Self::FLAG_BOUND;
    }

    #[inline(always)]
    pub fn set_graduated(&mut self) {
        self.flags[0] |= Self::FLAG_GRADUATED;
    }

    #[inline(always)]
    pub fn bump(&self) -> u8 {
        self.bump[0]
    }
}

#[repr(C)]
pub struct CurveState {
    pub mint: Pubkey,
    pub vault: Pubkey,
    virtual_sol: [u8; 8],
    virtual_token: [u8; 8],
    real_sol: [u8; 8],
    real_token: [u8; 8],
    fee_bps: [u8; 2],
    creator_fee_bps: [u8; 2],
    flags: [u8; 1],
    bump: [u8; 1],
}

impl CurveState {
    pub const LEN: usize = size_of::<Self>();

    #[inline(always)]
    pub fn load(data: &[u8]) -> Result<&Self, ProgramError> {
        if data.len() != Self::LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(unsafe { &*(data.as_ptr() as *const Self) })
    }

    #[inline(always)]
    pub fn load_mut(data: &mut [u8]) -> Result<&mut Self, ProgramError> {
        if data.len() != Self::LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(unsafe { &mut *(data.as_mut_ptr() as *mut Self) })
    }

    #[inline(always)]
    pub fn virtual_sol(&self) -> u64 {
        u64::from_le_bytes(self.virtual_sol)
    }

    #[inline(always)]
    pub fn virtual_token(&self) -> u64 {
        u64::from_le_bytes(self.virtual_token)
    }

    #[inline(always)]
    pub fn fee_bps(&self) -> u16 {
        u16::from_le_bytes(self.fee_bps)
    }
}
