# QA Commerce Lab

[English version (README.en.md)](README.en.md)

Portfólio prático de **QA Automation & Quality Engineering** aplicado a um e-commerce full-stack (`Node.js`, `TypeScript`, `Express`, `Prisma`, `PostgreSQL`, `React`, `Vite`), com suítes em múltiplas camadas, proteção contra condição de corrida no checkout, pipeline de CI no GitHub Actions e módulo **AI-Assisted QA** offline-first (`tools/ai-qa`).

---

## Visão geral e arquitetura de qualidade

O projeto simula um fluxo real de e-commerce (cadastro, login JWT, catálogo com busca e filtro por categoria, carrinho, validação de estoque, checkout atômico e histórico de pedidos) para demonstrar engenharia de qualidade reproduzível:

| Camada | Ferramentas | Escopo verificado |
|---|---|---|
| **Estática & Segurança** | ESLint, TypeScript, `node:test` | Lint, typecheck, build e guardas de isolamento de banco (`npm run test:safety`) |
| **Unitário** | Vitest + `@vitest/coverage-v8` | Regras de negócio isoladas (totais, estoque, preço e checkout) em `apps/backend/src/test/unit.spec.ts` |
| **API & Contrato** | Vitest + Supertest + Ajv 8 (`ajv-formats`) | Autenticação, isolamento entre usuários, concorrência no checkout e schemas representativos de `docs/openapi.yaml` |
| **E2E & Acessibilidade** | Playwright + `@axe-core/playwright` | Jornadas críticas com fixtures de usuário isoladas por teste e auditoria `axe-core` |
| **Visual (Windows)** | Playwright (`toHaveScreenshot`) | Baseline visual do cabeçalho em Chromium no Windows (executado em job dedicado no CI e ignorado no Linux) |
| **Carga (local)** | k6 | Ensaio demonstrativo de carga em endpoints de leitura (`tests/load/`), documentado em `docs/visual-e-carga.md` |
| **AI-Assisted QA** | Node.js (`tools/ai-qa`) | Sanitização de logs, classificação determinística de falhas, benchmark (`10/10`), matriz de cobertura e rastreabilidade sob revisão humana |

---

## Estrutura do repositório

```txt
qa-commerce-lab/
  apps/
    backend/          # API Express, Prisma, seed, testes unitários e de API
    frontend/         # Interface React + Vite (catálogo, auth, carrinho, checkout)
  tests/
    e2e/              # Suíte Playwright modular, page objects, fixtures e a11y
    load/             # Scripts de carga k6
  tools/
    ai-qa/            # CLI offline-first de análise de falhas, benchmark e relatórios
  docs/               # Estratégia, plano, casos, OpenAPI, bugs, riscos e roteiro de demo
  scripts/            # Guardas de banco de teste (_test) e runners locais/Docker
  .github/workflows/  # Pipeline CI (quality-gate, integration-and-e2e, visual-windows)
```

---

## Pré-requisitos

- **Node.js >= 22** e **npm**
- **PostgreSQL 16** local (porta `5432` ou `55432`) **ou** **Docker Desktop** com Docker Compose

---

## Como rodar a aplicação

### Opção 1: Docker Compose

```bash
npm install
npm run db:generate
docker compose up --build
```

### Opção 2: PostgreSQL local (sem Docker)

1. Copie `.env.example` para `.env` na raiz e ajuste `DATABASE_URL` e `JWT_SECRET` para um banco local.
2. Execute:

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Acessos padrão:
- **Frontend:** `http://localhost:4173`
- **Backend healthcheck:** `http://localhost:3333/health`

---

## Como rodar os testes (reproduzível)

### 1. Verificações estáticas, unitárias, segurança e AI-QA (sem banco)

```bash
npm run lint
npm run typecheck
npm run build
npm run coverage
npm run test:safety
npm run test:ai
npm run ai:evaluate
```

### 2. Testes de API e E2E com PostgreSQL local descartável (sem Docker)

Os comandos de API e E2E recriam a massa do banco de testes. Por segurança, os scripts exigem um banco cujo nome termine em `_test` e confirmação explícita em `QA_CONFIRM_TEST_DB`.

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

> Para testar apenas a regressão visual no Windows: `npm run test:visual --workspace @qa-commerce-lab/e2e`.
> Para instalar o navegador Chromium do Playwright caso ainda não esteja presente: `npm run install:browsers --workspace @qa-commerce-lab/e2e`.

### 3. Testes de API e E2E via Docker isolado

```bash
npm run test:api:docker
npm run test:e2e:docker
```

Cada execução Docker sobe um projeto Compose isolado e remove apenas os recursos criados por essa execução.

### 4. Carga (k6) e AI-Assisted QA CLI

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

O workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) é acionado em `push` e `pull_request` para `master` e `main` (`permissions: contents: read`) e executa três jobs:

