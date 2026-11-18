# Risk Analysis

| Risk | Impact | Probability | Mitigation | Related Tests |
| --- | --- | --- | --- | --- |
| Invalid login or broken token validation | High | Medium | Protect routes with auth middleware and cover positive/negative auth flows | TC-004, TC-005, TC-006, TC-007 |
| Checkout creates orders with empty cart | High | Medium | Enforce checkout guard before transaction | TC-017, TC-018 |
| Stock inconsistency during cart updates | High | Medium | Validate requested quantity before persisting | TC-014, TC-015 |
| Price calculation mismatch | High | Low | Centralize cart total logic and cover with unit tests | TC-017, unit total tests |
| API availability issues in CI or Docker | Medium | Medium | Add healthchecks and staged startup in pipeline | CI smoke, Docker health |
| Functional regression in main shopping path | High | Medium | Keep a seeded E2E path from login to success screen | TC-008, TC-012, TC-017 |
| Inconsistent seeded data affects repeatability | Medium | Medium | Reset and reseed database before automated execution | API suite setup, CI seed step |
| Playwright browser binaries missing locally | Medium | Medium | Document browser installation and keep a containerized fallback | E2E setup, README troubleshooting |
| Docker daemon unavailable on reviewer machine | Medium | Medium | Fail fast with clear guidance and keep non-Docker scripts documented | Docker setup, README troubleshooting |
