# QA Commerce Lab

[Versão em Português (README.md)](README.md)

A practical **QA Automation & Quality Engineering** portfolio built around a full-stack e-commerce application (`Node.js`, `TypeScript`, `Express`, `Prisma`, `PostgreSQL`, `React`, `Vite`), featuring multi-layer automated test suites, a checkout concurrency regression fix, GitHub Actions CI quality gates, and an offline-first **AI-Assisted QA** module (`tools/ai-qa`).

---

## Overview and Quality Architecture

The project simulates a realistic e-commerce workflow (user registration, JWT login, product catalog with search and category filtering, shopping cart, stock validation, atomic checkout, and order history) to demonstrate reproducible quality engineering:

| Layer | Tools | Verified Scope |
|---|---|---|
| **Static & Safety** | ESLint, TypeScript, `node:test` | Lint, typecheck, build, and test-database isolation guards (`npm run test:safety`) |
| **Unit** | Vitest + `@vitest/coverage-v8` | Isolated business rules (totals, stock, pricing, checkout) in `apps/backend/src/test/unit.spec.ts` |
| **API & Contract** | Vitest + Supertest + Ajv 8 (`ajv-formats`) | Auth, cross-user isolation, checkout concurrency, and representative `docs/openapi.yaml` schema checks |
| **E2E & Accessibility** | Playwright + `@axe-core/playwright` | Critical user journeys with per-test isolated user fixtures and `axe-core` accessibility audits |
| **Visual (Windows)** | Playwright (`toHaveScreenshot`) | Header visual baseline on Windows Chromium (dedicated CI job; explicitly skipped on Linux) |
| **Load (local)** | k6 | Demonstrative read-endpoint load script (`tests/load/`), documented in `docs/visual-e-carga.md` |
| **AI-Assisted QA** | Node.js (`tools/ai-qa`) | Log sanitization, deterministic failure classification, `10/10` benchmark, coverage matrix, and human-reviewed traceability |

---

## Repository Structure

```txt
qa-commerce-lab/
  apps/
    backend/          # Express API, Prisma schema, seed, unit and API tests
    frontend/         # React + Vite UI (catalog, auth, cart, checkout)
  tests/
    e2e/              # Modular Playwright suite, page objects, fixtures, and a11y checks
    load/             # k6 load testing scripts
  tools/
    ai-qa/            # Offline-first CLI for failure analysis, benchmark, and reports
  docs/               # QA strategy, test plan, cases, OpenAPI, bugs, risks, and demo guide
  scripts/            # Test DB safety guards (_test) and local/Docker test runners
  .github/workflows/  # CI pipeline (quality-gate, integration-and-e2e, visual-windows)
```

---

## Prerequisites

- **Node.js >= 22** and **npm**
- Local **PostgreSQL 16** (`5432` or `55432`) **or** **Docker Desktop** with Docker Compose

---

## Running the Application

### Option 1: Docker Compose

```bash
npm install
npm run db:generate
docker compose up --build
```

### Option 2: Local PostgreSQL (without Docker)

1. Copy `.env.example` to `.env` at the repository root and set `DATABASE_URL` and `JWT_SECRET` for a local database.
2. Run:

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Default endpoints:
- **Frontend:** `http://localhost:4173`
- **Backend healthcheck:** `http://localhost:3333/health`

---

## Running Tests (Reproducible)

### 1. Static checks, unit tests, safety guards, and AI-QA (no database required)

```bash
npm run lint
npm run typecheck
npm run build
npm run coverage
npm run test:safety
npm run test:ai
npm run ai:evaluate
```

### 2. API and E2E tests against a disposable local PostgreSQL (no Docker)

API and E2E runners reset test data. For safety, scripts require a database name ending in `_test` and explicit confirmation via `QA_CONFIRM_TEST_DB`.

**PowerShell (Windows):**

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/qa_commerce_lab_test?schema=public"
$env:TEST_DATABASE_URL = $env:DATABASE_URL
$env:QA_CONFIRM_TEST_DB = "qa_commerce_lab_test"
$env:JWT_SECRET = "local-test-secret-key"

npm run db:push
npm run db:test:seed
npm run test:api:local
npm run db:test:seed
npm run test:e2e
```

**Bash (Linux/macOS):**

```bash
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/qa_commerce_lab_test?schema=public"
export TEST_DATABASE_URL="$DATABASE_URL"
export QA_CONFIRM_TEST_DB="qa_commerce_lab_test"
export JWT_SECRET="local-test-secret-key"

