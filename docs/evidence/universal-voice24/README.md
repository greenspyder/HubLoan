# Universal Voice Engine — adendo 2.4, entrega parcial

## Merge e deploy autorizados da entrega anterior
A entrega Creative Studio 2.4 (`c0d2283`) foi integrada em **master**, a branch principal real do repositório, por `4c7320e01741abc93068d8e7e9e06af33d9e0e71`. Vercel confirmou sucesso: https://vercel.com/lucas-7d2b/hub-loan/AEJrb5NducniXEKWxUWoPMh7MgbE . Site: https://hub-loan.vercel.app/agentes/viral . Backend `/health`: ok/PostgreSQL; GET autenticado de diagnóstico confirmou `multimodal` no backend publicado. Nenhum vídeo foi publicado e nenhuma geração paga foi executada.

**Este adendo posterior permanece somente na branch `codex/viral-audiovisual12`, para revisão. Não houve um segundo merge/deploy do adendo.**

## Diagnóstico confirmado e limites
A rota `/voice-studio/sample` usava exclusivamente `createNeuralSpeech` local e escondia qualquer exceção sob HTTP 503. A consulta em produção em `production-diagnostic.json` confirmou ausência dos arquivos esperados de Kokoro e Chatterbox. A rota chegou ao backend correto, que respondeu 200 à leitura autenticada. Não acessamos o workspace privado do usuário: isso prova indisponibilidade local atual, não a causa de cada requisição histórica.

No ambiente de desenvolvimento também faltam pesos/configuração neural e o executável eSpeak NG. Nenhum modelo pesado foi instalado. RAM observada em `local-diagnostic.json` é do ambiente de desenvolvimento, não o limite de memória do Render. Sem logs históricos privados, não confirmamos OOM, timeout, concorrência ou dependência Python específica como causa original.

Agora as falhas distinguem configuração, modelo ausente, timeout, concorrência, autenticação, cota, rate limit, orçamento, resultado incerto, cancelamento e fallback técnico ausente. HTTP 409/401/402/429/504/502 corresponde à causa; 503 fica reservado à indisponibilidade técnica do fallback. Logs de amostra incluem código e motor, sem texto, chave ou resposta bruta do provedor.

## Arquitetura efetivamente integrada
- `universal-voice.mjs`: fachada compartilhada para ElevenLabs, motores locais existentes e fallback técnico. Reutiliza o adaptador HTTP ElevenLabs de 2.4; não cria uma integração por fábrica. Converte áudio para PCM mono 48 kHz exigido pelo mixer, rejeita duração excessiva sem cortar palavras, recebe cancelamento e mede latência.
- `lume-voice.mjs`: mesmo perfil global existente, agora aceita modelo/voice ID/configurações ElevenLabs descobertos. Aprovação exige amostra real registrada e declaração de escuta; salva ID da amostra e versão. Alteração de parâmetros invalida a escuta anterior. Produções e autorizações live recebem snapshots.
- Voice Studio: catálogo consultado no servidor, estabilidade ajustável, candidata de teste, amostra sem fallback, aprovação e limites. O painel de provedores conserva conexão/consulta; a seleção vocal fica no Voice Studio, sem segundo painel de aprovação.
- Viral 3D (Comedy/Battles/Champion), microcontos e Visual Commentary recebem o serviço compartilhado. Visual Commentary prioriza a identidade global ElevenLabs aprovada; o perfil antigo de teste continua aceito somente para compatibilidade de campanhas planejadas. A voz oficial não foi trocada nesta entrega.
- Live worker: reutiliza fila, prioridades, mixer, ducking, expiração e telemetria existentes. Nova rota `/live-worker/:workspace/:experience/voice` verifica grant, sessão ativa e texto de um evento atual ou repertório de aquecimento autorizado. Chaves do provedor nunca são enviadas ao worker. Revogação/obsolescência é verificada novamente após síntese. Heartbeat mostra provedor, sínteses neurais, fallbacks concluídos e último código de falha.
- Live: prazo de 4 s no servidor/4,5 s no cliente; limite de 8 s por fala; aquecimento das frases previsíveis; cache; cancelamento de preparação de baixa prioridade quando entra evento urgente. Falha pode acionar eSpeak claramente identificado; se também faltar, mixer mantém gameplay/música e registra falha, sem alegar fala neural. O caminho Piper CLI legado permanece compatível.

