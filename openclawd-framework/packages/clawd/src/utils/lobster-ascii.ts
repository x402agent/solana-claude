/**
 * 🦞 Lobster ASCII Art for Clawd Code CLI
 * A lobster-themed AI assistant for Solana developers
 */

export const LOBSTER_ASCII = `
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║     ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄     ║
    ║   ╱▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔╲    ║
    ║  ║  █████╗  ║                                           ║   ║
    ║  ║ ██╔══██╗ ║   🦞 CLAWD CODE CLI 🦞                   ║   ║
    ║  ║ ╚══█╔═╝ ║                                           ║   ║
    ║  ║   ██║   ║   "Claws that code, brains that deploy"    ║   ║
    ║  ║   ██║   ║                                           ║   ║
    ║  ║   ╚═╝   ║   ┌─────────────────────────────────┐     ║   ║
    ║  ║         ║   │ AI-Powered CLI for Solana       │     ║   ║
    ║  ║  ▄█████╗ ║   │ Terminal • Blockchain • Deploy  │     ║   ║
    ║  ║ ██╔══██╗║   └─────────────────────────────────┘     ║   ║
    ║  ║ ╚══█╔═╝ ║                                           ║   ║
    ║  ║   ██║   ║   Type 'clawd --help' to get started      ║   ║
    ║  ║   ╚═╝   ║                                           ║   ║
    ║   ╲▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔╱    ║
    ║     ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀     ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
`;

export const LOBSTER_SMALL = `
    🦞 Clawd Code CLI v1.0.0
    ========================
`;

export const LOBSTER_WELCOME = `
    ┌────────────────────────────────────────┐
    │  🦞 Welcome to Clawd Code CLI! 🦞      │
    │                                        │
    │  Type your commands and I'll help      │
    │  you build on Solana!                  │
    │                                        │
    │  Examples:                             │
    │  • clawd "deploy my contract"           │
    │  • clawd git commit-and-push           │
    │  • clawd --prompt "check my wallet"    │
    │                                        │
    │  Type 'exit' or 'quit' to leave        │
    └────────────────────────────────────────┘
`;

/**
 * Display lobster ASCII art banner
 */
export function showLobsterBanner(): void {
    console.log(LOBSTER_ASCII);
}

/**
 * Display welcome message with lobster theme
 */
export function showWelcome(): void {
    console.log(LOBSTER_WELCOME);
}

/**
 * Display small lobster icon
 */
export function showSmallLobster(): void {
    console.log(LOBSTER_SMALL);
}
