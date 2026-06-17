# Test Cases

| ID | Feature | Scenario | Pre-condition | Steps | Expected Result | Priority | Test Type |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-001 | Auth | Register with valid data | User email not registered | Fill register form and submit | Account created and token returned | High | API |
| TC-002 | Auth | Register with invalid email | None | Submit malformed email | Validation error displayed | High | API |
| TC-003 | Auth | Register with duplicated email | Seeded user exists | Submit known email | Conflict response returned | High | API |
| TC-004 | Auth | Login with valid credentials | Seeded user exists | Submit correct credentials | Login succeeds | High | API |
| TC-005 | Auth | Login with wrong password | Seeded user exists | Submit wrong password | Unauthorized response shown | High | API/E2E |
| TC-006 | Auth | Access protected route without token | None | Call cart endpoint | Unauthorized response returned | High | API |
| TC-007 | Auth | Access protected route with token | Valid token available | Call cart endpoint | Cart data returned | High | API |
| TC-008 | Products | List all active products | Seed loaded | Open catalog | Product list visible | High | API/E2E |
| TC-009 | Products | Search by name | Seed loaded | Search for keyboard | Matching product shown | Medium | API/E2E |
| TC-010 | Products | Filter by category | Seed loaded | Select Audio category | Only Audio items remain | Medium | API |
| TC-011 | Products | Open nonexistent product | None | Request invalid product id | 404 returned | Medium | API |
| TC-012 | Cart | Add valid item to cart | Logged in user | Add item | Cart item created | High | API/E2E |
| TC-013 | Cart | Reject nonexistent product | Logged in user | Add missing product id | Not found returned | High | API |
| TC-014 | Cart | Reject quantity above stock | Logged in user | Add quantity greater than stock | Validation error returned | High | API/E2E |
| TC-015 | Cart | Update quantity | Item already in cart | Change quantity to 2 | Quantity updated | High | API/E2E |
| TC-016 | Cart | Remove item | Item already in cart | Remove item | Cart item deleted | Medium | API |
| TC-017 | Checkout | Successful fake checkout | Logged in user with cart items | Click checkout | Order created and cart cleared | High | API/E2E |
| TC-018 | Checkout | Reject empty cart checkout | Logged in user with empty cart | Click checkout | Validation error returned | High | API |
| TC-019 | Checkout | Reject checkout without login | Anonymous user | Click checkout | Login-required message shown | High | E2E |
| TC-020 | Accessibility | Home page critical audit | App loaded | Run axe on home | No critical violations | Medium | A11y |
| TC-021 | Accessibility | Cart panel critical audit | App loaded | Run axe on cart area | No critical violations | Medium | A11y |
| TC-022 | Load | Product list smoke load | Environment running | Execute k6 script | Thresholds stay acceptable | Low | Load |
