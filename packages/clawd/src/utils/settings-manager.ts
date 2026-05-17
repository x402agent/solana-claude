import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Current settings version - increment this when adding new models or changing settings structure
 * This triggers automatic migration for existing users
 */
const SETTINGS_VERSION = 3;

/**
 * User-level settings stored in ~/.clawd/user-settings.json
 * These are global settings that apply across all projects
 */
export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
}

export interface UserSettings {
  apiKey?: string; // Grok API key (legacy / default)
  baseURL?: string; // Grok API base URL
  defaultModel?: string; // User's preferred default model
  models?: string[]; // Available models list
  settingsVersion?: number; // Version for migration tracking
  ollamaBaseURL?: string; // Ollama API base URL (default: http://localhost:11434/v1)
  // Per-provider configuration. Keys are provider ids: grok | openrouter | openai | ollama | custom
  providers?: Record<string, ProviderConfig>;
}

/**
 * Project-level settings stored in .clawd/settings.json
 * These are project-specific settings
 */
export interface ProjectSettings {
  model?: string; // Current model for this project
  mcpServers?: Record<string, any>; // MCP server configurations
}

/**
 * Default values for user settings
 */
const DEFAULT_USER_SETTINGS: Partial<UserSettings> = {
  baseURL: "https://api.x.ai/v1",
  defaultModel: "grok-code-fast-1",
  models: [
    // Grok 4.1 Fast models (2M context, latest - November 2025)
    "grok-4-1-fast-reasoning",
    "grok-4-1-fast-non-reasoning",
    // Grok 4 Fast models (2M context)
    "grok-4-fast-reasoning",
    "grok-4-fast-non-reasoning",
    // Grok 4 flagship (256K context)
    "grok-4",
    "grok-4-latest",
    // Grok Code (optimized for coding, 256K context)
    "grok-code-fast-1",
    // Grok 3 models (131K context)
    "grok-3",
    "grok-3-latest",
    "grok-3-fast",
    "grok-3-mini",
    "grok-3-mini-fast",
    // Ollama models (use with baseURL: "http://localhost:11434/v1")
    "ollama/glm-5.1:cloud",
    "ollama/8bit/DeepSolana:latest",
    "ollama/minimax-m2.7:cloud",
    "ollama/minimax-m2.1:cloud",
    "ollama/kimi-k2.5:cloud",
    "ollama/kimi-k2.6:cloud",
    "ollama/mxbai-embed-large:latest",
    // OpenRouter models (use with baseURL: "https://openrouter.ai/api/v1")
    "openrouter/anthropic/claude-sonnet-4.6",
    "openrouter/deepseek/deepseek-v3.2",
    "openrouter/anthropic/claude-opus-4.7",
    "openrouter/anthropic/claude-sonnet-4",
    "openrouter/anthropic/claude-3.5-sonnet",
    "openrouter/anthropic/claude-3-haiku",
    "openrouter/google/gemini-2.5-pro",
    "openrouter/google/gemini-2.0-flash",
    "openrouter/meta-llama/llama-4-maverick",
    "openrouter/meta-llama/llama-4-scout",
    "openrouter/deepseek/deepseek-chat-v3",
    "openrouter/deepseek/deepseek-coder",
    "openrouter/mistralai/mistral-nemo",
    "openrouter/qwen/qwen-3",
    "openrouter/x-ai/grok-3",
    "openrouter/x-ai/grok-2",
    // OpenAI models (use with baseURL: "https://api.openai.com/v1")
    "openai/gpt-4.5",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "openai/gpt-4-turbo",
    "openai/o3",
    "openai/o3-mini",
    "openai/o4-mini",
  ],
  ollamaBaseURL: "http://localhost:11434/v1",
};

/**
 * Default values for project settings
 */
const DEFAULT_PROJECT_SETTINGS: Partial<ProjectSettings> = {
  model: "grok-code-fast-1",
};

/**
 * Unified settings manager that handles both user-level and project-level settings
 */
export class SettingsManager {
  private static instance: SettingsManager;

  private userSettingsPath: string;
  private projectSettingsPath: string;
  private legacyUserSettingsPath: string;
  private legacyProjectSettingsPath: string;

