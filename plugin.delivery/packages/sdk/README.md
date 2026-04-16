<a name="readme-top"></a>

<div align="center">

<img height="120" src="https://registry.npmmirror.com/@solana-clawd/assets-logo/1.0.0/files/assets/logo-3d.webp">
<img height="120" src="https://gw.alipayobjects.com/zos/kitchen/qJ3l3EPsdW/split.svg">
<img height="120" src="https://registry.npmmirror.com/@solana-clawd/assets-emoji/1.3.0/files/assets/puzzle-piece.webp">

<h1>Chat Plugin SDK</h1>

SDK for solana-clawd funciton calling plugins

[![][🤯-🧩-solana-clawd-shield]][🤯-🧩-solana-clawd-link]
[![][npm-release-shield]][npm-release-link]
[![][github-releasedate-shield]][github-releasedate-link]
[![][github-action-test-shield]][github-action-test-link]
[![][github-action-release-shield]][github-action-release-link]<br/>
[![][github-contributors-shield]][github-contributors-link]
[![][github-forks-shield]][github-forks-link]
[![][github-stars-shield]][github-stars-link]
[![][github-issues-shield]][github-issues-link]
[![][github-license-shield]][github-license-link]

[Changelog](./CHANGELOG.md) · [Report Bug][github-issues-link] · [Request Feature][github-issues-link]

![](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png)

</div>

<!-- LINK GROUP -->

<details>
<summary><kbd>Table of contents</kbd></summary>

#### TOC

