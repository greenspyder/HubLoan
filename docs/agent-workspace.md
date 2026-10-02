# Direção do projeto

## Referência disponível

O vídeo fornecido tem aproximadamente 3 minutos. Foram inspecionados os quadros e extraídas as legendas visíveis ao longo do vídeo por OCR. Isso não equivale a uma transcrição verificada do áudio: há palavras e trechos ilegíveis.

Elementos reconhecíveis:

- Central visual com vários agentes e um coordenador.
- Pesquisa e produção organizadas em áreas ou salas.
- Designs para lojas Etsy e impressão sob demanda.
- Serviço de thumbnails para YouTube.
- Pacotes de assets 2D para jogos.
- Blogs com afiliados, protótipos de software e música.
- Painéis com alegações de faturamento, que não foram verificadas.

## Primeira entrega

A central tem agentes configuráveis e missões persistidas no navegador. Permite testar o fluxo de atribuição, simulação, revisão e aprovação. A execução gera apenas um plano fixo, claramente identificado como simulação; ainda não produz conteúdos com IA.

O módulo foi isolado em `frontend/src/features/agents`, com regras de estado em `services/workspace.ts`, interface em `pages/AgentWorkspacePage.tsx` e estilos próprios. A central é a página inicial; o módulo bancário segue em `/admin`.

## Limites técnicos e próximos passos

- Criar uma API própria para agentes e missões, com autenticação e persistência no servidor.
- Integrar um provedor de modelos de texto e, posteriormente, imagens.
- Separar coordenação, execução e revisão, mantendo histórico por missão.
- Registrar consumo e orçamento com valores fornecidos pelo provedor.
- Adicionar uma fila de execução real e tratar cancelamento e falhas.
- Integrar marketplaces somente depois que o primeiro fluxo produzir entregas úteis.

## Verificação desta entrega

- Build de produção do frontend.
- ESLint dos arquivos novos e do roteamento alterado.
- Testes das transições de missões, pausa de agentes e validação da persistência.
- A verificação visual com Playwright não pôde ser concluída: o navegador não estava instalado e o download falhou neste ambiente.
