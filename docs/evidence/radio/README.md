# Validação da rádio local

Código gravado: `ff60d87703ffc15a3b9e8584f0511f38b8e14e8e`.
Vídeo entregue separadamente: **Live-Factory-radio-126s.mp4**, SHA-256 em `evidence.json`. A gravação é a recepção RTMP real, remuxada para MP4 sem trocar áudio ou vídeo. Não é transmissão pública TikTok.

## Testes executados

- Backend: **192 testes, 190 aprovados, 2 opcionais ignorados** (Piper/WebGL ausentes da configuração dessa invocação).
- Piper/WebGL executados separadamente com configuração local: **4/4 aprovados**, nenhum ignorado.
- Biblioteca musical: **12/12 aprovados**, incluindo faixa completa de 212 s, limite de 240 s, memória, aprovação, isolamento e transições.
- Captura RTMP com Three.js e Kokoro: **1/1 aprovada**, 126 s.
- Build frontend: aprovado, aviso de chunk grande preexistente.
- Lint do módulo agentes + App + Vite: aprovado.
- Lint global: **11 erros, 2 avisos** em arquivos preexistentes fora do escopo (contexto/layout/componentes UI/admin/simulação). Esses arquivos não foram alterados. Não declarar lint global aprovado.
- Os testes de receptor RTMP H.264/AAC e de falha observável do encoder passaram na suíte. Não foi necessário modificar nem remover o watchdog nesta continuação.

## Medições da captura

| Métrica | Resultado |
| --- | --- |
| Receptor independente | 126,037 s, áudio AAC e vídeo H.264 decodificados |
| Perfil | 360×640, 15 FPS, software WebGL |
| Frames | 1.890; 14,998 FPS efetivos |
| Frames atrasados | 15; atraso máximo do pipeline 197,67 ms |
| Reação inicial | média 2.177,73 ms; p95/máxima 3.303 ms; 11 amostras |
| Início de qualquer segmento | média 4.095,53 ms; p95/máxima 15.015 ms; 15 amostras |
| Síntese/preparo por job | média 1.576,92 ms; máxima 2.732 ms |
| Espera após áudio pronto | média 52,91 ms; máxima 338 ms |
| TTS | Kokoro pf_dora; 12 sínteses neurais, zero fallback/falhas, 2 acertos de cache |
| Música | 3 jingles instrumentais; ambiente em todos os 1.890 blocos; zero falhas |
| Ambiente | fixture instrumental de 130 s, sem repetição na captura; crossfade validado em teste unitário |
| Áudio recebido versus PCM original | correlação 0,9998837 |
| Memória Node | 275.513.344 bytes; não representa memória total do worker+Chrome+Python |
| Leitura de pixels | média aproximada 19,18 ms/frame; máximo 207,7 ms |
| Roundtrip de renderização | média 32,71 ms/frame; máximo 222,72 ms |
| Rodadas concluídas | 8 |

Não há medição de GPU dedicada, CPU/RAM de todos os subprocessos, rede ou tempo isolado dos codecs nesta execução. Os tempos de pipe incluem backpressure. Nenhuma evidência de 720p/30 FPS.

## Latência: comparação honesta

O máximo agregado de 12,6 s citado na evidência anterior não deve ser comparado à nova média de reação. Nesta gravação o máximo de início de segmento foi **15,015 s**, portanto **não houve melhora desse máximo global**. A fala de agradecimento vem depois do jingle de 12 s; o mixer preserva essa ordem. O início da reação teve máximo de 3,303 s. Ainda não cumprimos <2 s para todos os eventos reais desta captura. O teste de áudio pré-carregado isolado fica em 500 ms, mas não substitui a medição ponta a ponta: jobs que combinam jingle e voz ainda aguardam preparo da voz.

## Inspeção visual realizada

Inspecionados 12 frames amostrados a cada 10 s, além do frame nativo de 22 s (`contact.jpg`, `performance-frame.png`). A arena e os alimentos são identificáveis, há mudanças de escala/enquadramento, crescimento, mudanças de rodada e aparições de avatares. O Top 6 é legível em 360×640, com rótulo explícito de simulação; os nomes longos ainda são truncados. As cobras permanecem pequenas e há espaço vazio excessivo acima da arena. Algumas plantas decorativas chegam à borda nos enquadramentos laterais; não se observou corte da área jogável nas amostras. A amostragem não comprova ausência de cortes entre esses instantes nem avalia toda a fluidez.

Não houve escuta humana nem avaliação auditiva pelo agente. A correlação AAC confirma transporte do áudio, não naturalidade, humor ou qualidade musical. A demonstração usa música instrumental de teste identificada, não canto real por IA e não a candidata Ketsa. O catálogo real não foi aprovado em nome do operador.

## Pendências

1. Ouvir a candidata Ketsa e a voz; aprovar/rejeitar no painel. A candidata completa está no ZIP entregue, com origem, CC BY 4.0 e crédito. Não substitui a identidade funk/underground ainda planejada.
2. Obter uma faixa realmente cantada, com direitos e custo autorizados; importar e aprovar por hash. Sem geração paga nesta entrega.
3. Separar o início de jingle pré-carregado do preparo da fala, preservando cancelamento/ordem, antes de afirmar reação <2 s ponta a ponta.
4. Refinar escala dos personagens/composição e validar em hardware adequado antes de subir resolução/FPS.
5. Eventos LIVE e transmissão pública TikTok permanecem dependentes de acesso autorizado; todos os participantes desta evidência são simulados.
