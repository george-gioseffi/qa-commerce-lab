# Test Plan

## Objective
Validate the critical user journeys and quality gates of QA Commerce Lab with repeatable automated coverage.

## Scope
- Authentication
- Product catalog
- Cart management
- Fake checkout
- API behavior
- Accessibility smoke checks
- Demonstrative load scripts

## Out Of Scope
- Real payment integrations
- Email delivery
- Mobile app coverage
- Cross-browser visual regression

## Test Types
- Unit tests
- API tests
- End-to-end tests
- Accessibility checks
- Load smoke tests

## Environments
- Local Docker environment
- Local node-based environment
- Isolated PostgreSQL test environment on port `55432`
- GitHub Actions CI environment

## Entry Criteria
- Dependencies installed
- Database available
- Playwright browsers installed for local E2E execution
- Prisma schema applied
- Seed completed
- Backend and frontend configured

## Exit Criteria
- No blocking defects in auth, cart or checkout
- Unit, API and E2E suites passing
- Accessibility smoke checks without critical issues
- CI pipeline green
- Docker startup path documented and reproducible

## Risks
- Shared seeded data can create state coupling if suites run against the same database
- Checkout depends on synchronized stock and cart data
- Docker startup time can affect E2E stability
- Browser binaries missing locally can block Playwright execution

## Tooling
- Vitest
- Supertest
- Playwright
- axe-core
- k6
- Prisma
- Docker Compose
- GitHub Actions
