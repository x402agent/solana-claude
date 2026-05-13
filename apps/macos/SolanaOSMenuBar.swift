import AppKit
import Foundation

private struct ClawdConnectBundle: Decodable {
    struct Gateway: Decodable {
        let url: String
        let secret: String?
    }

    let gateway: Gateway
}

private struct DexScreenerTokenResponse: Decodable {
    let pairs: [DexScreenerPair]?
}

private struct DexScreenerPair: Decodable {
    struct Token: Decodable {
        let symbol: String?
        let name: String?
    }

    struct Liquidity: Decodable {
        let usd: Double?
    }

    struct WindowValues: Decodable {
        let h24: Double?
    }

    let chainId: String?
    let dexId: String?
    let url: String?
    let baseToken: Token?
    let quoteToken: Token?
    let priceUsd: String?
    let fdv: Double?
    let marketCap: Double?
    let liquidity: Liquidity?
    let volume: WindowValues?
    let priceChange: WindowValues?
}

private struct ClawdMarketSnapshot {
    let title: String
    let detail: String
    let chartURL: URL?
}

final class SolanaClawdMenuBarController: NSObject, NSApplicationDelegate {
    private static let tokenAddress = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump"

    private let port: Int
    private let pidFile: String
    private let launchURL = URL(string: "https://solanaclawd.com")!
    private let terminalURL = URL(string: "https://solanaclawd.com/terminal")!
    private let payURL = URL(string: "https://pay.solanaclawd.com")!
    private let xURL = URL(string: "https://x.com/clawddevs")!
    private let npmURL = URL(string: "https://www.npmjs.com/package/solana-clawd")!
    private let githubURL = URL(string: "https://github.com/x402agent/solana-clawd")!
    private let chartFallbackURL = URL(string: "https://dexscreener.com/solana/\(SolanaClawdMenuBarController.tokenAddress)")!
    private let marketURL = URL(string: "https://api.dexscreener.com/latest/dex/tokens/\(SolanaClawdMenuBarController.tokenAddress)")!
    private let setupCodePaths = [
        NSHomeDirectory() + "/.solana-clawd/connect/setup-code.txt",
        NSHomeDirectory() + "/.nanosolana/connect/setup-code.txt",
    ]
    private let connectBundlePaths = [
        NSHomeDirectory() + "/.solana-clawd/connect/solana-clawd-connect.json",
        NSHomeDirectory() + "/.nanosolana/connect/solanaos-connect.json",
    ]

    private var statusItem: NSStatusItem!
    private var statusMenuItem: NSMenuItem!
    private var detailMenuItem: NSMenuItem!
    private var marketMenuItem: NSMenuItem!
    private var marketDetailMenuItem: NSMenuItem!
    private var tokenAddressMenuItem: NSMenuItem!
    private var latestChartURL: URL?
    private var timer: Timer?

    init(port: Int, pidFile: String) {
        self.port = port
        self.pidFile = pidFile
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)

        self.statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = self.statusItem.button {
          button.title = "CLAWD"
          button.toolTip = "Solana Clawd"
        }

        let menu = NSMenu()

        let header = NSMenuItem(title: "Solana Clawd", action: nil, keyEquivalent: "")
        header.isEnabled = false
        menu.addItem(header)

        self.statusMenuItem = NSMenuItem(title: "Runtime: checking...", action: nil, keyEquivalent: "")
        self.statusMenuItem.isEnabled = false
        menu.addItem(self.statusMenuItem)

        self.detailMenuItem = NSMenuItem(title: "Gateway: waiting for /api/status", action: nil, keyEquivalent: "")
        self.detailMenuItem.isEnabled = false
        menu.addItem(self.detailMenuItem)

        self.marketMenuItem = NSMenuItem(title: "$CLAWD: loading Solana market data...", action: nil, keyEquivalent: "")
        self.marketMenuItem.isEnabled = false
        menu.addItem(self.marketMenuItem)

