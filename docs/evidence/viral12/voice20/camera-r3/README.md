# Revisão R3 — trajetória contínua e composição

A batalha usa planejamento offline do trecho completo. A primeira passagem verifica posições contra as malhas reais; programação dinâmica escolhe uma sequência contínua entre as posições válidas. A segunda passagem renderiza a sequência e repete a verificação geométrica em cada quadro. Não há cortes acrescentados, personagens escondidos ou mudanças na física. Se não existir uma trajetória válida, a produção falha explicitamente, sem chamar um salto de câmera de correção aprovada.

Limites entre quadros dentro do mesmo plano: deslocamento de até 2,8 unidades e rotação de até 0,25 radiano. Os cortes editoriais existentes continuam permitidos. O controle anterior de salto acima de 3 unidades não foi relaxado. O planejamento considera deslocamento, rotação, escala projetada e preferência por vistas frontais; isso não é uma métrica de qualidade artística.

A composição da batalha foi elevada no quadro. As legendas passaram para uma faixa inferior; os créditos da música foram reunidos no cabeçalho para não competir com elas. Música, autoria e licença continuam identificadas. O roteiro, a duração e a sincronização PCM foram preservados.

## Validação

- Backend: 241 aprovados, 1 Piper opcional pulado, zero falhas; execução concluída com código 0. Inclui regressões da Live Factory, RTMP, isolamento, snapshots, TTS e fallback.
- Build frontend, lint de Voice Studio/agentApi e smoke da interface: concluídos com código 0. O build mantém o aviso de bundle grande. O lint global anterior registrou 11 erros e 2 avisos fora desses módulos; não foram corrigidos nesta revisão.
- Testes novos cobrem uma escolha local que levaria a um beco sem saída, ausência de trajetória, rotação abrupta, respeito aos cortes existentes, transporte das posições pelo WebGL e revalidação de oclusão no plano escolhido.
- A revisão final dos créditos e das legendas é validada nos MP4s e folhas de quadros, além da suíte já executada.

## Voz e limites da entrega

Os vídeos usam as tomadas Chatterbox Heart já sintetizadas e medidas, verificadas por perfil/texto/SHA-256. Não houve nova inferência nesta etapa nem modificação da voz global aprovada. Heart e Emma continuam disponíveis para avaliação auditiva em [comparison.md](../comparison.md). Não são presets de pf_dora.

A identidade definitiva depende da escolha do proprietário. Live neural continua não validada: a medição CPU anterior foi mais lenta que tempo real; GPU/VRAM não foram medidas. Fallback técnico permanece identificado. Planejamento offline da câmera não foi introduzido no caminho de execução das lives.

Verificações geométricas não comprovam qualidade artística. Os raios de oclusão são amostras; a verificação do rosto principal é mais detalhada que a dos participantes secundários. Vistas elevadas permanecem em partes da batalha para preservar a leitura espacial. Os vídeos exigem revisão audiovisual humana antes de aprovação ou publicação.

PR #26 em rascunho, branch codex/viral-audiovisual12. Sem merge, deploy ou publicação. Versões anteriores preservadas.

## Resultado final dos arquivos

| Formato | Duração | Quadros verificados | Alertas geométricos |
|---|---:|---:|---:|
| Lume Comedy | 18 s | 270 | 0 |
| Snake Battles | 25 s | 375 | 0 |
| Choose Your Champion | 20 s | 300 | 0 |

Os quatro saltos registrados em R2 não aparecem na validação R3. Foram inspecionadas folhas de nove quadros de cada vídeo e sequências de três quadros nos quatro instantes problemáticos, comparadas com o MP4 R2 verificado por hash. A comparação é evidência localizada, não avaliação artística automática.

Planejamento: 22819 posições válidas; maior deslocamento selecionado 2.739408; maior rotação 0.240000 radiano; zero cortes adicionados. Renderização completa da batalha: 95.243 s neste ambiente CPU/software WebGL, com WAVs já preparados.

Os três MP4s são novas renderizações e têm SHA-256 diferente dos arquivos R2. H.264/AAC, 360×640, 15 FPS; decodificação integral aprovada; 270/375/300 quadros distintos. Correlação do AAC com as tomadas WAV >0,94 nos intervalos registrados. Isso não é alinhamento fonético nem avaliação do timbre. Voz sem fallback, provisória, sem nova inferência nesta etapa.

## Arquivos para revisão

- [comedy-voice20-camera-r3.mp4](https://chatgpt.com/library?file_id=libfile_40a39d6f39f0819194be71a97ace7815&account_id=personal)
- [battle-voice20-camera-r3.mp4](https://chatgpt.com/library?file_id=libfile_bbc8902952208191b7968968c0b462b2&account_id=personal)
- [champion-voice20-camera-r3.mp4](https://chatgpt.com/library?file_id=libfile_6e0746907bb08191b92ca352d5a8f7b1&account_id=personal)
- [comedy-camera-r3.png](https://chatgpt.com/library?file_id=libfile_8f7c07c36c248191a998e951f342d3f5&account_id=personal)
- [battle-camera-r3.png](https://chatgpt.com/library?file_id=libfile_b09fad8fa9ec8191a67004703b42d1d2&account_id=personal)
- [champion-camera-r3.png](https://chatgpt.com/library?file_id=libfile_0307f38add6c8191b6893f51455700db&account_id=personal)
- [battle-transitions-r2-r3.png](https://chatgpt.com/library?file_id=libfile_8c1127ff3ab88191bbf04186f07fffe4&account_id=personal)
