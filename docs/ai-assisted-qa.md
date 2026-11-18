# AI-Assisted Quality Engineering (`tools/ai-qa`)

## Princípio de Arquitetura

A IA neste repositório **auxilia o trabalho de QA** sem substituir testes determinísticos nem inventar métricas.

- **Modo padrão determinístico**: funciona 100% offline, sem depender de API paga ou chaves externas.
- **Adaptador LLM opcional**: desacoplado via `AI_QA_API_KEY` e `AI_QA_ENDPOINT` HTTPS, com timeout de 5s, limite de tokens e fallback automático para o classificador determinístico. Envia apenas categoria e nível de confiança de uma lista fixa; não envia logs, títulos, caminhos ou anexos.
- **Segurança e sanitização**: `tools/ai-qa/sanitizer.mjs` mascara formatos comuns de JWTs, senhas e chaves em relatórios locais. A filtragem é limitada e não garante a remoção de todos os dados pessoais ou segredos; revise os artefatos antes de compartilhá-los.
- **Separação entre evidência e hipótese**: toda análise registra `evidence` (erro sanitizado, anexos, arquivos alterados) separada de `hypothesis` e `verifiedAfterFix: false` — nenhum defeito é marcado como corrigido sem nova execução dos testes.

## Módulos Implementados

| Comando | Função | Saída |
|---|---|---|
| `npm run ai:analyze` | Lê `tests/e2e/test-results/results.json`, sanitiza falhas e classifica causa raiz | `reports/ai-failure-analysis.json` |
| `npm run ai:evaluate` | Executa benchmark contra dataset rotulado (`tools/ai-qa/benchmark/known-failures.json`) | `reports/ai-benchmark.json` |
| `npm run ai:matrix` | Cruza requisitos de negócio com os casos de teste reais do repositório | `reports/traceability-matrix.json` |
| `npm run ai:prioritize` | Mapeia arquivos alterados no `git diff` para sugerir ordem de execução de suítes | stdout JSON |
| `npm run ai:report` | Consolida métricas reais de Playwright, matriz e benchmark em relatório executivo | `reports/executive-summary.md` e `.json` |
| `npm run test:ai` | Testes unitários do sanitizador e classificador | stdout TAP/node:test |

## Limitações Conhecidas

- O classificador determinístico baseia-se em assinaturas de erro conhecidas; falhas inéditas são marcadas como `UNCLASSIFIED` com confiança `low` para triagem humana.
- O adaptador externo recebe somente sinais resumidos, o que reduz o contexto disponível para o diagnóstico. A configuração de um provedor real deve ser testada separadamente; o benchmark atual avalia apenas o classificador determinístico.
- A priorização de PR sugere ordem de feedback rápido, mas o pipeline completo de CI continua obrigatório antes do merge.
