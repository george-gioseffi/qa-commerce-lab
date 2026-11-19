# Padrões de Automação e Guia de Depuração

## Padrões Obrigatórios de Automação (Playwright + TypeScript)

- **Sem `waitForTimeout`**: sincronização deve usar web-first assertions (`toBeVisible`, `toHaveText`, `toHaveCount`) ou espera explícita de resposta.
- **Locators estáveis**: priorizar roles/labels acessíveis (`getByRole`, `getByLabel`) e `data-testid` quando o texto puder variar.
- **Isolamento por teste**: cada cenário autenticado usa a fixture `isolatedUser` (`tests/e2e/tests/fixtures/auth.ts`), evitando carrinho compartilhado entre testes.
- **Independência de ordem**: nenhum teste pode depender do estado deixado pelo teste anterior.
- **Page Object enxuto**: `tests/e2e/tests/pages/home.page.ts` encapsula ações recorrentes sem abstrações excessivas.

## Guia Rápido de Depuração

### 1. Falha em teste E2E
1. Verifique o resumo no terminal ou abra o relatório HTML:
   ```bash
   npm run test:e2e:report
   ```
2. Para inspecionar timeline, rede e DOM de uma falha:
   ```bash
   npx --workspace @qa-commerce-lab/e2e playwright show-trace tests/e2e/test-results/<pasta-da-falha>/trace.zip
   ```
3. Gere a triagem automática sanitizada sobre o `results.json`:
   ```bash
   npm run ai:analyze -- --offline
   ```

### 2. Falha de conexão com banco de teste
- Confirme que `TEST_DATABASE_URL` aponta para um banco cujo nome termina em `_test` (proteção em `apps/backend/prisma/seed-policy.ts`).
- Execute `npm run db:test:push` e `npm run db:test:seed` antes de rodar `npm run test:api:local`.

### 3. Divergência no teste visual (`visual.spec.ts`)
- A baseline `home-hero-chromium-win32.png` é mantida para Windows Chromium e executada no job `visual-windows`.
- Nunca atualize snapshots automaticamente sem inspecionar o diff gerado em `tests/e2e/test-results/`.
