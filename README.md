# QA Commerce Lab

> **English Summary (for International Recruiters):** QA Commerce Lab is a full-stack e-commerce test automation portfolio (Node.js, TypeScript, Express, Prisma, PostgreSQL, React, Vite) featuring a complete testing pyramid: Vitest unit & Supertest API integration tests (including concurrency/race-condition protection), Playwright E2E with isolated per-test user fixtures, `axe-core` accessibility audits, k6 load testing, GitHub Actions CI quality gates, and an offline-capable **AI-Assisted Quality Engineering** module (`tools/ai-qa`) with log sanitization, failure classification, benchmark evaluation, and traceability matrix generation.

## Visão geral

Este projeto simula um pequeno fluxo de e-commerce para demonstrar práticas de QA Automation em um contexto próximo do real. O repositório inclui API, interface web, banco PostgreSQL, seed previsível, Docker, testes automatizados em múltiplas camadas e pipeline de validação no GitHub Actions.

## Objetivo do projeto

O foco deste projeto é demonstrar:

- automação de testes
- testes unitários
- testes de API
- testes E2E
- testes de acessibilidade
- teste de carga demonstrativo
- Docker
- CI/CD com GitHub Actions
- documentação de QA
- organização profissional de repositório

## Stack

### Aplicação
- Node.js
- TypeScript
- Express
- Prisma
- PostgreSQL
- React
- Vite

### Qualidade e testes
- Vitest
- Supertest
- Playwright
- axe-core
- k6
- ESLint

### Infraestrutura
- Docker
- Docker Compose
- GitHub Actions

## Funcionalidades

As funcionalidades implementadas hoje no projeto são:

- cadastro de usuário
- login com JWT
- autenticação para rotas protegidas
- catálogo de produtos
- busca por nome
- filtro por categoria
- carrinho de compras
- validação de estoque
- checkout fake
- criação de pedido
- seed de dados previsíveis

## Estratégia de QA

O projeto aplica uma pirâmide de testes simples e prática:

- testes unitários para regras de negócio isoladas
- testes de API para integração entre backend e banco
- testes E2E para fluxos críticos do usuário
- testes de acessibilidade para áreas principais da aplicação
- teste de carga demonstrativo para endpoints importantes

| Camada | Ferramenta | Objetivo |
|---|---|---|
| Unitário | Vitest | Validar regras de negócio como total do carrinho, estoque, preço e checkout |
| API | Vitest + Supertest | Validar contratos, autenticação e integração com PostgreSQL |
| E2E | Playwright | Validar jornadas críticas do usuário no navegador |
| Acessibilidade | Playwright + axe-core | Detectar violações críticas nas telas principais |
| Carga | k6 | Exercitar endpoints relevantes com uma carga demonstrativa |

## Estrutura do projeto

```txt
qa-commerce-lab/
  apps/
    backend/
    frontend/
  tests/
    e2e/
    load/
  docs/
  scripts/
  .github/workflows/
  docker-compose.yml
  docker-compose.test.yml
```

- `apps/backend`: API, schema Prisma, seed, testes unitários e testes de API
- `apps/frontend`: interface React para catálogo, autenticação, carrinho e checkout
- `tests/e2e`: cenários Playwright, page objects e checagens de acessibilidade
- `tests/load`: scripts de carga com k6
- `docs`: documentação de QA, estratégia, riscos, bugs e casos de teste
- `scripts`: automações para banco de teste, API e E2E
- `.github/workflows`: pipeline de CI

## Como rodar o projeto

```bash
npm install
npm run db:generate
docker compose up --build
```

Acessos principais:

- frontend: `http://localhost:4173`
- backend healthcheck: `http://localhost:3333/health`

## Como rodar os testes

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npm run test:api:docker
npm run test:e2e:docker
npm run test:load
```

Comandos úteis adicionais:

```bash
npm run test:api
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:report
npm run test:ai
npm run ai:evaluate
npm run ai:matrix
npm run ai:report
npm run test:all
```

Os comandos locais de testes de API e E2E recriam a massa do banco de testes.
Use um PostgreSQL descartável no próprio computador, com nome terminado em
`_test`, e confirme explicitamente o nome antes de executá-los. Por exemplo,
no PowerShell, para o banco do exemplo em `.env.test.example`:

```powershell
$env:TEST_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:55432/qa_commerce_lab_test?schema=public"
$env:QA_CONFIRM_TEST_DB = "qa_commerce_lab_test"
npm run test:api
npm run test:e2e
```

No Bash, use `export TEST_DATABASE_URL='...'` e
`export QA_CONFIRM_TEST_DB=qa_commerce_lab_test`. A suíte `test:api:local`
também requer `DATABASE_URL` apontando para o mesmo banco de teste. O seed
normal é idempotente e não limpa o banco. O reset explícito exige confirmação;
os testes Docker criam um projeto Compose isolado por execução e removem
somente recursos desse projeto.

## Validação do zero

```bash
git clone <repo-url>
cd qa-commerce-lab
npm install
npm run db:generate
npm run lint
npm run typecheck
npm run build
npm run test
npm run test:api:docker
npm run test:e2e:docker
docker compose up --build
```

## Relatórios

- cobertura unitária do backend: gerada por `npm run coverage`
- relatório HTML do Playwright: exibido com `npm run test:e2e:report`
- artifacts do GitHub Actions: relatório Playwright publicado pela pipeline de CI

## CI/CD

O workflow em `.github/workflows/ci.yml` valida:

- install
- lint
- typecheck
- build
- testes unitários
- testes de API
- testes E2E
- relatório Playwright como artifact

## Documentação de QA

Os arquivos em `docs/` complementam o projeto com visão de qualidade:

- `test-plan.md`: escopo, critérios, ambientes e abordagem geral de teste
- `test-cases.md`: casos de teste rastreáveis por funcionalidade e prioridade
- `bug-report-examples.md`: exemplos realistas de defeitos documentados
- `qa-strategy.md`: estratégia de camadas, trade-offs e redução de fragilidade
- `risk-analysis.md`: riscos principais, impacto, mitigação e cobertura relacionada
- `github-audit-2026.md`: auditoria comparativa dos repositórios e diagnóstico estrutural
- `ai-assisted-qa.md`: arquitetura do módulo de AI-Assisted QA, sanitização e benchmark
- `visual-e-carga.md`: baseline visual Windows e medições locais de carga com limitações

## Solução de problemas

### Docker Desktop fechado

Abra o Docker Desktop antes de rodar comandos com Docker, como:

```bash
docker compose up --build
npm run test:api:docker
npm run test:e2e:docker
```

### PostgreSQL não disponível

Os testes de API dependem de um banco de teste isolado. O fluxo recomendado é:

```bash
npm run test:api:docker
```

### Playwright sem browser instalado

Se você for rodar o fluxo local de E2E, instale o Chromium com:

```bash
npx playwright install --with-deps chromium
```

### Portas em uso

Se houver conflito de portas, identifique primeiro o serviço que as utiliza. Pare somente os serviços deste laboratório após confirmar que não contêm dados que você precisa preservar. Não remova volumes sem verificar seu conteúdo.

## O que este projeto demonstra

Este projeto demonstra capacidade de:

- estruturar um ambiente testável
- escrever testes em múltiplas camadas
- automatizar fluxos críticos
- trabalhar com Docker
- configurar CI
- documentar estratégia de QA
- pensar em riscos, cenários negativos e qualidade de produto

## Próximas melhorias

- testes visuais
- contract testing
- mutation testing
- SonarCloud
- Allure Report mais completo
- ambiente de staging
- mais cenários de acessibilidade
