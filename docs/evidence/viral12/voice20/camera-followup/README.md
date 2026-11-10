# Revisão adicional de câmera

A busca de planos agora prioriza enquadramentos válidos sobre conveniência de movimento. A transição percorre uma órbita em vez de uma linha através do personagem; procura posições próximas seguras antes de aceitar um reposicionamento distante. A cabeça acompanha gradualmente as curvas somente na apresentação editorial da batalha. A física, os corpos, os personagens e as quatro cenas permanecem.

Uma inspeção manual das folhas de quadros encontrou plantas diante do rosto embora os nove raios contra cobras estivessem livres. O batching havia removido os meshes dos grupos originais das plantas. A verificação agora usa as malhas instanciadas efetivamente desenhadas, além de pedras e frutas reais do cenário; consultar os grupos vazios não resolvia a falha. Um teste de regressão demonstra que um objeto do cenário é detectado mesmo sem corpo de cobra obstruindo o rosto. Raios esparsos continuam sendo uma amostra geométrica, não prova de qualidade artística.

Falhas agora registram quadro, instante, limites projetados, raios bloqueados e deslocamento da câmera. Uma interpolação insegura rejeitada é identificada; isso **não** isenta o salto subsequente do controle de qualidade. Os limites de aprovação não foram relaxados. Uma exportação de revisão não representa aprovação.

As versões intermediárias foram inspecionadas e descartadas como entrega final. A primeira eliminou alertas de rosto, mas gerou 39 saltos. Busca local e atuação visual gradual reduziram esses saltos; a inspeção posterior revelou a lacuna dos objetos do cenário. Essa sequência não demonstra aprovação artística.

Voz: mesmos WAVs neurais Heart já medidos, provisórios e verificados por hash; nenhuma nova inferência nem alteração do perfil global nesta revisão. As duas candidatas e todas as amostras anteriores continuam disponíveis em [comparison.md](../comparison.md). A avaliação auditiva e a autorização da voz oficial pertencem ao proprietário. Live neural permanece sem validação; fallback técnico identificado.

## Resultado verificado

Novas renderizações: Comédia 270 quadros / 18 s; Batalha 375 / 25 s; Champion 300 / 20 s. Comédia e Champion sem alertas geométricos. Batalha: quatro saltos de câmera, sem os outros alertas amostrados. Permanecem bloqueados para aprovação automática.

- Quadro 60, 3.933 s: deslocamento 10.048.
- Quadro 92, 6.067 s: deslocamento 9.083.
- Quadro 111, 7.333 s: deslocamento 7.102.
- Quadro 154, 10.200 s: deslocamento 4.080.

As nove imagens por formato foram inspecionadas. A comparação mostra plantas cobrindo a face antes e a vista liberada depois. Ainda há proximidade entre personagens, planos laterais e variação de escala. Isso não representa aprovação artística; a missão audiovisual continua pendente por esses saltos e pela revisão humana. Nenhum alerta foi ocultado ou reclassificado como corte autorizado.

Validação: suíte backend 235 aprovados, 1 Piper opcional pulado; complementares finais com WebGL 14 aprovados e 1 Piper pulado; 11 testes de voz/qualidade aprovados. A correção final das malhas instanciadas foi coberta pelo teste específico e pela verificação WebGL complementar. Build/frontend não mudaram nesta revisão; os resultados anteriores permanecem documentados. MP4s decodificados integralmente, quadros distintos 270/375/300, H.264/AAC, 360×640/15 FPS, correlação dos trechos de voz >0.94. `validation.json` contém hashes e métricas.

Sem merge, deploy, publicação ou alteração da voz aprovada.

## Arquivos desta revisão

- [comedy-voice20-camera-r2.mp4](https://chatgpt.com/library?file_id=libfile_d576796776888191819d7c15206b4a09&account_id=personal)
- [battle-voice20-camera-r2.mp4](https://chatgpt.com/library?file_id=libfile_81ac34f0f5b88191a59ea93c579934b4&account_id=personal)
- [champion-voice20-camera-r2.mp4](https://chatgpt.com/library?file_id=libfile_c2d8a1a5d4808191ac8ae32de17241a1&account_id=personal)
- [battle-comparison-camera-r2.png](https://chatgpt.com/library?file_id=libfile_dd62faa5aa98819199fcfdd79501d280&account_id=personal)
- [comedy-camera-r2.png](https://chatgpt.com/library?file_id=libfile_8342c0231a14819198bc05548af36bee&account_id=personal)
- [battle-camera-r2.png](https://chatgpt.com/library?file_id=libfile_b3232bbd2d688191af18c4b08fd5404f&account_id=personal)
- [champion-camera-r2.png](https://chatgpt.com/library?file_id=libfile_20e93b3bed548191aa248fa11cac76c6&account_id=personal)
