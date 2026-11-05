# Character Anatomy 2.0 — revisão humana obrigatória

R3 foi rejeitada por cabeças flutuantes. Os alertas anteriores verificavam enquadramento e raios faciais, não ligação anatômica.

## Causa e correção

`scene3d.mjs` elevava cabeças editoriais em 0,7 unidade (mais até 0,2 na celebração), enquanto a malha do corpo começava no chão. Cabeça e corpo eram objetos irmãos sem transição que acompanhasse o transform final. Isso também podia ocorrer durante celebração em live. O retrato secundário escondia seu pescoço. A pose frontal Champion girava a cabeça para a câmera independentemente da direção real.

Agora `lume-face.mjs` fornece um socket local dentro do crânio. Depois de posição, escala e inclinação, `scene3d.mjs` converte o socket para o mundo. A própria malha tubular do corpo começa dentro do crânio, passa por um ponto de transição e segue o caminho original. O raio do pescoço e corpo é o mesmo; a cauda continua afilada. O retrato secundário mostra o corpo completo. Não foram removidos personagens nem reduzidos para esconder defeitos.

A direção vem de `sceneFrame`, incluindo interpolação dos snapshots. A rotação para a câmera e a suavização adicional dependente do quadro anterior foram removidas. Assim, replay e câmera lenta produzem o mesmo socket para o mesmo instante.

`render3d.mjs` mede o centro do primeiro anel da malha real, distância ao socket, inclusão no crânio, orientação, coordenadas finitas e distância projetada em pixels. Uma falha interrompe a renderização. Essas medidas não detectam todas as interseções ou oclusões perceptivas; revisão humana permanece obrigatória.

## Câmera e preservação

O grid anterior de candidatos girava inteiro com a cabeça. Ao remover a rotação artificial, a primeira tentativa de planejamento falhou nos quadros 11 (batalha) e 17 (Champion). O grid agora usa azimutes fixos no mundo, triagem pela direção facial e validação das malhas. Champion também usa planejamento offline em duas passagens. `camera-path.mjs` mantém os limites de 2,8 unidades e 0,25 radiano, sem cortes adicionais.

Física, hitboxes e decisões da simulação não foram editadas. A geometria é compartilhada pelo renderer live/offline. O planejamento em duas passagens é exclusivo do offline. Voice Studio, TTS, mixer, watchdog e aprovação vocal permanecem intactos. O checkpoint passou de 5 para 6 para não reutilizar renders antigos. Arquivos anteriores foram preservados.

## Reprodução e limites

`node server/anatomy-review20.mjs <diretório>` gera 15 PNGs reais de cinco espécies em curvas e inclinação de eliminação. Testes WebGL cobrem gameplay gravado, interpolação em curvas, avanço/retrocesso temporal e imutabilidade da simulação. `make-sheets.py <workspace>` compara os mesmos instantes dos MP4s R3 e novos.

A inspeção visual é amostral, com poses isoladas, confronto, close-ups e replay. Não se afirma cobertura artística de todos os quadros/combinações possíveis. Não se afirma validação de live neural.

## Testes desta entrega

- Suite completa: 245 testes, 244 aprovados, zero falhas, um Piper opcional pulado (modelo ausente).
- Após fechar/afilar a cauda do retrato: 6 testes anatômicos/WebGL aprovados e um Piper opcional pulado.
- Build frontend, lint de Voice Studio/agentApi e smoke real de interface passaram.
- Lint global: 11 erros e 2 avisos preexistentes, fora dos módulos alterados. Logs preservados.
- A última inspeção identificou a ponta aberta do corpo do retrato; ela foi fechada e afilada antes dos renders finais.

Voz dos vídeos: Chatterbox Heart provisória, usando os WAVs previamente medidos e verificados por hash. Nenhuma inferência nova ou aprovação da voz global nesta correção. Música: Brazilian Sunsets, Ketsa, CC BY 4.0.
