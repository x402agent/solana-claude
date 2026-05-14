use pinocchio::program_error::{ProgramError, ToStr};
use thiserror::Error;

#[derive(Clone, Debug, Eq, Error, PartialEq)]
pub enum VaultError {
    #[error("required signer is missing")]
    MissingSigner = 0,
    #[error("invalid account owner")]
    InvalidOwner = 1,
    #[error("invalid vault state")]
    InvalidVaultState = 2,
}

impl From<VaultError> for ProgramError {
    fn from(error: VaultError) -> Self {
        ProgramError::Custom(error as u32)
    }
}

impl ToStr for VaultError {
    fn to_str<E>(&self) -> &'static str {
        match self {
            VaultError::MissingSigner => "Error: required signer is missing",
            VaultError::InvalidOwner => "Error: invalid account owner",
            VaultError::InvalidVaultState => "Error: invalid vault state",
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

