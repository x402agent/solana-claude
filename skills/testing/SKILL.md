---
name: testing
description: Run automated UI tests against your application using a Playwright-based testing subagent. Use after implementing features to verify they work correctly. (support overriding clerk auth) 
---

# Testing Skill

The `runTest` function launches a specialized Playwright-based testing subagent that:

- Interacts with your application in a real browser
- Analyzes both browser and backend logs
- Provides detailed feedback including screenshots and technical diagnostics

End-to-end testing with `runTest()` can uncover bugs not discoverable through conventional testing methods like `curl` or unit tests.

## Building Context for Testing

A good test plan derives from a good contextual understanding of the application. Before writing your test plan:

1. **Understand application context**: Know both the frontend and backend code relevant to your changes
2. **Update documentation**: If you made significant changes, update replit.md to reflect them (the testing subagent has access to it for general context)
3. **Know the navigation**: Understand how to reach the feature you're testing
4. **Identify specifics**: Note relevant UI elements (selectors, labels) and API endpoints involved

If you just implemented a feature, you already have most of this context — use it immediately. If a test fails due to insufficient context, iterate and add more details. If stuck after multiple attempts, stop and ask the user for help.

## When to Use

- You have implemented or modified a feature and want to verify it works
- User flows through the application (login, forms, navigation, modals)
- UI components render and behave correctly, including visual changes (layout, styling)
- Frontend features that depend on JavaScript execution
- End-to-end flows spanning multiple pages or components
- Integrations like Stripe payments or authentication flows

## When NOT to Use

- Unit testing code logic — use standard test frameworks instead. Reserve `runTest()` for e2e validation; reserve unit tests for regressions and backend logic.
- API-only testing without a UI component — use `curl` or standard HTTP clients instead
- When the application is not running or accessible
- Load testing or performance testing

## Available Functions

### runTest

Run UI tests against the application using an automated Playwright-based testing subagent.

**Parameters:**

- `testPlan` (str, required): Description of what to test, including specific steps and expected outcomes
- `relevantTechnicalDocumentation` (str, optional): Technical context like database schema, API routes, or component details
- `defaultScreenWidth` (int, default 1280): Browser viewport width. For mobile, use 400 (Replit mobile webview compatible, only suggested).
- `defaultScreenHeight` (int, default 720): Browser viewport height. For mobile, use 720 (suggested).

**Returns:** Dict with:

- `status`: One of "success", "failure", "unable", "skipped", "blocked", or "error"
- `testOutput`: Detailed test output and observations
- `subagentId`: ID of the testing subagent (for reference)
- `screenshotPaths`: List of local screenshot file paths (e.g. `/tmp/testing-screenshots/<id>.jpeg`)

**Example:**

```javascript
const result = await runTest({
    testPlan: `
        Test the user login flow:
        1. [New Context] Create a new browser context
        2. [Browser] Navigate to the login page (path: /login)
        3. [Browser] Enter "test@example.com" in the email field
        4. [Browser] Enter "password123" in the password field
        5. [Browser] Click the "Sign In" button
        6. [Verify]
            - Assert redirect to the dashboard (path: /dashboard)
            - Assert user name appears in the header
    `,
    relevantTechnicalDocumentation: `
        - Login endpoint: POST /api/auth/login
        - Dashboard route: /dashboard
        - User name displayed in #user-header element
    `
});

if (result.status === 'success') {
    console.log("All tests passed!");
} else if (result.status === 'failure') {
    console.log("Tests failed");
    console.log(result.testOutput);
    for (const screenshotPath of result.screenshotPaths) {
        console.log(`See screenshot: ${screenshotPath}`);
    }
}
```

## Writing Effective Test Plans

Batch multiple `[Verify]` checks on the same page together when no actions occur between them. But if `[Browser]`, `[API]`, or `[DB]` steps occur between verifications, keep them in separate `[Verify]` blocks — verifications should be read-only blocks without side effects.

