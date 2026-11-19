// Curadoria humana: uma referência aponta para um teste, não prova sua execução.
const API = "apps/backend/src/test/api.spec.ts";
const E2E = "tests/e2e/tests";

export const reviewedRequirements = [
  {
    id: "AUTH-01", requirement: "Autenticação valida credenciais e recusa tokens inválidos ou expirados.",
    risk: "Acesso indevido ou perda de sessão sem explicação.", priority: "alta",
    tests: [
      { file: API, title: "logs in with valid credentials and rejects wrong password or unknown email" },
      { file: API, title: "enforces JWT authentication on /api/auth/me and rejects invalid/expired tokens" },
      { file: `${E2E}/auth.spec.ts`, title: "invalid stored token recovers cleanly to logged-out state" },
    ],
    gap: {
      title: "Recuperação visual de sessão expirada",
      objective: "Verificar o comportamento da interface quando um token expira durante a sessão.",
      preconditions: "Usuário sintético autenticado em banco isolado, com token expirado controlado.",
      steps: ["Abrir a aplicação com token expirado.", "Acionar uma operação protegida."],
      expected: "A interface informa a necessidade de autenticação e não apresenta dados protegidos como válidos.",
      type: "E2E",
    },
  },
  {
    id: "CAT-01", requirement: "O catálogo filtra produtos e apresenta ausência de resultados ou falha da API.",
    risk: "Cliente recebe resultados errados ou não percebe indisponibilidade.", priority: "média",
    tests: [
      { file: API, title: "lists products and supports search, category, combined filters, and empty results" },
      { file: `${E2E}/catalog.spec.ts`, title: "displays error banner when catalog API fails" },
    ],
    gap: {
      title: "Busca com espaços e caracteres especiais",
      objective: "Investigar o tratamento de entradas de busca de borda.",
      preconditions: "Catálogo sintético conhecido e disponível.",
      steps: ["Buscar usando espaços extras e caracteres especiais.", "Comparar resultado com a regra acordada para busca."],
      expected: "A resposta respeita a regra documentada, sem erro inesperado; definir a regra antes de automatizar.",
      type: "API e E2E",
    },
  },
  {
    id: "CART-01", requirement: "Operações de carrinho validam quantidades e preservam valores apresentados.",
    risk: "Perda de itens ou preço incorreto para o cliente.", priority: "alta",
    tests: [
      { file: API, title: "validates invalid quantities, missing products, and missing cart items" },
      { file: `${E2E}/cart-checkout.spec.ts`, title: "updates cart total, persists across reload, and removes item" },
      { file: `${E2E}/cart-checkout.spec.ts`, title: "shows error and preserves cart total when quantity update fails" },
    ],
    gap: {
      title: "Concorrência de alteração no carrinho em múltiplas abas",
      objective: "Verificar o comportamento da interface quando o carrinho é alterado em outra sessão antes da atualização.",
      preconditions: "Usuário sintético autenticado com um item no carrinho em duas sessões.",
      steps: ["Alterar ou remover o item na sessão A.", "Tentar atualizar a quantidade na sessão B."],
      expected: "O erro 404/409 fica visível e o total exibido é sincronizado sem estado enganoso.",
      type: "E2E",
    },
  },
  {
    id: "ORDER-01", requirement: "Checkout evita duplicação e preserva dados em conflitos conhecidos.",
    risk: "Pedido duplicado ou divergente do carrinho.", priority: "alta",
    tests: [
      { file: API, title: "prevents duplicate orders when two concurrent checkouts run for the same user" },
      { file: API, title: "rejects checkout if the cart quantity changes after it was read" },
      { file: API, title: "prevents overselling when stock drops before checkout" },
      { file: API, title: "allows at most one order when two users compete for the last unit" },
    ],
    gap: {
      title: "Retentativa do checkout após perda da resposta",
      objective: "Avaliar a recuperação quando o cliente não recebe a resposta de um checkout concluído.",
      preconditions: "Banco descartável e uma regra de idempotência explicitamente definida para a API.",
      steps: ["Interromper a resposta após o processamento do pedido.", "Repetir a solicitação e consultar pedidos e estoque."],
      expected: "O resultado segue a regra de idempotência acordada; definir o contrato antes de automatizar.",
      type: "API e banco",
    },
  },
  {
    id: "A11Y-01", requirement: "Áreas principais têm verificações automatizadas de acessibilidade e teclado.",
    risk: "Pessoas podem não conseguir navegar ou identificar controles.", priority: "alta",
    tests: [
      { file: `${E2E}/accessibility.spec.ts`, title: "home page has no critical or serious accessibility violations" },
      { file: `${E2E}/accessibility.spec.ts`, title: "keyboard navigation reaches search, filter, and auth controls" },
    ],
    gap: {
      title: "Verificação manual de foco visível e leitor de tela",
      objective: "Avaliar aspectos de acessibilidade que a verificação automática não comprova.",
      preconditions: "Aplicação local em funcionamento, teclado e leitor de tela disponíveis.",
      steps: ["Percorrer formulários e mensagens apenas com teclado.", "Repetir os fluxos principais com leitor de tela."],
      expected: "Foco é perceptível, ordem coerente e mensagens são anunciadas de maneira compreensível.",
      type: "manual",
    },
  },
  {
    id: "CONTRACT-01", requirement: "Respostas reais da API devem respeitar os schemas OpenAPI 3.0 documentados.",
    risk: "Quebra silenciosa de contrato entre backend, frontend e documentação.", priority: "alta",
    tests: [
      { file: API, title: "validates live API responses against OpenAPI 3.0 schemas in docs/openapi.yaml" },
      { file: API, title: "ignores role escalation on register and never exposes passwordHash" },
    ],
    gap: {
      title: "Validação de requestBody e headers via middleware OpenAPI completo",
      objective: "Complementar a validação de respostas com Ajv garantindo também conformidade de entrada em runtime.",
      preconditions: "Especificação docs/openapi.yaml mantida como fonte única.",
      steps: ["Submeter requisições com campos extras ou tipos inválidos fora dos casos já cobertos.", "Comparar resposta com o contrato."],
      expected: "Middleware ou validador de contrato rejeita desvios de entrada e saída de forma uniforme.",
      type: "API",
    },
  },
  {
    id: "SAFETY-01", requirement: "Scripts de reset e seed destrutivos não podem atingir bancos não descartáveis.",
    risk: "Perda acidental de dados locais ou remotos fora do ambiente de teste.", priority: "alta",
    tests: [
      { file: "scripts/safety.test.mjs", title: "a test reset requires a local test database and exact confirmation" },
      { file: "apps/backend/prisma/seed-policy.test.ts", title: "seed reset rejects an unconfirmed, non-test or remote target before connecting" },
    ],
    gap: {
      title: "Auditoria periódica de novos scripts de banco no repositório",
      objective: "Garantir que futuros scripts no package.json reutilizem a mesma trava _test e QA_CONFIRM_TEST_DB.",
      preconditions: "Alteração no package.json ou em scripts/.",
      steps: ["Revisar novos scripts que acessem Prisma/PostgreSQL.", "Confirmar bloqueio sem QA_CONFIRM_TEST_DB."],
      expected: "Nenhum comando destrutivo executa sem alvo local terminado em _test e confirmação explícita.",
      type: "Unitário/Segurança",
    },
  },
];
