#[repr(u8)]
pub enum PrimitiveDataTypes {
    U8 = 1,
    U16,
    U32,
    U64,
    I8,
    I16,
    I32,
    I64,
    BOOL, // 9,
}

#[repr(u8)]
pub enum VariableDataTypes {
    STRING = 10,
    VEC(PrimitiveDataTypes),
}

/// OpenClawd extension: Complex data types for attestation
#[repr(u8)]
#[allow(non_camel_case_types)]
pub enum OpenClawdDataTypes {
    /// 32-byte Solana pubkey (extends beyond VecU8)
    PUBKEY = 32,
    /// Compact pubkey array for multi-sig
    PubkeyArray = 33,
    /// Proof hash (32-byte SHA-256)
    ProofHash = 34,
    /// Timestamp in seconds
    TimestampU64 = 35,
    /// Version string
    VersionString = 36,
}

/// Schema type identifiers for OpenClawd attestations
pub mod schema_types {
    /// Skill attestation schema type
    pub const SKILL_ATTESTATION_SCHEMA: &[u8] = &[12, 32, 12, 8, 1]; // String, Pubkey, String, U64, Bool
    /// Agent identity schema type
    pub const AGENT_IDENTITY_SCHEMA: &[u8] = &[12, 32, 12, 32, 1]; // String, Pubkey, String, Pubkey, Bool
    /// Plugin attestation schema type
    pub const PLUGIN_ATTESTATION_SCHEMA: &[u8] = &[12, 32, 12, 34, 8, 1]; // String, Pubkey, String, ProofHash, U64, Bool
}

/// Field names for skill attestation
pub mod skill_attestation_fields {
    pub const SKILL_ID: &str = "skill_id";
    pub const VERIFIER_PUBKEY: &str = "verifier_pubkey";
    pub const PROOF_HASH: &str = "proof_hash";
    pub const VERIFICATION_TIMESTAMP: &str = "verification_timestamp";
    pub const IS_FORMALLY_VERIFIED: &str = "is_formally_verified";
}

/// Field names for agent identity attestation
pub mod agent_identity_fields {
    pub const AGENT_ID: &str = "agent_id";
    pub const WALLET_PUBKEY: &str = "wallet_pubkey";
    pub const SKILL_ATTESTATION: &str = "skill_attestation";
    pub const VAULT_ADDRESS: &str = "vault_address";
    pub const IS_VAULT_INITIALIZED: &str = "is_vault_initialized";
}

/// Field names for plugin attestation
pub mod plugin_attestation_fields {
    pub const PLUGIN_ID: &str = "plugin_id";
    pub const AUTHOR_PUBKEY: &str = "author_pubkey";
    pub const ATTESTATION_REF: &str = "attestation_ref";
    pub const AUDIT_PROOF_HASH: &str = "audit_proof_hash";
    pub const TIMESTAMP: &str = "timestamp";
    pub const IS_AUDITED: &str = "is_audited";
}

#[cfg(test)]
mod test {
    use crate::schema_types::{AGENT_IDENTITY_SCHEMA, SKILL_ATTESTATION_SCHEMA};
    use solana_attestation_service_macros::SchemaStructSerialize;

    #[derive(SchemaStructSerialize)]
    struct CustomData {
        _field1: u64,
        _field2: i8,
        _field3: String,
    }

    #[test]
    fn test_serialization() {
        assert_eq!(CustomData::get_serialized_representation(), vec![3, 5, 12]);
    }

    #[test]
    fn test_openclawd_schemas() {
        // Verify schema types
        assert_eq!(SKILL_ATTESTATION_SCHEMA, &[12, 32, 12, 8, 1]);
        assert_eq!(AGENT_IDENTITY_SCHEMA, &[12, 32, 12, 32, 1]);
    }
}
