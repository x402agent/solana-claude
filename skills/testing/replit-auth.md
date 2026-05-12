---
name: replit-auth-testing
description: Programmatic login for testing applications that use Replit Auth.
---

## How does Testing Skill Interact with Replit Auth

Replit Auth allows for testing arbitary users. When calling the `runTest` callback, you can additional pass in `await runTest({...., testReplitAuth: true})` to activate the replit auth testing capability.

During testing, the ISSUER_URL env var will be overridden a custom endpoint that could set and clear the next login claims, with no action needed from you. This means that to test replit auth application, you need to instruct the testing agent what the next login claims should be. Ask it to login then check if the result is correct.

You should not check entering any sort of login credentials since that would be bypassed entirely. When the application redirects to the OIDC login page, the claim you set will be automatically applied and the application will be redirected to the post login page, without the need to manually enter any credentials.

# Example Test Plan

<test_plan>
[New Context] Create a new browser context
...
n. [OIDC] Configure the next login to use {sub: nanoid(6), email: `user${nanoid(6)}@example.com`, first_name: "Normal", last_name: "Person"} note the sub and email for future use (say ${login_sub} and ${login_email})
n+1. [Browser] Click the login button (data-testid="login-btn")
n+2. [Browser] Verify it's redirected to the home page.
n+3. [Verify] Verify the user name is "Normal Person" (data-testid="user-name-display")
n+4. [Verify] Verify the user email is ${login_email} (data-testid="user-email-display")
</test_plan>

Customize this to the application at hands. Some applications require special `sub` or `email`.
