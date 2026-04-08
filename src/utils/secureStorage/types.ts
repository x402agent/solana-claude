/**
 * Secure storage types.
 * Stub — provides the interfaces for keychain/plaintext storage implementations.
 */

export type SecureStorageData = Record<string, string> | null

export interface SecureStorage {
  name: string
  read(): SecureStorageData
  readAsync(): Promise<SecureStorageData | null>
  update(data: SecureStorageData): { success: boolean; warning?: string }
  delete(): boolean
}
