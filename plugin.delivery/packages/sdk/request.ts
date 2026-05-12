/**
 * The HTTP header name for passing plugin settings.
 */
export const SOLANA_CLAWD_PLUGIN_SETTINGS = 'X-Solana-Clawd-Plugin-Settings';

export const getPluginSettingsFromRequest = <T = any>(req: Request): T | undefined => {
  const settings = req.headers.get(SOLANA_CLAWD_PLUGIN_SETTINGS);
  if (!settings) return;

  try {
    return JSON.parse(settings);
  } catch {
    return settings as any;
  }
};

export const getPluginSettingsFromHeaders = <T = any>(headers: HeadersInit): T | undefined => {
  const header = new Headers(headers as any);

  const settings = header.get(SOLANA_CLAWD_PLUGIN_SETTINGS);
  if (!settings) return;

  try {
    return JSON.parse(settings);
  } catch {
    return settings as any;
  }
};

export const createHeadersWithPluginSettings = (
  settings: any,
  header?: HeadersInit,
): HeadersInit => ({
  ...header,
  [SOLANA_CLAWD_PLUGIN_SETTINGS]: typeof settings === 'string' ? settings : JSON.stringify(settings),
});

