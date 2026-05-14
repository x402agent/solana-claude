# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.34+ | :white_check_mark: |
| < 0.0.34 | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **Private Security Advisory**: Use GitHub's private vulnerability reporting feature
2. **Direct Contact**: Contact maintainers directly through their GitHub profiles
3. **GitHub Security Tab**: Open a private report through the repository security workflow when available

### What to Include

When reporting a vulnerability, please include:

- **Description**: Clear description of the vulnerability
- **Impact**: Potential impact and severity
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Proof of Concept**: If possible, include a minimal PoC
- **Suggested Fix**: If you have ideas for fixing the issue

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution**: Depends on severity and complexity

## Security Best Practices

### For Users

1. **Never commit API keys or secrets**
   - Use environment variables or `.env` files (gitignored)
   - Store user settings in `~/.clawd/user-settings.json` (not in repo)

2. **Keep dependencies updated**
   ```bash
   bun update
   # or
   npm update
   ```

3. **Use HTTPS for all API calls**
   - All external API calls use HTTPS
   - Never send credentials over HTTP

4. **Review code before running**
   - Be cautious with bash commands
   - Review file operations before confirming

5. **Rotate API keys regularly**
   - Change API keys if compromised
   - Use different keys for development and production

### For Developers

1. **Environment Variables**
   ```typescript
   // ✅ GOOD: Read from environment
   const apiKey = process.env.HELIUS_API_KEY;
   
   // ❌ BAD: Hardcoded credentials
   const apiKey = "your-secret-key-here";
   ```

2. **Input Validation**
   ```typescript
   // ✅ GOOD: Validate inputs
   if (!assetId || typeof assetId !== 'string' || assetId.length < 32) {
     return { success: false, error: 'Invalid asset ID' };
   }
   
   // ❌ BAD: Trust user input
   const url = `https://api.example.com/${userInput}`;
   ```

3. **Error Handling**
   ```typescript
   // ✅ GOOD: Don't expose sensitive info
   catch (error: unknown) {
     const message = error instanceof Error ? error.message : 'Unknown error';
     // Log full error internally, but don't expose to user
     logger.error('API call failed', { error, assetId });
     return { success: false, error: 'Failed to fetch asset' };
   }
   
   // ❌ BAD: Expose internal details
   catch (error: any) {
     return { success: false, error: error.stack };
   }
   ```

4. **API Key Handling**
   ```typescript
   // ✅ GOOD: Never log API keys
   logger.info('Making API request', { url, hasApiKey: !!apiKey });
   
   // ❌ BAD: Log API keys
   console.log('API Key:', apiKey);
   ```

5. **Rate Limiting**
   ```typescript
   // ✅ GOOD: Implement rate limiting
   class RateLimiter {
     private requests: Map<string, number[]> = new Map();
     
     canMakeRequest(key: string): boolean {
       const now = Date.now();
       const requests = this.requests.get(key) || [];
       const recentRequests = requests.filter(t => now - t < 60000);
       
       if (recentRequests.length >= 100) {
         return false; // Rate limit exceeded
       }
       
       recentRequests.push(now);
       this.requests.set(key, recentRequests);
       return true;
     }
   }
   ```

## Known Security Considerations

### API Key Storage

- **User Settings**: Stored in `~/.clawd/user-settings.json` (user's home directory)
- **Environment Variables**: Read from `process.env` (not committed)
- **Never**: Store in code, commit to git, or log to console

### Solana Integration

- **Wallet Addresses**: Public addresses are safe to log
- **Private Keys**: **NEVER** handle private keys in this CLI
- **API Keys**: Use environment variables only
- **Rate Limits**: Respect API provider rate limits

### File Operations

- **Confirmation Required**: File operations require user confirmation
- **Path Validation**: Validate file paths to prevent directory traversal
- **Permissions**: Respect file system permissions

### Network Security

- **HTTPS Only**: All external API calls use HTTPS
- **Certificate Validation**: Default Node.js certificate validation
- **Timeout**: All requests have timeouts (default 10s)
- **No Insecure Protocols**: Never use HTTP or unencrypted connections

## Dependency Security

We regularly update dependencies to address security vulnerabilities:

```bash
# Check for vulnerabilities
bun audit
# or
npm audit

# Fix vulnerabilities
bun audit fix
# or
npm audit fix
```

## Security Checklist for Contributors

Before submitting code, ensure:

- [ ] No hardcoded API keys or secrets
- [ ] All user inputs are validated
- [ ] Error messages don't expose sensitive information
- [ ] API keys are never logged
- [ ] HTTPS is used for all external calls
- [ ] Dependencies are up to date
- [ ] No security vulnerabilities in dependencies
- [ ] Rate limiting is considered for API calls
- [ ] Timeouts are set for network requests
- [ ] File paths are validated

## Security Updates

Security updates will be:

1. Released as patch versions (e.g., 0.0.34 → 0.0.35)
2. Documented in CHANGELOG.md
3. Tagged with security labels
4. Prioritized for immediate release

## Acknowledgments

We thank security researchers who responsibly disclose vulnerabilities.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
