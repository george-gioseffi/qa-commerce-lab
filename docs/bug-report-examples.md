# Bug Report Examples

## BUG-001
- Title: Checkout allowed empty order creation
- Environment: Local Docker
- Severity: Critical
- Priority: High
- Steps to reproduce: Login, leave cart empty, call checkout endpoint
- Expected result: Request blocked with validation message
- Actual result: Empty order was created
- Expected evidence: API response body and order row in database
- Status: Fixed

## BUG-002
- Title: Cart accepted quantity above available stock
- Environment: CI and local node environment
- Severity: High
- Priority: High
- Steps to reproduce: Login, add 999 units of a seeded product
- Expected result: Quantity rejected
- Actual result: Cart item persisted
- Expected evidence: API request payload, response and DB row
- Status: Fixed

## BUG-003
- Title: Duplicate email registration returned 500 instead of 409
- Environment: Local backend
- Severity: Medium
- Priority: High
- Steps to reproduce: Register twice with the same email
- Expected result: Conflict response
- Actual result: Unhandled exception
- Expected evidence: Server logs and response status
- Status: Fixed

## BUG-004
- Title: Search field was missing stable selector for automation
- Environment: E2E suite
- Severity: Low
- Priority: Medium
- Steps to reproduce: Attempt to automate search using UI text selector
- Expected result: Stable data-testid available
- Actual result: Selector depended on placeholder text only
- Expected evidence: Test source and DOM snapshot
- Status: Fixed

## BUG-005
- Title: Anonymous checkout error message was not visible in UI
- Environment: Frontend local app
- Severity: Medium
- Priority: Medium
- Steps to reproduce: Open app, click checkout without logging in
- Expected result: Clear blocking feedback displayed
- Actual result: Request failed silently for the user
- Expected evidence: Screen recording and browser console
- Status: Fixed