## Autorização e controle de consumo
Credencial própria ElevenLabs criptografada por workspace, configurada pelo painel já publicado da 2.4. Conector do ChatGPT não fornece autenticação ao runtime. Nenhuma credencial foi solicitada em texto nesta conversa.

Limites opt-in separados para **samples / viral / live**, em caracteres por dia UTC e por produção/sessão. Salvar limite exige reconhecer custo monetário desconhecido. Cada nova amostra exige autorização adicional na solicitação. Cota atual e multiplicador do modelo são consultados antes de gerar. Reserva persistente antecede envio; limite de uma síntese vocal por workspace. Resultado incerto conserva reserva e impede reenvio automático. Não há tentativas automáticas de chamadas pagas.

Cache persistente limitado a 20 áudios/12 MB por workspace, associado a modelo, voz, parâmetros e texto; mudar apenas versão de aprovação não cobra novamente pelo mesmo áudio. Dados de áudio não aparecem no snapshot público. Visual Commentary conserva também a autorização/reserva monetária da campanha. Os limites em caracteres são limites internos de consumo, **não um hard cap monetário na conta ElevenLabs**; cobranças efetivas não são inventadas.

O backend mantém o desbloqueio vocal live somente em memória, por até uma hora, após ação autenticada do supervisor. Reinício exige nova ação autenticada para desbloquear; ausência de desbloqueio gera falha explícita e fallback, não exposição de segredo ao worker. Sessões continuam limitadas pelo grant/deadline e orçamento atual.

## Testes e evidências
**Resultado final:** 284 testes backend: 275 aprovados, 0 falhas e 9 ignorados. Subconjunto vocal/mixer: 24 aprovados e 3 ignorados. Build e lint dos seis arquivos frontend alterados aprovados.

Ver `backend-tests.txt`, `contracts.txt`, `build.txt`, `lint.txt`, `ui-check.txt` e `legacy-ui.txt`. Testes controlados usam voz/modelo claramente denominados `controlled-*`; não são amostras ElevenLabs reais.

Cobertura: configuração própria, isolamento, ausência de segredo/áudio no snapshot público, cota, orçamento por sessão, cache, concorrência, cobrança incerta, aprovação/persistência SQLite após reabertura, alteração de parâmetros, decodificação de PCM controlado, autenticação/rate limit/quota/timeout, grant live/revogação/obsolescência, cancelamento de cache e fallback identificado. A rota HTTP real sem modelos locais responde `VOICE_MODEL_UNAVAILABLE`/409. UI real mobile/desktop sem overflow, erro explicativo e aprovação bloqueada sem escuta; screenshots em `ui/`.

Durante validação, o teste de eSpeak real falhou por executável ausente; passou a ser explicitamente ignorado quando ausente, seguindo os testes existentes. Um teste controlado separado verifica tentativa versus conclusão do fallback. Não se declara áudio técnico real validado neste ambiente. Os testes RTMP/neural dependentes de hardware/modelos continuam ignorados quando indisponíveis. Lint dos arquivos alterados e build devem ser consultados nos logs; o lint global preexistente da 2.4 tem pendências fora deste escopo.

## Aceite pendente — não declarar modernização global concluída
Não existem nesta entrega amostra real ElevenLabs, voz Lume aprovada, vídeo narrado real com ElevenLabs, interpretação deadpan avaliada ou live neural validada. Faltam credenciais próprias, consulta efetiva da conta runtime, autorização de consumo e escuta humana. Contratos e transporte controlado não substituem essas provas.

A direção vocal por cena continua orientando roteiro/pausas e controles realmente disponíveis; rótulos misterioso/deadpan não são enviados como emoções ficticiamente suportadas. Os renderizadores offline mantêm legendas, duração e mixer existentes; não houve nova análise perceptiva ou de loudness de áudio premium. Interrupção de HTTP não garante cancelamento da cobrança remota. Não há conciliação automática de cobrança, prova de baixa latência em produção nem garantia de continuidade de identidade no fallback técnico.

Para concluir: configurar credencial pelo painel, consultar vozes/modelos/cota, salvar candidata e limites de amostra, autorizar uma amostra, ouvir/aprovar, autorizar limites Viral/Live e executar vídeos e uma sessão local de preview. Só então avaliar desempenho e autorizar eventual publicação.

Documentação consultada: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps e https://elevenlabs.io/docs/api-reference/models/list . MP3 é convertido localmente, sem pressupor acesso do Starter a formatos PCM premium. Modelos/vozes/cotas não estão fixados a suposições sobre o plano. Direitos de cada voz e uso pretendido exigem revisão dos termos da conta.
