use pinocchio::program_error::{ProgramError, ToStr};
use thiserror::Error;

#[derive(Clone, Debug, Eq, Error, PartialEq)]
pub enum EscrowError {
    #[error("required signer is missing")]
    MissingSigner = 0,
    #[error("invalid escrow state")]
    InvalidEscrowState = 1,
    #[error("invalid escrow amount")]
    InvalidAmount = 2,
}

impl From<EscrowError> for ProgramError {
    fn from(error: EscrowError) -> Self {
        ProgramError::Custom(error as u32)
    }
}

impl ToStr for EscrowError {
    fn to_str<E>(&self) -> &'static str {
        match self {
            EscrowError::MissingSigner => "Error: required signer is missing",
            EscrowError::InvalidEscrowState => "Error: invalid escrow state",
            EscrowError::InvalidAmount => "Error: invalid escrow amount",
        }
    }
}

#[macro_export]
macro_rules! require {
    ($constraint:expr, $error:expr) => {
        if !$constraint {
            return Err($error.into());
        }
    };
}