1. **`Lint, Typecheck, Build & Unit`** (`ubuntu-latest`): `npm ci`, `db:generate`, `lint`, `typecheck`, `build`, `coverage`, `test:safety`, `test:ai`, `ai:evaluate` + artifact `unit-coverage`.
2. **`API, E2E & Accessibility`** (`ubuntu-latest` + `postgres:16`): `db:push`, `db:test:seed`, `test:api:local`, `test:e2e:local` (23 testes E2E/A11y; 1 teste visual ignorado no Linux), demonstração de falha controlada com trace, geração de relatórios AI-QA + artifact `qa-reports`.
3. **`Visual regression (Windows Chromium)`** (`windows-latest`): valida o snapshot visual em Chromium no Windows + artifact `visual-windows`.

---

## Relatórios e documentação de QA (`docs/`)

- [Plano de Testes (`docs/test-plan.md`)](docs/test-plan.md)
- [Casos de Teste (`docs/test-cases.md`)](docs/test-cases.md)
- [Estratégia de QA e Critérios de Release (`docs/qa-strategy.md`)](docs/qa-strategy.md)
- [Análise de Riscos (`docs/risk-analysis.md`)](docs/risk-analysis.md)
- [Bug Report e Regressão de Concorrência (`docs/bug-report-examples.md`)](docs/bug-report-examples.md)
- [Rastreabilidade e Lacunas (`docs/rastreabilidade.md`)](docs/rastreabilidade.md)
- [Contrato OpenAPI 3.0 (`docs/openapi.yaml`)](docs/openapi.yaml)
- [AI-Assisted QA (`docs/ai-assisted-qa.md`)](docs/ai-assisted-qa.md)
- [Padrões de Automação e Depuração (`docs/automation-and-debugging.md`)](docs/automation-and-debugging.md)
- [Exploração Supervisionada com Playwright MCP (`docs/playwright-mcp.md`)](docs/playwright-mcp.md)
- [Testes Visuais e Carga k6 (`docs/visual-e-carga.md`)](docs/visual-e-carga.md)
- [Roteiro de Demonstração (`docs/demonstracao.md`)](docs/demonstracao.md)
- [Auditoria do Portfólio (`docs/github-audit-2026.md`)](docs/github-audit-2026.md)

---

## Escopo honesto e limitações conhecidas

- **Contrato OpenAPI:** a validação com `Ajv` na suíte de API cobre respostas representativas (`200`/`201`/`400`/`404`) dos fluxos principais; não valida todas as permutações de erro (`401`/`409` ou `PATCH`/`DELETE` via Ajv) nem usa middleware OpenAPI completo.
- **AI-Assisted QA:** executado por padrão em modo determinístico offline (`deterministic-heuristic-v1`). Há dois adaptadores opcionais desacoplados em `tools/ai-qa/`:
  - `tools/ai-qa/classifier.mjs` (`AI_QA_API_KEY` + `AI_QA_ENDPOINT`): não exercitado contra provedor externo neste ambiente.
  - `tools/ai-qa/opencode-free.mjs` (`AI_QA_OPENCODE_FREE=1`, `AI_QA_OPENCODE_BIN` opcional) é experimental e só tenta uma chamada por processo. O prompt contém apenas rótulos fixos de categoria e confiança; o cliente OpenCode pode acrescentar contexto e metadados próprios. Usa modelo fixo `opencode/deepseek-v4.1-flash-free`, diretório e perfil temporários, políticas de negação para ferramentas, plugins e MCP, timeout e fallback local em caso de erro. Só opera no Linux, com `/tmp` não redirecionado, para não expor caminhos de usuários de outras plataformas; no Windows e macOS permanece local. Exige OpenCode 2.2.6 ou posterior da série 2 e recusa configurações externas potencialmente conflitantes; não é uma sandbox de sistema operacional. O custo informado é verificado após a chamada e as condições do provedor podem mudar. Os testes usam mocks; na VPS o adaptador encontrou limite `429` e usou o fallback, portanto ainda não há resposta real bem-sucedida pela integração.
- **Testes Visuais:** baseline restrita ao cabeçalho em Chromium no Windows (ignorada no job Linux do CI).
- **Testes de Carga (k6):** executados em ensaio local de leitura (fora do pipeline de CI).

---

## Solução de problemas

- **Docker Desktop fechado:** inicie o Docker Desktop antes de rodar `docker compose up --build`, `npm run test:api:docker` ou `npm run test:e2e:docker` — ou utilize o fluxo com PostgreSQL local descrito acima.
- **Playwright sem navegador:** rode `npm run install:browsers --workspace @qa-commerce-lab/e2e`.
- **Conflito de portas (`3333`, `4173`, `5432`/`55432`):** identifique qual processo está usando a porta antes de encerrar serviços e nunca remova volumes com dados que precise preservar.
