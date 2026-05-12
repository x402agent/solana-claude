export const DEFAULT_POS_RECIPIENT = 'GyZGtA7hEThVHZpj52XC9jX15a8ABtDHTwELjFRWEts4';

export function getPosRecipient(): string {
    return process.env.POS_RECIPIENT || process.env.MERCHANT_RECIPIENT || DEFAULT_POS_RECIPIENT;
}
