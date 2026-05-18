# Contributing to Ultrathink Blockchain

Thanks for your interest in contributing! This project aims to make Claude Code a better blockchain development partner for everyone.

## How to Contribute

### Reporting Issues

- Open an issue describing the problem or improvement
- Include the prompt you used and the output you got (if applicable)
- Describe what you expected vs what happened

### Submitting Changes

1. **Fork** the repository
2. **Create a branch** from `main` (`git checkout -b feature/your-feature`)
3. **Make your changes** with clear, descriptive commits
4. **Test your changes** by installing the skill locally and running prompts
5. **Submit a PR** with a description of what changed and why

### What We're Looking For

**New templates** for blockchain development patterns:

- EVM chains (Ethereum, Base, Arbitrum, etc.)
- Move-based chains (Sui, Aptos)
- Cosmos ecosystem
- Other Solana patterns we haven't covered

**Antipattern documentation:**

- Real-world mistakes you've seen Claude make with blockchain code
- The fix prompt that corrects the behavior
- Before/after code examples

**Skill improvements:**

- Better prompt structures that produce more reliable output
- New focus areas for `ultrathink` triggers
- Refinements to the interview protocol

**Documentation:**

- Clearer explanations
- Additional examples
- Translations to other languages

### Coding Standards

- Keep prompt templates practical and tested
- Include comments explaining *why* a pattern exists, not just *what* it does
- Antipattern examples should show both the bad pattern and the fix
- All code examples should be production-quality (no `// TODO` stubs)

### Testing Your Changes

The best way to test is to install the skill locally:

```bash
cp -r skill/ ~/.claude/skills/ultrathink-blockchain
```

Then run a Claude Code session and try prompts that exercise your changes. Document the results in your PR.

## Code of Conduct

Be kind. Be constructive. We're all here to build better tools.

- Respect different skill levels and perspectives
- Focus on the work, not the person
- If you disagree, explain your reasoning with examples

## Questions?

Open an issue tagged `question` and we'll get back to you.
