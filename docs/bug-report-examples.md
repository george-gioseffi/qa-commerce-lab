# Registro de defeito: alteração de carrinho durante o checkout

- **ID:** BUG-CHECKOUT-001
- **Severidade:** alta
- **Prioridade:** alta
- **Ambiente:** backend local, PostgreSQL de teste isolado, Node.js e Supertest
- **Situação:** corrigido na branch do PR; regressão automatizada adicionada.

## Pré-condições

Conta de teste autenticada, produto disponível e uma unidade no carrinho.

## Reprodução controlada

1. Iniciar um checkout e interrompê-lo temporariamente após a leitura do carrinho.
2. Alterar a quantidade do item de 1 para 2 por outra requisição.
3. Retomar o checkout.

Antes da correção, a requisição retornou `201` e criou um pedido com a quantidade antiga, descartando a alteração concorrente. A condição foi reproduzida com uma barreira sincronizada em PostgreSQL de teste.

## Resultado esperado

O checkout deve detectar o conflito, retornar `409` e preservar o carrinho atualizado, sem criar pedido com dados antigos.

## Correção e evidência

O checkout usa uma transação serializável e converte conflitos de serialização em `409`. O teste `rejects checkout if the cart quantity changes after it was read`, em `apps/backend/src/test/api.spec.ts`, força a sequência acima e verifica o status, a ausência de pedidos e a preservação do carrinho.

O commit `4aa5f1c` contém a correção e o teste. Os artefatos da execução do workflow ficam disponíveis na [execução do GitHub Actions](https://github.com/george-gioseffi/qa-commerce-lab/actions/runs/44307461733); a disponibilidade dos artefatos está sujeita à retenção do GitHub.

O teste cobre essa sequência específica; ele não comprova ausência de todas as condições de corrida possíveis. Este registro é mantido no repositório e ainda não corresponde a uma issue separada no GitHub.
