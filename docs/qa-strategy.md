# QA Strategy

QA Commerce Lab uses a layered strategy so each test type answers a different question with the right cost and feedback speed.

## Why Unit, API And E2E
- Unit tests validate isolated business rules such as totals, stock and checkout guards.
- API tests validate integration between routes, middleware, Prisma and the database contract.
- E2E tests validate user-facing confidence, selectors, accessibility and the happy-path flow.

## What Lives In Each Layer
- Unit: deterministic rules with no I/O
- API: authentication, product retrieval, cart and checkout behavior against an isolated PostgreSQL test database
- E2E: realistic UI journeys and regression smoke checks with backend and frontend started automatically or through Docker

## Tradeoffs
- E2E offers the highest confidence but slower feedback and more setup cost.
- API tests cover most backend risk with lower fragility than browser tests.
- Unit tests are fastest but cannot replace integrated validation.

## How Fragility Is Reduced
- Seeded data keeps scenarios predictable.
- Stable `data-testid` selectors avoid copy-driven locators.
- API tests use a dedicated test database instead of the development database.
- Each flow asserts user-visible outcomes, not implementation details.

## CI Usage
- CI enforces lint, typecheck, unit, API and headless E2E validation on every push and pull request.
- Playwright HTML reports are uploaded as artifacts for debugging failures.
- Schema push and seed happen before integrated test execution so the environment starts from a known baseline.

## Reports Matter
- Coverage and Playwright reports make the repository reviewer-friendly.
- Failures become easier to triage with traces, screenshots and explicit scenarios.

## Critérios de Bloqueio de Release
Uma release ou merge para `master` deve ser bloqueada quando ocorrer qualquer uma das condições abaixo:
- Falha em `lint`, `typecheck`, `build` ou testes unitários (`npm run test`).
- Falha em testes de API (`npm run test:api:local`), segurança (vazamento de `passwordHash`, escalação de privilégio) ou concorrência no checkout.
- Falha em qualquer cenário crítico E2E (`@smoke`, `@auth`, `@cart`, `@checkout`) ou violação `critical`/`serious` no `axe-core`.
- Exposição de segredos, credenciais ou arquivos `.env` no histórico do commit.

## Política de Defeitos
- **Crítica / Alta**: bloqueia release, exige reprodução determinística, issue vinculada no GitHub e teste de regressão automatizado antes do fechamento.
- **Média**: deve ser triada com passos de reprodução, evidência (trace/log) e plano de correção no ciclo atual ou próximo.
- **Baixa**: registrada para melhoria contínua sem bloquear entrega funcional.
- Nenhum defeito pode ser marcado como corrigido apenas por análise estática ou hipótese de IA: exige nova execução verde do teste de regressão.