- [🤯 Usage](#-usage)
- [📦 Plugin Ecosystem](#-plugin-ecosystem)
- [⌨️ Local Development](#️-local-development)
- [🤝 Contributing](#-contributing)
- [🔗 Links](#-links)

####

</details>

## 🤯 Usage

The solana-clawd Plugin SDK assists you in creating exceptional chat plugins for solana-clawd.

> \[!Important]
> [📘 SDK Document](https://plugin-sdk.solana-clawd.com) - <https://plugin-sdk.solana-clawd.com>

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 📦 Plugin Ecosystem

Plugins provide a means to extend the Function Calling capabilities of solana-clawd. They can be used to introduce new function calls and even new ways to render message results. If you are interested in plugin development, please refer to our [📘 Plugin Development Guide][plugin-development-docs] in the Docs.

- [solana-clawd-os-plugins][solana-clawd-os-plugins]: This is the plugin index for solana-clawd. It accesses index.json from this repository to display a list of available plugins for solana-clawd to the user.
- [chat-plugin-template][chat-plugin-template]: This is the plugin template for solana-clawd plugin development.
- [@solana-clawd/plugin-sdk][plugin-sdk]: The solana-clawd Plugin SDK assists you in creating exceptional chat plugins for solana-clawd.
- [@solana-clawd/chat-plugins-gateway][chat-plugins-gateway]: The solana-clawd Plugins Gateway is a backend service that provides a gateway for solana-clawd plugins. We deploy this service using Vercel. The primary API POST /api/v1/runner is deployed as an Edge Function.

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## ⌨️ Local Development

You can use Github Codespaces for online development:

[![][github-codespace-shield]][github-codespace-link]

Or clone it for local development:

[![][bun-shield]][bun-link]

```bash
$ git clone https://github.com/solana-clawd/plugin-sdk.git
$ cd plugin-sdk
$ bun install
$ bun dev
```

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 🤝 Contributing

Contributions of all types are more than welcome, if you are interested in contributing code, feel free to check out our GitHub [Issues][github-issues-link] to get stuck in to show us what you’re made of.

[![][pr-welcome-shield]][pr-welcome-link]

[![][github-contrib-shield]][github-contrib-link]

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 🔗 Links

- **[🤖 solana-clawd](https://github.com/solana-clawd/solana-clawd-os)** - An open-source, extensible (Function Calling), high-performance chatbot framework. It supports one-click free deployment of your private ChatGPT/LLM web application.
- **[🧩 / 🏪 Plugin Index](https://github.com/solana-clawd/solana-clawd-os-plugins)** - This is the plugin index for solana-clawd. It accesses index.json from this repository to display a list of available plugins for Function Calling to the user.

<div align="right">

[![][back-to-top]](#readme-top)

</div>

---

#### 📝 License

Copyright © 2023 [solana-clawd][profile-link]. <br />
This project is [MIT](./LICENSE) licensed.

<!-- LINK GROUP -->

[🤯-🧩-solana-clawd-link]: https://github.com/solana-clawd/solana-clawd-os-plugins
[🤯-🧩-solana-clawd-shield]: https://img.shields.io/badge/%F0%9F%A4%AF%20%26%20%F0%9F%A7%A9%20solana-clawd-Plugin-95f3d9?labelColor=black&style=flat-square
[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-black?style=flat-square
[bun-link]: https://bun.sh
[bun-shield]: https://img.shields.io/badge/-speedup%20with%20bun-black?logo=bun&style=for-the-badge
[plugin-development-docs]: https://solana-clawd.com/docs/usage/plugins/development
[plugin-sdk]: https://github.com/solana-clawd/plugin-sdk
[chat-plugin-template]: https://github.com/solana-clawd/chat-plugin-template
[chat-plugins-gateway]: https://github.com/solana-clawd/chat-plugins-gateway
[github-action-release-link]: https://github.com/solana-clawd/plugin-sdk/actions/workflows/release.yml
[github-action-release-shield]: https://img.shields.io/github/actions/workflow/status/solana-clawd/plugin-sdk/release.yml?label=release&labelColor=black&logo=githubactions&logoColor=white&style=flat-square
[github-action-test-link]: https://github.com/solana-clawd/plugin-sdk/actions/workflows/test.yml
[github-action-test-shield]: https://img.shields.io/github/actions/workflow/status/solana-clawd/plugin-sdk/test.yml?label=test&labelColor=black&logo=githubactions&logoColor=white&style=flat-square
[github-codespace-link]: https://codespaces.new/solana-clawd/plugin-sdk
[github-codespace-shield]: https://github.com/codespaces/badge.svg
[github-contrib-link]: https://github.com/solana-clawd/plugin-sdk/graphs/contributors
[github-contrib-shield]: https://contrib.rocks/image?repo=solana-clawd%2Fplugin-sdk
[github-contributors-link]: https://github.com/solana-clawd/plugin-sdk/graphs/contributors
[github-contributors-shield]: https://img.shields.io/github/contributors/solana-clawd/plugin-sdk?color=c4f042&labelColor=black&style=flat-square
[github-forks-link]: https://github.com/solana-clawd/plugin-sdk/network/members
[github-forks-shield]: https://img.shields.io/github/forks/solana-clawd/plugin-sdk?color=8ae8ff&labelColor=black&style=flat-square
[github-issues-link]: https://github.com/solana-clawd/plugin-sdk/issues
[github-issues-shield]: https://img.shields.io/github/issues/solana-clawd/plugin-sdk?color=ff80eb&labelColor=black&style=flat-square
[github-license-link]: https://github.com/solana-clawd/plugin-sdk/blob/main/LICENSE
[github-license-shield]: https://img.shields.io/github/license/solana-clawd/plugin-sdk?color=white&labelColor=black&style=flat-square
[github-releasedate-link]: https://github.com/solana-clawd/plugin-sdk/releases
[github-releasedate-shield]: https://img.shields.io/github/release-date/solana-clawd/plugin-sdk?labelColor=black&style=flat-square
[github-stars-link]: https://github.com/solana-clawd/plugin-sdk/network/stargazers
[github-stars-shield]: https://img.shields.io/github/stars/solana-clawd/plugin-sdk?color=ffcb47&labelColor=black&style=flat-square
[solana-clawd-os-plugins]: https://github.com/solana-clawd/solana-clawd-os-plugins
[npm-release-link]: https://www.npmjs.com/package/@solana-clawd/plugin-sdk
[npm-release-shield]: https://img.shields.io/npm/v/@solana-clawd/plugin-sdk?color=369eff&labelColor=black&logo=npm&logoColor=white&style=flat-square
[pr-welcome-link]: https://github.com/solana-clawd/plugin-sdk/pulls
[pr-welcome-shield]: https://img.shields.io/badge/%F0%9F%A4%AF%20PR%20WELCOME-%E2%86%92-ffcb47?labelColor=black&style=for-the-badge
[profile-link]: https://github.com/solana-clawd