For UI testing, explicitly include interactions like hover effects, dialogs, modals, tooltips, dropdowns, and animations — the testing agent sometimes needs special handling for these (e.g., being told to dismiss a dialog before clicking).

### Best Practices

1. **Test one flow at a time**: Keep test plans focused on a single user journey
2. **Include expected outcomes**: Specify what success looks like — "A success toast should appear with message 'Saved!'"
3. **Provide technical context**: Include relevant DB schemas, API endpoints, CSS selectors, and auth requirements in `relevantTechnicalDocumentation`
4. **Specify test data**: Provide actual values to use, not placeholders
5. **Handle authentication**: If the app requires login, include login steps first
6. **Include setup steps**: If the test needs data to exist, explain how to create it

## Application State

The testing environment uses the **same development database** as you and the user. The application is not in a fresh state — it may contain existing data from prior usage.

- **Don't assume specific counts** — tests that assert "there are exactly 3 products" will break if other data exists
- **Don't test empty states** or rely on data you didn't create as part of the test plan
- **Generate unique values** for usernames, emails, titles, etc. using `nanoid` to avoid conflicts across test runs and with user data

## Limitations

- The testing subagent has a maximum number of steps before it needs to report results
- Some complex interactions (drag-and-drop, canvas operations) may be challenging
- Tests cannot access the file system directly
- If the application is not accessible or crashes, tests will report as "unable"

## Example Test Plans

```text
1. [New Context] Create a new browser context
2. [Browser] Navigate to the product page (path: /products)
3. [Browser] Click on the first product link
4. [Verify] Assert redirect to the product page (path: /product/${product1Id})
5. [Verify]
   - Ensure the product title is not too big
   - Ensure the overall color scheme is consistent with the rest of the page
   - Assert there are more than one products
   - Make sure the add to cart button is not hidden behind another element
   - Assert the product name is "Product 1"
6. [Browser] For the next dialog, accept the dialog.
7. [Browser] Click add to cart
8. [Browser] Click on cart
9. [Verify] Assert redirect to the cart page (path: /cart)
10. [Verify] Assert cart has the product displayed
```

```text
1. [New Context] Create a new browser context
2. [API] Create a new product by POST to the /api/products endpoint with a randomly generated product name (say ${product_name}), and price 100. Note the name and the id of the created product.
3. [Browser] Navigate to the product page (path: /products)
4. [Verify]
   - Ensure there is at least one product displayed
   - Assert the product name is "${product_name}"
   - Assert the product price is 100
```

```text
1. [New Context] Create a new browser context
2. [Browser] Navigate to the homepage (path: /)
3. [Browser] Enter a TODO list item with a randomly generated title ${nanoid(6)}. Note the title (say ${todo_title}) for future use.
4. [Browser] Click the add todo button
5. [Verify] Assert that the TODO list item is displayed with the title ${todo_title}
```

## Database Testing

If the application uses a database and you need to inject data, set roles, or verify DB state during tests, see `database-testing.md` for how to use `[DB]` steps in test plans.

## External Services

If the application connects to external services, be mindful of side effects. Clean up resources created during tests, and limit notifications sent to third parties. Balance thorough testing with responsible use of external services.

## Replit Auth

If the application uses Replit's OIDC auth — typically indicated by `javascript_log_in_with_replit` or `python_log_in_with_replit` in `.replit`, the presence of `replitAuth.ts` / `replit_auth.py`, `@workspace/replit-auth-web`, references to `replit.com/oidc`, or any other use of Replit's OIDC service — you *must* read `replit-auth.md` (in the same directory as this file) for how to handle programmatic login in test plans. Failing to do so when Replit Auth is part of the test flow will cause auth-related test failures and user frustration.


## Clerk Auth

If the application uses Clerk authentication (`@clerk/react`, `@clerk/clerk-react`, `@clerk/express`, or `CLERK_SECRET_KEY` env var), see `clerk-auth.md` for how to handle programmatic login in test plans.
