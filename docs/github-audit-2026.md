# Auditoria Completa do GitHub — `george-gioseffi` (2026)

## Objetivo

Comparar projetos públicos da conta `george-gioseffi` para selecionar e evoluir o projeto principal de portfólio em **QA Automation + AI-Assisted Quality Engineering**. Dados de projetos privados não são publicados neste relatório.

## Matriz Comparativa

| Repositório | Visibilidade | Stack Principal | Arquitetura | Arquivos de Teste | CI/CD Atual | Execução Local | Potencial Portfólio QA + IA |
|---|---|---|---|---|---|---|---|
| `qa-commerce-lab` | Público | Node.js, TypeScript, Express, Prisma, PostgreSQL, React, Vite | Monorepo npm workspaces (`apps/backend`, `apps/frontend`, `tests/e2e`, `tests/load`) | Unit (Vitest), API (Supertest), E2E + A11y (Playwright + axe-core), Load (k6) | Existia em `qa-commerce-lab/.github/workflows/ci.yml` (não reconhecido pelo GitHub + trigger `main` em repo `master`) | Alta (PostgreSQL + Docker + npm scripts) | **Muito Alto** — stack completa de QA já estruturada |
| `licitscope` | Público | Python, FastAPI, SQLAlchemy | Monorepo (`apps/api`, `apps/web`) | 15 arquivos pytest (API, parser, OpenAPI contract, scoring) | `.github/workflows/ci.yml` + `codeql.yml` | Média (Python + serviços) | Alto para backend/data, porém domínio específico de licitações e sem E2E/Playwright |
| `forgeops` | Público | Python (FastAPI) + Next.js | Monorepo (`apps/api`, `apps/web`) | 1 arquivo (`test_analyzer.py`) | Sem workflows no `.github` | Média | Médio — cobertura de testes incipiente |
| `fb2x` | Público | Node.js, TypeScript | Serviço de cross-post | Sem suíte automatizada (`examples/*.sh`) | Sem workflows no `.github` | Média | Baixo para portfólio de QA |

## Diagnóstico do Repositório Escolhido (`qa-commerce-lab`)

### Problemas estruturais comprovados na auditoria inicial
1. **Projeto aninhado**: todo o código estava dentro de uma subpasta `qa-commerce-lab/`, impedindo o GitHub Actions de detectar `.github/workflows/ci.yml`.
2. **Branch padrão vs trigger de CI**: a branch padrão do repositório é `master`, mas o workflow configurava `push: branches: ["main"]`. Resultado: **0 execuções de CI registradas no GitHub**.
3. **Bugs funcionais e de concorrência identificados**:
   - `PATCH` e `DELETE` em `/api/cart/items/:productId` lançavam erro Prisma `P2025` (500) quando o item não existia no carrinho em vez de `404`.
   - `POST /api/checkout` lia `cartItems` fora da transação e decrementava estoque sem trava atômica, permitindo condição de corrida em checkouts simultâneos do mesmo usuário.
   - O filtro de categorias no frontend derivava opções da lista já filtrada, fazendo outras categorias desaparecerem após selecionar uma categoria.
   - `scripts/run-e2e-tests.mjs` definia `PLAYWRIGHT_BASE_URL` incondicionalmente, desabilitando o `webServer` do Playwright em execuções locais.

## Decisão

**Repositório selecionado**: `george-gioseffi/qa-commerce-lab` (branch de evolução `feat/qa-portfolio-2026`, preservando `master`).

Justificativa: é público, já possui as 5 camadas da pirâmide (Unit, API, E2E, Acessibilidade e Carga), utiliza a stack mais demandada no mercado de QA Automation (TypeScript + Playwright + Vitest + Supertest + axe-core + k6 + PostgreSQL) e permite demonstrar correção real de arquitetura, concorrência, CI/CD e AI-Assisted QA.
