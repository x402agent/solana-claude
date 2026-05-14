use core::mem::size_of;
use pinocchio::{program_error::ProgramError, pubkey::Pubkey};

#[repr(C)]
pub struct Escrow {
    seed: [u8; 8],
    pub maker: Pubkey,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    receive: [u8; 8],
    pub bump: u8,
}

impl Escrow {
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
    pub fn seed(&self) -> u64 {
        u64::from_le_bytes(self.seed)
    }

    #[inline(always)]
    pub fn receive(&self) -> u64 {
        u64::from_le_bytes(self.receive)
    }

    #[inline(always)]
    pub fn set_inner(&mut self, seed: u64, maker: Pubkey, mint_a: Pubkey, mint_b: Pubkey, receive: u64, bump: u8) {
        self.seed = seed.to_le_bytes();
        self.maker = maker;
        self.mint_a = mint_a;
        self.mint_b = mint_b;
        self.receive = receive.to_le_bytes();
        self.bump = bump;
    }
}