        self.marketDetailMenuItem = NSMenuItem(title: "DEX: waiting for DexScreener", action: nil, keyEquivalent: "")
        self.marketDetailMenuItem.isEnabled = false
        menu.addItem(self.marketDetailMenuItem)

        menu.addItem(.separator())

        menu.addItem(withTitle: "Open Local Control", action: #selector(openLocalControl), keyEquivalent: "o").target = self
        menu.addItem(withTitle: "Open Local Wallet", action: #selector(openLocalWallet), keyEquivalent: "w").target = self
        menu.addItem(withTitle: "Open Local Chat", action: #selector(openLocalChat), keyEquivalent: "c").target = self

        menu.addItem(.separator())

        let webSubmenu = NSMenu()
        webSubmenu.addItem(withTitle: "Home", action: #selector(openHome), keyEquivalent: "").target = self
        webSubmenu.addItem(withTitle: "Terminal", action: #selector(openWebTerminal), keyEquivalent: "t").target = self
        webSubmenu.addItem(withTitle: "x402 Pay", action: #selector(openPay), keyEquivalent: "").target = self
        webSubmenu.addItem(withTitle: "@clawddevs", action: #selector(openX), keyEquivalent: "").target = self
        webSubmenu.addItem(withTitle: "npm Package", action: #selector(openNPM), keyEquivalent: "").target = self
        webSubmenu.addItem(withTitle: "GitHub", action: #selector(openGitHub), keyEquivalent: "g").target = self
        let webItem = NSMenuItem(title: "Clawd Links", action: nil, keyEquivalent: "l")
        webItem.submenu = webSubmenu
        menu.addItem(webItem)

        let marketSubmenu = NSMenu()
        marketSubmenu.addItem(withTitle: "Open $CLAWD Chart", action: #selector(openTokenChart), keyEquivalent: "").target = self
        marketSubmenu.addItem(withTitle: "Refresh Market Data", action: #selector(refreshNow), keyEquivalent: "r").target = self
        marketSubmenu.addItem(withTitle: "Copy Token CA", action: #selector(copyTokenAddress), keyEquivalent: "").target = self
        self.tokenAddressMenuItem = NSMenuItem(title: "CA: \(Self.shortAddress(Self.tokenAddress))", action: nil, keyEquivalent: "")
        self.tokenAddressMenuItem.isEnabled = false
        marketSubmenu.addItem(self.tokenAddressMenuItem)
        let marketItem = NSMenuItem(title: "Live Solana Data", action: nil, keyEquivalent: "")
        marketItem.submenu = marketSubmenu
        menu.addItem(marketItem)

        menu.addItem(.separator())

        menu.addItem(withTitle: "Reveal Setup Code", action: #selector(revealSetupCode), keyEquivalent: "").target = self
        menu.addItem(withTitle: "Copy Setup Code", action: #selector(copySetupCode), keyEquivalent: "").target = self
        menu.addItem(withTitle: "Reveal Connect Bundle", action: #selector(revealConnectBundle), keyEquivalent: "").target = self

        menu.addItem(.separator())

        menu.addItem(withTitle: "Open macOS Terminal", action: #selector(openMacTerminal), keyEquivalent: "").target = self
        menu.addItem(withTitle: "Quit Solana Clawd", action: #selector(quitApp), keyEquivalent: "q").target = self

        self.statusItem.menu = menu
        self.refreshStatus()
        self.timer = Timer.scheduledTimer(withTimeInterval: 20, repeats: true) { [weak self] _ in
            self?.refreshStatus()
        }
    }

    @objc private func openLocalControl() {
        self.openLocalURL(path: "")
    }

    @objc private func openLocalWallet() {
        self.openLocalURL(path: "#wallet")
    }

    @objc private func openLocalChat() {
        self.openLocalURL(path: "#chat")
    }

    @objc private func openHome() { NSWorkspace.shared.open(self.launchURL) }
    @objc private func openWebTerminal() { NSWorkspace.shared.open(self.terminalURL) }
    @objc private func openPay() { NSWorkspace.shared.open(self.payURL) }
    @objc private func openX() { NSWorkspace.shared.open(self.xURL) }
    @objc private func openNPM() { NSWorkspace.shared.open(self.npmURL) }
    @objc private func openGitHub() { NSWorkspace.shared.open(self.githubURL) }
    @objc private func openTokenChart() { NSWorkspace.shared.open(self.latestChartURL ?? self.chartFallbackURL) }
    @objc private func refreshNow() { self.refreshStatus() }

    @objc private func revealSetupCode() {
        self.revealFirstExistingFile(in: self.setupCodePaths)
    }

    @objc private func revealConnectBundle() {
        self.revealFirstExistingFile(in: self.connectBundlePaths)
    }

    @objc private func copySetupCode() {
        guard let path = self.firstExistingPath(in: self.setupCodePaths),
              let code = try? String(contentsOfFile: path).trimmingCharacters(in: .whitespacesAndNewlines),
              !code.isEmpty else {
            return
        }

        self.copyToPasteboard(code)
    }

    @objc private func copyTokenAddress() {
        self.copyToPasteboard(Self.tokenAddress)
    }

    private func copyToPasteboard(_ string: String) {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(string, forType: .string)
    }

    @objc private func openMacTerminal() {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        process.arguments = ["-a", "Terminal"]
        try? process.run()
    }

    @objc private func quitApp() {
        self.stopManagedNanoBotIfNeeded()
        NSApp.terminate(nil)
    }

    private func revealFirstExistingFile(in paths: [String]) {
        guard let path = self.firstExistingPath(in: paths) else { return }
        self.revealFile(at: path)
    }

    private func revealFile(at path: String) {
        guard FileManager.default.fileExists(atPath: path) else { return }
        NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: path)])
    }

    private func firstExistingPath(in paths: [String]) -> String? {
        paths.first { FileManager.default.fileExists(atPath: $0) }
    }

    private func openLocalURL(path: String) {
        guard let url = URL(string: "http://127.0.0.1:\(self.port)/\(path)") else { return }
        NSWorkspace.shared.open(url)
    }

    private func refreshStatus() {
        DispatchQueue.global(qos: .utility).async {
            let status = self.fetchStatus()
            let connectBundle = self.loadConnectBundle()
            let market = self.fetchMarketSnapshot()

            DispatchQueue.main.async {
            let daemon = (status["daemon"] as? String) ?? "offline"
            let mode = (status["oodaMode"] as? String) ?? "unknown"
            let watchlist = (status["watchlistCount"] as? Int) ?? 0
            let honcho = (status["honchoEnabled"] as? Bool) == true ? "on" : "off"
            let gatewayLine = connectBundle?.gateway.url ?? "not paired"

            self.statusMenuItem.title = "Runtime: \(daemon) | \(mode) | watchlist \(watchlist) | honcho \(honcho)"
            self.detailMenuItem.title = "Gateway: \(gatewayLine)"
            self.marketMenuItem.title = market.title
            self.marketDetailMenuItem.title = market.detail
            self.latestChartURL = market.chartURL

            switch daemon {
            case "alive", "running":
                self.statusItem.button?.title = "CLAWD"
            case "starting":
                self.statusItem.button?.title = "CLAWD..."
            default:
                self.statusItem.button?.title = "$CLAWD"
            }
            }
        }
    }

    private func fetchStatus() -> [String: Any] {
        guard let url = URL(string: "http://127.0.0.1:\(self.port)/api/status"),
              let data = try? Data(contentsOf: url),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return [:]
        }
        return json
    }

    private func fetchMarketSnapshot() -> ClawdMarketSnapshot {
        guard let data = try? Data(contentsOf: self.marketURL),
              let response = try? JSONDecoder().decode(DexScreenerTokenResponse.self, from: data),
              let pair = response.pairs?.filter({ $0.chainId == "solana" }).max(by: {
                  ($0.liquidity?.usd ?? 0) < ($1.liquidity?.usd ?? 0)
              }) else {
            return ClawdMarketSnapshot(
                title: "$CLAWD: live data unavailable",
                detail: "CA: \(Self.shortAddress(Self.tokenAddress))",
                chartURL: self.chartFallbackURL)
        }

        let symbol = pair.baseToken?.symbol ?? "CLAWD"
        let quote = pair.quoteToken?.symbol ?? "USD"
        let price = Self.formatPrice(pair.priceUsd)
        let change = Self.formatPercent(pair.priceChange?.h24)
        let volume = Self.formatCurrency(pair.volume?.h24)
        let liquidity = Self.formatCurrency(pair.liquidity?.usd)
        let marketCap = Self.formatCurrency(pair.marketCap ?? pair.fdv)
        let dex = pair.dexId?.uppercased() ?? "DEX"
        let chartURL = pair.url.flatMap(URL.init(string:)) ?? self.chartFallbackURL

        return ClawdMarketSnapshot(
            title: "$\(symbol): \(price) | 24h \(change) | \(dex)",
            detail: "Vol \(volume) | Liq \(liquidity) | MCap \(marketCap) | \(quote)",
            chartURL: chartURL)
    }

    private func loadConnectBundle() -> ClawdConnectBundle? {
        guard let path = self.firstExistingPath(in: self.connectBundlePaths),
              let data = try? Data(contentsOf: URL(fileURLWithPath: path)) else {
            return nil
        }

        return try? JSONDecoder().decode(ClawdConnectBundle.self, from: data)
    }

    private func stopManagedNanoBotIfNeeded() {
        guard let pid = try? String(contentsOfFile: self.pidFile).trimmingCharacters(in: .whitespacesAndNewlines),
              !pid.isEmpty else {
            return
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/kill")
        process.arguments = [pid]
        try? process.run()
        try? FileManager.default.removeItem(atPath: self.pidFile)
    }

    private static func formatPrice(_ value: String?) -> String {
        guard let value, let double = Double(value) else { return "$--" }
        if double >= 1 {
            return String(format: "$%.2f", double)
        }
        if double >= 0.01 {
            return String(format: "$%.4f", double)
        }
        return String(format: "$%.8f", double)
    }

    private static func formatPercent(_ value: Double?) -> String {
        guard let value else { return "--" }
        let sign = value > 0 ? "+" : ""
        return "\(sign)\(String(format: "%.2f", value))%"
    }

    private static func formatCurrency(_ value: Double?) -> String {
        guard let value else { return "$--" }
        let absolute = abs(value)
        let sign = value < 0 ? "-" : ""
        if absolute >= 1_000_000_000 {
            return "\(sign)$\(String(format: "%.2f", absolute / 1_000_000_000))B"
        }
        if absolute >= 1_000_000 {
            return "\(sign)$\(String(format: "%.2f", absolute / 1_000_000))M"
        }
        if absolute >= 1_000 {
            return "\(sign)$\(String(format: "%.2f", absolute / 1_000))K"
        }
        return "\(sign)$\(String(format: "%.2f", absolute))"
    }

    private static func shortAddress(_ address: String) -> String {
        guard address.count > 12 else { return address }
        return "\(address.prefix(6))...\(address.suffix(6))"
    }
}

@main
struct SolanaClawdMenuBarApp {
    static func main() {
        let port = Int(ProcessInfo.processInfo.environment["NANOBOT_PORT"] ?? "7777") ?? 7777
        let pidFile = ProcessInfo.processInfo.environment["NANOBOT_PIDFILE"] ?? "/tmp/nanobot-server.pid"

        let app = NSApplication.shared
        let delegate = SolanaClawdMenuBarController(port: port, pidFile: pidFile)
        app.delegate = delegate
        app.run()
    }
}
