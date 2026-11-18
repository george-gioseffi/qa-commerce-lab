# Regressão visual e ensaio de carga local

## Visual

Após `npm run build:frontend`, `npm run test:visual --workspace @qa-commerce-lab/e2e` serve o bundle compilado e compara o cabeçalho da página com uma captura real revisada em Windows, usando o Chromium instalado pelo Playwright. A imagem de referência está versionada em `tests/e2e/tests/visual.spec.ts-snapshots/`. O cenário fixa viewport 1280 × 720, escala 1, tema claro e animações reduzidas; o catálogo é substituído por uma resposta vazia para evitar depender de imagens externas. A tolerância é de até 0,1% dos pixels.

Uma alteração temporária de cor no título foi detectada pelo teste; depois de restaurar a folha de estilo, a comparação voltou a passar. A execução principal no Linux marca este cenário como **ignorado**, pois a referência é Windows; o job `visual-windows` faz a comparação no Windows. A imagem não é uma referência portátil entre sistemas, versões de fonte ou browsers. Diferenças devem ser examinadas antes de qualquer atualização de referência.

## Ensaio k6

Em 18/11/2026 foi executado o script `tests/load/scripts/api-load.js` com k6 2.4.0 em Windows, Node 24.16 e PostgreSQL 16, contra um servidor e banco temporários locais. Foram usadas 1 VU por 5 s, 2 VUs por 10 s e 4 VUs por 5 s, com pausa de 1 s por iteração. As requisições foram somente de leitura para `/health` e `/api/products`.

| Medida | Resultado |
|---|---:|
| Requisições | 90 |
| Requisições com erro | 0 |
| Verificações de status HTTP aprovadas | 90 de 90 |
| Duração p95 das requisições | 2,74 ms |
| Média observada | 4,49 requisições/s |
| VUs ativas simultâneas máximas | 4 |

Na medição inicial o p95 foi 2,77 ms. A partir dela, o script usa p95 inferior a 250 ms como limite deliberadamente folgado de smoke local, além de exigir zero falhas HTTP e 100% de verificações aprovadas. Esse limite não é um SLA e deve ser revisto se o ambiente mudar. Os resultados não representam capacidade de produção, nem medem login ou checkout; o servidor de desenvolvimento, banco e gerador rodaram na mesma máquina, e a pausa controla a intensidade. O script rejeita destinos que não sejam `127.0.0.1`, não segue redirecionamentos e não executa operações de escrita.

Para repetir, inicie uma instância local descartável da aplicação com um banco de teste e execute `npm run test:load`, com o executável oficial do k6 disponível no `PATH`. `K6_BASE_URL` pode ajustar apenas a porta do destino local. Os serviços e o banco temporários usados nesta medição foram desligados ao final.
