# Exploração Supervisionada com `@playwright/mcp`

## Papel na Estratégia de QA

O `@playwright/mcp` (Model Context Protocol server oficial do Playwright) complementa a suíte automatizada com **exploração supervisionada da aplicação local** durante o desenvolvimento de novos fluxos ou investigação de falhas.

- **Exploração agentic**: navegar pelas telas, inspecionar árvore de acessibilidade, identificar controles e reproduzir comportamentos manualmente com assistência de agente.
- **Automação reproduzível**: nenhum cenário descoberto via MCP substitui testes versionados. Todo fluxo validado deve ser convertido em especificação determinística em `tests/e2e/tests/*.spec.ts` e executado sem dependência de agente no CI.

## Configuração Local (Opcional)

Com a aplicação rodando localmente em `http://127.0.0.1:4173` (frontend) e `http://127.0.0.1:3333` (backend) contra banco de teste isolado:

```bash
npx @playwright/mcp@latest --headless
```

Exemplo de configuração para clientes compatíveis com MCP:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--headless"]
    }
  }
}
```

## Fluxo Recomendado

1. Subir a aplicação local apontando exclusivamente para `TEST_DATABASE_URL` (`qa_commerce_lab_test`).
2. Usar o servidor `@playwright/mcp` para explorar uma jornada ou inspecionar violações/estados inesperados.
3. Registrar o cenário validado como teste automatizado em `tests/e2e/tests/` usando `HomePage` e `isolatedUser`.
4. Validar o teste em execução limpa com `npm run test:e2e`.
