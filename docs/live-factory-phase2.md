# Live Factory — fase 2

## Auditoria e arquitetura

Base auditada: HEAD `63fb8d8bb77df921f29ccd6a992ab828979ca74e`, merge do PR #9 (runtime persistente e painel). Nenhuma alteração posterior na base consultada. Reutilizados `server/live-factory.mjs`, rotas autenticadas de `app.mjs`, SQLite/PostgreSQL e mutações atômicas de workspace em `store.mjs`. Não há segundo runtime. O painel duplicado na página foi removido.

TikTok Afiliados existente é operação assistida com registros e produção de vídeo/FFmpeg; não autoriza conta, postagem ou LIVE. Etsy fornece um precedente OAuth; a criptografia AES-GCM existente protege a nova credencial TikTok. Marketing, canais, financeiro, runner de missões e produção continuam separados. Navegação Conexões foi promovida ao menu principal.

## Fluxo A — personagem persistente

Abra `/agentes/live`, crie/selecione uma experiência e abra Personagem. Com a sessão encerrada, altere nome, personalidade, cenário, frase de espera, volume e regras de saudação/desafio/comemoração. Cada regra escolhe expressão, animação, efeito local, duração e frases. Salve, inicie o teste e envie um evento. Eventos e histórico mostram a regra versionada, estado e saída solicitada. Encerre e reabra: configuração e versão persistem no backend.

Alterações exigem versão esperada e sessão parada, inclusive propostas Astra. Astra oferece sugestões locais determinísticas revisáveis, sem modelo pago e sem alteração automática. Personalidade é orientação editorial; não implica conversação generativa. Voz/TTS está explicitamente indisponível. O personagem funciona sem áudio.

Evento validado → regra de configuração → estado persistido → ação audiovisual com ID e validade → registro. O navegador apenas apresenta essa ação. Mantidos isolamento por bearer/workspace, deduplicação por sessão, fila de 20, histórico limitado, heartbeat, proprietário do executor, pausa, emergência e prazo máximo de 30 minutos. Registros de apresentação são solicitações, não confirmação de som ouvido. Nenhuma chamada de IA por evento ou frame.

## Fluxo B — TikTok em Conexões

Abra `/agentes/conexoes#tiktok`. Conta/publicação, transmissão e eventos LIVE têm estados separados. Sem configuração, são exibidos requisitos concretos e nenhum botão que simule conexão. Publicação e eventos LIVE continuam não suportados; transmissão exige configuração externa e não aparece conectada.

Para habilitar apenas autorização de conta Login Kit, o operador precisa configurar no backend:

```text
AGENT_ENCRYPTION_KEY=<chave estável conforme configuração existente do HubLoan>
TIKTOK_CLIENT_KEY=<app TikTok>
TIKTOK_CLIENT_SECRET=<segredo do app>
TIKTOK_REDIRECT_URI=https://SEU-FRONTEND/agentes/conexoes
TIKTOK_LOGIN_ENABLED=true
```

Cadastre exatamente a URL HTTPS no Login Kit Web, obtenha aprovação ou Sandbox autorizado e habilite `user.info.basic`. Configure FRONTEND_ORIGIN/CORS e o backend usado pelo frontend conforme a implantação existente. A flag é declaração de configuração do operador, não prova de autorização: somente troca de token e consulta de identidade bem-sucedidas marcam conta conectada.

O backend gera state aleatório, guarda apenas seu hash por 10 minutos e consome atomicamente uma única vez no workspace autenticado. O retorno chega à página registrada; ela confere state de sessão, remove parâmetros da URL e encaminha code/state ao backend autenticado. O backend valida escopo, token, identidade e concorrência, armazena access token criptografado, nunca o retorna ao frontend ou logs. A página usa no-referrer. Configure proxy/hosting para não registrar query strings de callback. Não existe renovação automática: após validade do access token, autorize novamente. O estado indica a última verificação e validade, não monitoramento contínuo de revogações remotas.

Desconectar remove a credencial local e solicita revogação oficial; falha remota gera aviso explícito para revogar também no TikTok. Um callback atrasado não restaura conexão removida. Não confundir Login Kit com Content Posting, acesso LIVE ou receita. Content Posting não foi implementado e depende de produto, escopos e revisão próprios; Direct Post não se destina a utilitário restrito a contas internas. Não foi verificado acesso oficial de parceiro para comentários/presentes; não foram instaladas bibliotecas não oficiais.

Fontes oficiais consultadas em 2026-10-14:
- https://developers.tiktok.com/docs/en/login-kit-web
- https://developers.tiktok.com/docs/en/oauth-user-access-token-management
- https://developers.tiktok.com/docs/en/content-sharing-guidelines
- https://developers.tiktok.com/

## Audiovisual e infraestrutura

Canvas original 360×640 (9:16), três cenários, expressões, cinco animações e efeitos locais Web Audio. Até 30 fps, movimento reduzido respeitado. Som exige clique do usuário, suporta volume e mute; ações antigas/expiradas não são reproduzidas ao abrir a página. Heartbeat perdido, pausa, encerramento ou aba oculta interrompem apresentação ativa. O runtime continua independente da página.

MediaRecorder/captureStream permite clipe WebM local de até 15 segundos e 8 MB, com efeitos quando áudio habilitado. Disponibilidade depende do navegador. Não é transmissão, vídeo hospedado ou encoder contínuo. Não há captura de microfone/câmera. OBS: capture a janela, recorte a cena, configure canvas 1080×1920, capture áudio do navegador se disponível e valide com gravação local. Para conversão opcional de um clipe já baixado:

```sh
ffmpeg -i lume-teste.webm -c:v libx264 -pix_fmt yuv420p -c:a aac lume-teste.mp4
```

O HubLoan não inicia OBS/FFmpeg nem envia RTMP. Transmitir exige elegibilidade e ferramentas autorizadas da conta. Hospedagem contínua ainda requer Node e banco sempre ativos, navegador/renderer dedicado, captura/codificação supervisionada e integração oficial para confirmação de transmissão/eventos. Fechar a página interrompe a imagem; suspender o servidor interrompe o cérebro. Não declarar produção pronta.

Zero chamadas de IA e zero custo de API de IA nesta experiência; CPU, banco, hospedagem, tráfego e eventual transmissão podem gerar custos desconhecidos. Exibidos tempo ativo, ticks, latência e heartbeat. Audiência, receita, presentes e lucro permanecem desconhecidos. Sem dependência paga nova, sem TTS pago e sem novo processo pesado de fundo.

## Validação

Regressões HTTP dos fluxos A e B incluem persistência após reabrir SQLite, versão concorrente, configuração inválida, reação determinística, mute, isolamento de usuários, OAuth state/expiração/replay/negação, token criptografado, escopo ausente, callback concorrente com desconexão, expiração e falha de revogação. OAuth foi testado com provedor controlado: nenhuma conta real foi autorizada e nenhuma capacidade LIVE foi simulada como conectada.

Comandos: `npm test --prefix server`, `npm run build --prefix frontend`, `cd frontend && npx eslint src/features/agents src/app/App.tsx vite.config.ts`. Evidências finais e eventuais limites de validação visual constam na PR.

Próxima etapa: validar Login Kit com app/conta autorizados, verificar acesso LIVE do operador e testar captura OBS local antes de qualquer transmissão. TTS avançado, OBS remoto, encoder hospedado e eventos oficiais dependem de uma fase posterior. Rollback por reversão dos commits; campos novos são aditivos e não exigem migração destrutiva.
