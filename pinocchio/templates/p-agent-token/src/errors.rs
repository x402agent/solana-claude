use pinocchio::program_error::{ProgramError, ToStr};
use thiserror::Error;

#[derive(Clone, Debug, Eq, Error, PartialEq)]
pub enum PAgentTokenError {
    #[error("required signer is missing")]
    MissingSigner = 0,
    #[error("invalid p-agent-token state")]
    InvalidState = 1,
    #[error("agent token is already bound")]
    AlreadyBound = 2,
    #[error("invalid token program")]
    InvalidTokenProgram = 3,
    #[error("invalid amount")]
    InvalidAmount = 4,
}

impl From<PAgentTokenError> for ProgramError {
    fn from(error: PAgentTokenError) -> Self {
        ProgramError::Custom(error as u32)
    }
}

impl ToStr for PAgentTokenError {
    fn to_str<E>(&self) -> &'static str {
        match self {
            PAgentTokenError::MissingSigner => "Error: required signer is missing",
            PAgentTokenError::InvalidState => "Error: invalid p-agent-token state",
            PAgentTokenError::AlreadyBound => "Error: agent token is already bound",
            PAgentTokenError::InvalidTokenProgram => "Error: invalid token program",
            PAgentTokenError::InvalidAmount => "Error: invalid amount",
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
