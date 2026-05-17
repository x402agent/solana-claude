/**
 * User-level settings stored in ~/.clawd/user-settings.json
 * These are global settings that apply across all projects
 */
export interface ProviderConfig {
    apiKey?: string;
    baseURL?: string;
}
export interface UserSettings {
    apiKey?: string;
    baseURL?: string;
    defaultModel?: string;
    models?: string[];
    settingsVersion?: number;
    ollamaBaseURL?: string;
    providers?: Record<string, ProviderConfig>;
}
/**
 * Project-level settings stored in .clawd/settings.json
 * These are project-specific settings
 */
export interface ProjectSettings {
    model?: string;
    mcpServers?: Record<string, any>;
}
/**
 * Unified settings manager that handles both user-level and project-level settings
 */
export declare class SettingsManager {
    private static instance;
    private userSettingsPath;
    private projectSettingsPath;
    private legacyUserSettingsPath;
    private legacyProjectSettingsPath;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): SettingsManager;
    /**
     * Ensure directory exists for a given file path
     */
    private ensureDirectoryExists;
    private resolveReadPath;
    /**
     * Load user settings from ~/.clawd/user-settings.json, with ~/.grok fallback
     */
    loadUserSettings(): UserSettings;
    /**
     * Migrate settings from an older version to the current version
     */
    private migrateSettings;
    /**
     * Save user settings to ~/.clawd/user-settings.json
     */
    saveUserSettings(settings: Partial<UserSettings>): void;
    /**
     * Update a specific user setting
     */
    updateUserSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): void;
    /**
     * Get a specific user setting
     */
    getUserSetting<K extends keyof UserSettings>(key: K): UserSettings[K];
    /**
     * Load project settings from .clawd/settings.json, with .grok fallback
     */
    loadProjectSettings(): ProjectSettings;
    /**
     * Save project settings to .clawd/settings.json
     */
    saveProjectSettings(settings: Partial<ProjectSettings>): void;
    /**
     * Update a specific project setting
     */
    updateProjectSetting<K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]): void;
    /**
     * Get a specific project setting
     */
    getProjectSetting<K extends keyof ProjectSettings>(key: K): ProjectSettings[K];
    /**
     * Get the current model with proper fallback logic:
     * 1. Project-specific model setting
     * 2. User's default model
     * 3. System default
     */
    getCurrentModel(): string;
    /**
     * Set the current model for the project
     */
    setCurrentModel(model: string): void;
    /**
     * Get available models list from user settings
     */
    getAvailableModels(): string[];
    /**
     * Get API key from user settings or environment
     */
    getApiKey(): string | undefined;
    /**
     * Get base URL from user settings or environment
     */
    getBaseURL(): string;
    /**
     * Get Ollama base URL from user settings or environment
     */
    getOllamaBaseURL(): string;
    /**
     * Check if a model is an Ollama model
     */
    isOllamaModel(model: string): boolean;
    /**
     * Get the appropriate base URL for a given model
     */
    getModelBaseURL(model?: string): string;
    /**
     * Detect which provider a model belongs to based on prefix.
     * Supported prefixes: "ollama/", "openrouter/", "openai/", "custom/"
     * Anything else falls back to "grok".
     */
    getProviderForModel(model: string): string;
    /**
     * Strip provider prefix so the API receives the raw model id.
     * e.g. "openrouter/anthropic/claude-3.5-sonnet" -> "anthropic/claude-3.5-sonnet"
     *      "ollama/gemma4:latest"                   -> "gemma4:latest"
     */
    getModelIdForApi(model: string): string;
    /**
     * Resolve full provider config (apiKey + baseURL) for a given model.
     * Falls back to sensible defaults per provider.
     */
    getProviderConfigForModel(model: string): {
        provider: string;
        apiKey: string;
        baseURL: string;
    };
    /**
     * Update a single provider's config (merges with existing).
     */
    setProviderConfig(provider: string, cfg: Partial<ProviderConfig>): void;
}
/**
 * Convenience function to get the singleton instance
 */
export declare function getSettingsManager(): SettingsManager;