  private constructor() {
    // Preferred user settings path: ~/.clawd/user-settings.json
    this.userSettingsPath = path.join(
      os.homedir(),
      ".clawd",
      "user-settings.json"
    );
    this.legacyUserSettingsPath = path.join(
      os.homedir(),
      ".grok",
      "user-settings.json"
    );

    // Preferred project settings path: .clawd/settings.json
    this.projectSettingsPath = path.join(
      process.cwd(),
      ".clawd",
      "settings.json"
    );
    this.legacyProjectSettingsPath = path.join(
      process.cwd(),
      ".grok",
      "settings.json"
    );
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * Ensure directory exists for a given file path
   */
  private ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  private resolveReadPath(preferredPath: string, legacyPath: string): string {
    if (fs.existsSync(preferredPath)) {
      return preferredPath;
    }

    if (fs.existsSync(legacyPath)) {
      return legacyPath;
    }

    return preferredPath;
  }

  /**
   * Load user settings from ~/.clawd/user-settings.json, with ~/.grok fallback
   */
  public loadUserSettings(): UserSettings {
    try {
      const readPath = this.resolveReadPath(
        this.userSettingsPath,
        this.legacyUserSettingsPath
      );

      if (!fs.existsSync(readPath)) {
        // Create default user settings if file doesn't exist
        const newSettings = { ...DEFAULT_USER_SETTINGS, settingsVersion: SETTINGS_VERSION };
        this.saveUserSettings(newSettings);
        return newSettings;
      }

      const content = fs.readFileSync(readPath, "utf-8");
      const settings = JSON.parse(content);

      // Check if migration is needed
      const currentVersion = settings.settingsVersion || 1;
      if (currentVersion < SETTINGS_VERSION) {
        const migratedSettings = this.migrateSettings(settings, currentVersion);
        this.saveUserSettings(migratedSettings);
        return migratedSettings;
      }

      // Merge with defaults to ensure all required fields exist
      return { ...DEFAULT_USER_SETTINGS, ...settings };
    } catch (error) {
      console.warn(
        "Failed to load user settings:",
        error instanceof Error ? error.message : "Unknown error"
      );
      return { ...DEFAULT_USER_SETTINGS };
    }
  }

  /**
   * Migrate settings from an older version to the current version
   */
  private migrateSettings(settings: UserSettings, fromVersion: number): UserSettings {
    let migrated = { ...settings };

    // Migration from version 1 to 2: Add new Grok 4.1 and Grok 4 Fast models
    if (fromVersion < 2) {
      const defaultModels = DEFAULT_USER_SETTINGS.models || [];
      const existingModels = new Set(migrated.models || []);
      
      // Add any new models that don't exist in user's current list
      const newModels = defaultModels.filter(model => !existingModels.has(model));
      
      // Prepend new models to the list (newest models first)
      migrated.models = [...newModels, ...(migrated.models || [])];
    }

    // Migration from version 2 to 3: Add free OpenRouter models wired into
    // ClawdRouter / Vibe Studio (claude-sonnet-4.6, deepseek-v3.2).
    if (fromVersion < 3) {
      const defaultModels = DEFAULT_USER_SETTINGS.models || [];
      const existingModels = new Set(migrated.models || []);
      const newModels = defaultModels.filter(model => !existingModels.has(model));
      migrated.models = [...newModels, ...(migrated.models || [])];
    }

    // Add future migrations here:
    // if (fromVersion < 4) { ... }

    migrated.settingsVersion = SETTINGS_VERSION;
    return migrated;
  }

  /**
   * Save user settings to ~/.clawd/user-settings.json
   */
  public saveUserSettings(settings: Partial<UserSettings>): void {
    try {
      this.ensureDirectoryExists(this.userSettingsPath);

      // Read existing settings directly to avoid recursion
      let existingSettings: UserSettings = { ...DEFAULT_USER_SETTINGS };
      if (fs.existsSync(this.userSettingsPath)) {
        try {
          const content = fs.readFileSync(this.userSettingsPath, "utf-8");
          const parsed = JSON.parse(content);
          existingSettings = { ...DEFAULT_USER_SETTINGS, ...parsed };
        } catch (error) {
          // If file is corrupted, use defaults
          console.warn("Corrupted user settings file, using defaults");
        }
      }

      const mergedSettings = { ...existingSettings, ...settings };

      fs.writeFileSync(
        this.userSettingsPath,
        JSON.stringify(mergedSettings, null, 2),
        { mode: 0o600 } // Secure permissions for API key
      );
    } catch (error) {
      console.error(
        "Failed to save user settings:",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  /**
   * Update a specific user setting
   */
  public updateUserSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ): void {
    const settings = { [key]: value } as Partial<UserSettings>;
    this.saveUserSettings(settings);
  }

  /**
   * Get a specific user setting
   */
  public getUserSetting<K extends keyof UserSettings>(key: K): UserSettings[K] {
    const settings = this.loadUserSettings();
    return settings[key];
  }

  /**
   * Load project settings from .clawd/settings.json, with .grok fallback
   */
  public loadProjectSettings(): ProjectSettings {
    try {
      const readPath = this.resolveReadPath(
        this.projectSettingsPath,
        this.legacyProjectSettingsPath
      );

      if (!fs.existsSync(readPath)) {
        // Create default project settings if file doesn't exist
        this.saveProjectSettings(DEFAULT_PROJECT_SETTINGS);
        return { ...DEFAULT_PROJECT_SETTINGS };
      }

      const content = fs.readFileSync(readPath, "utf-8");
      const settings = JSON.parse(content);

      // Merge with defaults
      return { ...DEFAULT_PROJECT_SETTINGS, ...settings };
    } catch (error) {
      console.warn(
        "Failed to load project settings:",
        error instanceof Error ? error.message : "Unknown error"
      );
      return { ...DEFAULT_PROJECT_SETTINGS };
    }
  }

  /**
   * Save project settings to .clawd/settings.json
   */
  public saveProjectSettings(settings: Partial<ProjectSettings>): void {
    try {
      this.ensureDirectoryExists(this.projectSettingsPath);

      // Read existing settings directly to avoid recursion
      let existingSettings: ProjectSettings = { ...DEFAULT_PROJECT_SETTINGS };
      if (fs.existsSync(this.projectSettingsPath)) {
        try {
          const content = fs.readFileSync(this.projectSettingsPath, "utf-8");
          const parsed = JSON.parse(content);
          existingSettings = { ...DEFAULT_PROJECT_SETTINGS, ...parsed };
        } catch (error) {
          // If file is corrupted, use defaults
          console.warn("Corrupted project settings file, using defaults");
        }
      }

      const mergedSettings = { ...existingSettings, ...settings };

      fs.writeFileSync(
        this.projectSettingsPath,
        JSON.stringify(mergedSettings, null, 2)
      );
    } catch (error) {
      console.error(
        "Failed to save project settings:",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  /**
   * Update a specific project setting
   */
  public updateProjectSetting<K extends keyof ProjectSettings>(
    key: K,
    value: ProjectSettings[K]
  ): void {
    const settings = { [key]: value } as Partial<ProjectSettings>;
    this.saveProjectSettings(settings);
  }

  /**
   * Get a specific project setting
   */
  public getProjectSetting<K extends keyof ProjectSettings>(
    key: K
  ): ProjectSettings[K] {
    const settings = this.loadProjectSettings();
    return settings[key];
  }

  /**
   * Get the current model with proper fallback logic:
   * 1. Project-specific model setting
   * 2. User's default model
   * 3. System default
   */
  public getCurrentModel(): string {
    const projectModel = this.getProjectSetting("model");
    if (projectModel) {
      return projectModel;
    }

    const userDefaultModel = this.getUserSetting("defaultModel");
    if (userDefaultModel) {
      return userDefaultModel;
    }

    return DEFAULT_PROJECT_SETTINGS.model || "grok-code-fast-1";
  }

  /**
   * Set the current model for the project
   */
  public setCurrentModel(model: string): void {
    this.updateProjectSetting("model", model);
  }

  /**
   * Get available models list from user settings
   */
  public getAvailableModels(): string[] {
    const models = this.getUserSetting("models") || DEFAULT_USER_SETTINGS.models || [];
    // Merge in OPENROUTER_MODEL1, OPENROUTER_MODEL2, ... from env (auto-prefixed with "openrouter/")
    const envModels = this.getEnvOpenRouterModels();
    if (envModels.length === 0) return models;
    const set = new Set<string>([...envModels, ...models]);
    return Array.from(set);
  }

  /**
   * Read OPENROUTER_MODEL1..N from env and return them prefixed for the router.
   * "anthropic/claude-sonnet-4.6" -> "openrouter/anthropic/claude-sonnet-4.6"
   * Already-prefixed values are passed through.
   */
  public getEnvOpenRouterModels(): string[] {
    const out: string[] = [];
    for (const [k, v] of Object.entries(process.env)) {
      if (!/^OPENROUTER_MODEL\d+$/.test(k)) continue;
      const raw = (v || "").trim();
      if (!raw) continue;
      out.push(raw.startsWith("openrouter/") ? raw : `openrouter/${raw}`);
    }
    return out;
  }

  /**
   * Get API key from user settings or environment.
   * Accepts XAI_API_KEY (xAI's official name) and GROK_API_KEY (legacy) interchangeably.
   */
  public getApiKey(): string | undefined {
    const envApiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (envApiKey) {
      return envApiKey;
    }

    return this.getUserSetting("apiKey");
  }

  /**
   * Get base URL from user settings or environment.
   * Accepts XAI_BASE_URL and GROK_BASE_URL interchangeably.
   */
  public getBaseURL(): string {
    const envBaseURL = process.env.XAI_BASE_URL || process.env.GROK_BASE_URL;
    if (envBaseURL) {
      return envBaseURL;
    }

    const userBaseURL = this.getUserSetting("baseURL");
    return (
      userBaseURL || DEFAULT_USER_SETTINGS.baseURL || "https://api.x.ai/v1"
    );
  }

  /**
   * Get Ollama base URL from user settings or environment
   */
  public getOllamaBaseURL(): string {
    // First check environment variable
    const envOllamaURL = process.env.OLLAMA_BASE_URL;
    if (envOllamaURL) {
      return envOllamaURL;
    }

    // Then check user settings
    const userOllamaURL = this.getUserSetting("ollamaBaseURL");
    return userOllamaURL || "http://localhost:11434/v1";
  }

  /**
   * Check if a model is an Ollama model
   */
  public isOllamaModel(model: string): boolean {
    return model.startsWith("ollama/") || 
           this.getAvailableModels().some(m => m.startsWith("ollama/") && m.includes(model));
  }

  /**
   * Get the appropriate base URL for a given model
   */
  public getModelBaseURL(model?: string): string {
    const modelToUse = model || this.getCurrentModel();

    if (this.isOllamaModel(modelToUse)) {
      return this.getOllamaBaseURL();
    }

    return this.getBaseURL();
  }

  /**
   * Detect which provider a model belongs to based on prefix.
   * Supported prefixes: "ollama/", "openrouter/", "openai/", "custom/"
   * Anything else falls back to "grok".
   */
  public getProviderForModel(model: string): string {
    if (model.startsWith("ollama/")) return "ollama";
    if (model.startsWith("openrouter/")) return "openrouter";
    if (model.startsWith("openai/")) return "openai";
    if (model.startsWith("custom/")) return "custom";
    return "grok";
  }

  /**
   * Strip provider prefix so the API receives the raw model id.
   * e.g. "openrouter/anthropic/claude-3.5-sonnet" -> "anthropic/claude-3.5-sonnet"
   *      "ollama/gemma4:latest"                   -> "gemma4:latest"
   */
  public getModelIdForApi(model: string): string {
    const provider = this.getProviderForModel(model);
    if (provider === "grok") return model;
    return model.substring(provider.length + 1); // +1 for the trailing "/"
  }

  /**
   * Resolve full provider config (apiKey + baseURL) for a given model.
   * Falls back to sensible defaults per provider.
   */
  public getProviderConfigForModel(model: string): {
    provider: string;
    apiKey: string;
    baseURL: string;
  } {
    const provider = this.getProviderForModel(model);
    const providers = this.getUserSetting("providers") || {};
    const cfg = providers[provider] || {};

    switch (provider) {
      case "ollama":
        return {
          provider,
          apiKey: cfg.apiKey || "ollama",
          baseURL:
            cfg.baseURL ||
            process.env.OLLAMA_BASE_URL ||
            this.getOllamaBaseURL(),
        };
      case "openrouter":
        return {
          provider,
          apiKey:
            cfg.apiKey ||
            process.env.OPENROUTER_API_KEY ||
            "",
          baseURL:
            cfg.baseURL ||
            process.env.OPENROUTER_BASE_URL ||
            "https://openrouter.ai/api/v1",
        };
      case "openai":
        return {
          provider,
          apiKey: cfg.apiKey || process.env.OPENAI_API_KEY || "",
          baseURL:
            cfg.baseURL ||
            process.env.OPENAI_BASE_URL ||
            "https://api.openai.com/v1",
        };
      case "custom":
        return {
          provider,
          apiKey: cfg.apiKey || "",
          baseURL: cfg.baseURL || "http://localhost:8080/v1",
        };
      case "grok":
      default:
        return {
          provider: "grok",
          apiKey: cfg.apiKey || this.getApiKey() || "",
          baseURL: cfg.baseURL || this.getBaseURL(),
        };
    }
  }

  /**
   * Update a single provider's config (merges with existing).
   */
  public setProviderConfig(provider: string, cfg: Partial<ProviderConfig>): void {
    const providers = this.getUserSetting("providers") || {};
    providers[provider] = { ...(providers[provider] || {}), ...cfg };
    this.updateUserSetting("providers", providers);
  }
}

/**
 * Convenience function to get the singleton instance
 */
export function getSettingsManager(): SettingsManager {
  return SettingsManager.getInstance();
}