npm run db:push
npm run db:test:seed
npm run test:api:local
npm run db:test:seed
npm run test:e2e
```

> To run only Windows visual regression: `npm run test:visual --workspace @qa-commerce-lab/e2e`.
> To install Playwright Chromium if missing: `npm run install:browsers --workspace @qa-commerce-lab/e2e`.

### 3. API and E2E tests via isolated Docker Compose

```bash
npm run test:api:docker
npm run test:e2e:docker
```

Each Docker run spins up an isolated Compose project and cleans up only its own resources.

### 4. Load Testing (k6) and AI-Assisted QA CLI

```bash
npm run test:load
npm run ai:matrix
npm run ai:traceability
npm run ai:scenarios
npm run ai:prioritize
npm run ai:report
```

---

## CI/CD (GitHub Actions)

The workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml) runs on `push` and `pull_request` to `master` and `main` (`permissions: contents: read`) across three jobs:

1. **`Lint, Typecheck, Build & Unit`** (`ubuntu-latest`): `npm ci`, `db:generate`, `lint`, `typecheck`, `build`, `coverage`, `test:safety`, `test:ai`, `ai:evaluate` + `unit-coverage` artifact.
2. **`API, E2E & Accessibility`** (`ubuntu-latest` + `postgres:16`): `db:push`, `db:test:seed`, `test:api:local`, `test:e2e:local` (23 E2E/A11y tests; 1 visual test explicitly skipped on Linux), controlled failure trace verification, AI-QA report generation + `qa-reports` artifact.
3. **`Visual regression (Windows Chromium)`** (`windows-latest`): validates the Windows Chromium snapshot baseline + `visual-windows` artifact.

---

## QA Documentation (`docs/`)

All detailed QA documentation lives in `docs/` (written in Portuguese):

- [Test Plan (`docs/test-plan.md`)](docs/test-plan.md)
- [Test Cases (`docs/test-cases.md`)](docs/test-cases.md)
- [QA Strategy & Release Gates (`docs/qa-strategy.md`)](docs/qa-strategy.md)
- [Risk Analysis (`docs/risk-analysis.md`)](docs/risk-analysis.md)
- [Bug Report & Concurrency Regression (`docs/bug-report-examples.md`)](docs/bug-report-examples.md)
- [Traceability & Known Gaps (`docs/rastreabilidade.md`)](docs/rastreabilidade.md)
- [OpenAPI 3.0 Contract (`docs/openapi.yaml`)](docs/openapi.yaml)
- [AI-Assisted QA (`docs/ai-assisted-qa.md`)](docs/ai-assisted-qa.md)
- [Automation & Debugging Standards (`docs/automation-and-debugging.md`)](docs/automation-and-debugging.md)
- [Playwright MCP Exploration (`docs/playwright-mcp.md`)](docs/playwright-mcp.md)
- [Visual & k6 Load Testing (`docs/visual-e-carga.md`)](docs/visual-e-carga.md)
- [Demo Walkthrough (`docs/demonstracao.md`)](docs/demonstracao.md)
- [Portfolio Audit (`docs/github-audit-2026.md`)](docs/github-audit-2026.md)

---

## Honest Scope and Known Limitations

- **OpenAPI Contract:** `Ajv` validation in the API suite covers live responses (`200`/`201`/`204`/`400`/`401`/`404`/`409`) across core routes (auth, products, cart `POST`/`PATCH`/`DELETE`, checkout, and orders), but does not use full OpenAPI request/header middleware at runtime.
- **AI-Assisted QA:** runs by default in deterministic offline mode (`deterministic-heuristic-v1`). Two optional decoupled adapters exist in `tools/ai-qa/`:
  - `tools/ai-qa/classifier.mjs` (`AI_QA_API_KEY` + `AI_QA_ENDPOINT`): not exercised against a live external provider in this environment.
  - `tools/ai-qa/opencode-free.mjs` (`AI_QA_OPENCODE_FREE=1`, optional `AI_QA_OPENCODE_BIN`) is experimental and makes at most one request per process. Its prompt contains only fixed category/confidence labels; the OpenCode client may add its own context and metadata. It pins `opencode/deepseek-v4.1-flash-free`, uses a temporary directory and profile, denies tools, plugins and MCP through policies, enforces a timeout, and falls back locally on error. It runs only on Linux with a non-redirected `/tmp` to avoid exposing account paths on other systems; Windows and macOS remain offline. It requires OpenCode 2.2.6 or newer within major version 2 and refuses potentially conflicting broader configurations; this is not an operating-system sandbox. Reported cost is checked after the request and provider conditions may change. Tests use mocks; the VPS adapter hit rate limit `429` and used its local fallback, so no successful live response through this integration has yet been verified.
- **Visual Regression:** baseline covers the header in Windows Chromium only (skipped in the Linux CI job).
- **Load Testing (k6):** short (`20s`) read-endpoint smoke check (`/health` and `/api/products`) run in CI (`reports/k6-summary.json`) and locally via `npm run test:load`; it does not measure production capacity.

---

## Troubleshooting

- **Docker Desktop not running:** start Docker Desktop before running `docker compose up --build`, `npm run test:api:docker`, or `npm run test:e2e:docker`, or use the local PostgreSQL workflow above.
- **Playwright browser missing:** run `npm run install:browsers --workspace @qa-commerce-lab/e2e`.
- **Port conflicts (`3333`, `4173`, `5432`/`55432`):** inspect which process holds the port before stopping any service, and never delete volumes containing data you want to keep.
