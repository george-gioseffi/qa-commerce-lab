# Roteiro reproduzível para apresentação

Este roteiro usa apenas dados sintéticos, não exige API de IA paga e não executa o Docker automaticamente. Os resultados devem ser apresentados junto ao commit e ao ambiente usados; os comandos abaixo não são evidência de execução por si só.

## Preparação

Use checkout limpo, Node.js 22 ou superior e Chromium do Playwright. Para API e E2E, inicie previamente um PostgreSQL **local, descartável e exclusivo de teste**, com nome terminado em `_test`. Os comandos de teste recriam a massa desse banco. Não aponte para banco com dados úteis.

```bash
npm ci
npm run db:generate
npx playwright install chromium
```

Exemplo PowerShell, somente se o banco descartável do exemplo estiver ativo na porta 55432:

```powershell
$env:TEST_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:55432/qa_commerce_lab_test?schema=public"
$env:QA_CONFIRM_TEST_DB = "qa_commerce_lab_test"
$env:CI = "true"
npm run lint
npm run typecheck
npm run build
npm run test
npm run test:api
npm run test:e2e
```

`CI=true` impede reutilização silenciosa dos servidores web existentes; libere antes as portas 3333 e 4173 ou ajuste o ambiente do laboratório. Se uma etapa falhar ou pular testes, mostre esse resultado em vez de considerá-la aprovada.

## Teste negativo, trace e relatórios

Os testes de credenciais inválidas e conflitos no checkout fazem parte da suíte oficial. Para demonstrar um **trace de falha controlada**, execute separadamente:

```bash
npm run demo:failure --workspace @qa-commerce-lab/e2e
```

Esse comando intercepta a API do catálogo e simula um erro 503; uma asserção deliberadamente contraditória falha e o comando termina com código diferente de zero **por desenho**. Não é um defeito real nem pertence à suíte oficial. Abra `tests/e2e/demo-report/index.html` ou use `npx playwright show-trace <caminho-do-trace.zip>` com o caminho exibido pelo comando. Não atualize o baseline visual por causa dessa demonstração.

O CI executa essa demonstração separadamente da suíte oficial e verifica que a falha foi a asserção esperada e que o trace existe. Para analisar o resultado demonstrativo sem fazer chamadas externas, execute `npm run ai:analyze -- --offline --results tests/e2e/demo-test-results/results.json --output demo-failure-analysis.json`. O resultado fica em `reports/demo-failure-analysis.json`; é uma hipótese para triagem, não diagnóstico comprovado.

Para os testes oficiais, o relatório HTML fica em `tests/e2e/playwright-report/index.html`; XML e JSON em `tests/e2e/test-results/`. `npm run ai:report` gera um resumo a partir dos resultados disponíveis. Se não houver relatório Playwright, ele registra a ausência, não um sucesso.

## Risco, correção e IA

- O [defeito de concorrência](bug-report-examples.md) descreve uma corrida reproduzida e seu teste de regressão; a [issue #2](https://github.com/george-gioseffi/qa-commerce-lab/issues/2) permanece aberta enquanto o PR está em revisão.
- `npm run ai:traceability` verifica referências revisadas em [rastreabilidade](rastreabilidade.md); `npm run ai:scenarios` cria propostas determinísticas para revisão, não testes oficiais.
- `npm run ai:evaluate` avalia o classificador determinístico em dez exemplos. Não apresenta desempenho de modelo externo nem demonstra melhoria de produtividade.
- `npm run ai:analyze` analisa falhas do JSON do Playwright quando houver resultados. Como contém evidências de testes, revise os relatórios locais antes de compartilhar.
- `npm run ai:prioritize -- --base <base> --head <head>` sugere ordem com base no diff real; o CI completo continua necessário.

O [PR de portfólio](https://github.com/george-gioseffi/qa-commerce-lab/pull/1) contém links para o CI e artefatos. Testes de carga e visuais estão documentados em [visual-e-carga](visual-e-carga.md), com suas limitações.
