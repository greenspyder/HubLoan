# HubLoan · Central de agentes

Primeira etapa de transformação do HubLoan em uma central para organizar agentes de IA e suas missões, inspirada no painel de operações apresentado no vídeo de referência.

## Disponível nesta versão

- Central na rota `/` e também em `/agentes`, com tema escuro e verde, adaptada a celulares.
- Cadastro de agentes com nome e função, pausa e reativação.
- Criação de missões com briefing e agente responsável.
- Exemplos de missão para produtos digitais, thumbnails e assets 2D, baseados nos casos mostrados no vídeo.
- Fluxo local: fila → simulação → revisão humana → aprovação.
- Terminal para consultar o briefing e a saída de cada missão.
- Indicadores calculados a partir das missões e agentes cadastrados.
- Persistência no navegador e exportação da sessão em JSON.

**As execuções são simulações locais com texto fixo. Não há modelo de IA conectado, agentes autônomos executando em segundo plano, integrações com marketplaces, receita ou consumo de API.** Os dados não são compartilhados entre dispositivos. A exportação preserva uma cópia; a importação ainda não está implementada.

O módulo de crédito existente continua disponível em `/admin`. O backend .NET ainda atende esse módulo; a central de agentes não depende dele nesta primeira etapa.

## Executar

Requer Node.js 24 (também usado pelos testes com TypeScript nativo).

```bash
cd frontend
npm ci
npm run dev
```

## Verificar

```bash
cd frontend
npm run build
npx eslint src/features/agents src/app/App.tsx
node --test tests/workspace.test.mjs
```

## Próximas etapas

1. Escolher o primeiro caso de uso real e definir os critérios de entrega.
2. Criar API de agentes, missões e histórico com armazenamento no servidor.
3. Conectar um provedor de IA pelo backend, com credenciais no servidor e limites de consumo.
4. Implementar execução assíncrona, cancelamento, falhas e revisão de entregas reais.
5. Adicionar integrações externas conforme o caso de uso escolhido.

O vídeo mostra uma interface e alegações sobre operações comerciais. A implementação inicial reproduz o conceito de central, sem assumir que as receitas ou o nível de autonomia exibidos no vídeo foram verificados.
