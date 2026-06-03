# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it as follows:

1. **Do not** create a public GitHub issue
2. Use GitHub private vulnerability reporting when it is enabled for this repository
3. If private reporting is unavailable, contact the repository owner directly through GitHub
4. Include affected files, impact, reproduction steps, and any proof-of-concept details
5. Allow reasonable time for triage and remediation before public disclosure

## Security Measures

DarkDefi implements several security best practices:

### Secrets Management
- No `.env` files in repository
- All secrets managed via GitHub Secrets
- Environment variables validated at runtime

### Code Security
- Automated CodeQL security scanning
- Weekly dependency updates via Dependabot
- TypeScript for type safety
- ESLint for code quality

### API Security
- Fail-safe design (fails closed on errors)
- Input validation and sanitization
- Rate limiting considerations
- Secure API key handling
- Bounded retries and request timeouts for release-gate data fetches

### Infrastructure Security
- GitHub Actions for CI/CD
- Branch protection rules
- Required reviews for changes
- Automated security audits

## Responsible Disclosure

We kindly ask that you:

- Give us reasonable time to fix issues before public disclosure
- Avoid accessing user data or disrupting services
- Provide clear, detailed reports with proof-of-concept

## Security Updates

Security updates will be released as patch versions with the following process:

1. Vulnerability confirmed and patched
2. Security advisory published
3. Release tagged and deployed
4. Public announcement

## Contact

For security-related questions, use GitHub private vulnerability reporting or contact the repository owner directly.
