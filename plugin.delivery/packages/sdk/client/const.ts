export enum PluginChannel {
  createAssistantMessage = 'solana-clawd:create-assistant-message',

  fetchPluginMessage = 'solana-clawd:fetch-plugin-message',
  fetchPluginSettings = 'solana-clawd:fetch-plugin-settings',

  fetchPluginState = 'solana-clawd:fetch-plugin-state',
  fillStandalonePluginContent = 'solana-clawd:fill-plugin-content',
  initStandalonePlugin = 'solana-clawd:init-standalone-plugin',

  pluginReadyForRender = 'solana-clawd:plugin-ready-for-render',

  renderPlugin = 'solana-clawd:render-plugin',
  renderPluginSettings = 'solana-clawd:render-plugin-settings',
  renderPluginState = 'solana-clawd:render-plugin-state',

  triggerAIMessage = 'solana-clawd:trigger-ai-message',

  updatePluginSettings = 'solana-clawd:update-plugin-settings',
  updatePluginState = 'solana-clawd:update-plugin-state',
}

