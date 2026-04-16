export enum PluginChannel {
  createAssistantMessage = 'solana-clawdos:create-assistant-message',

  fetchPluginMessage = 'solana-clawdos:fetch-plugin-message',
  fetchPluginSettings = 'solana-clawdos:fetch-plugin-settings',

  fetchPluginState = 'solana-clawdos:fetch-plugin-state',
  fillStandalonePluginContent = 'solana-clawdos:fill-plugin-content',
  initStandalonePlugin = 'solana-clawdos:init-standalone-plugin',

  pluginReadyForRender = 'solana-clawdos:plugin-ready-for-render',

  renderPlugin = 'solana-clawdos:render-plugin',
  renderPluginSettings = 'solana-clawdos:render-plugin-settings',
  renderPluginState = 'solana-clawdos:render-plugin-state',

  triggerAIMessage = 'solana-clawdos:trigger-ai-message',

  updatePluginSettings = 'solana-clawdos:update-plugin-settings',
  updatePluginState = 'solana-clawdos:update-plugin-state',
}

