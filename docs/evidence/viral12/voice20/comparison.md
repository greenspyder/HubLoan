# Amostras reais — avaliação auditiva pendente

Modelo Chatterbox Multilingual PT-BR; referências sintéticas distintas. Sem pf_dora, sem imitação de pessoa real. Mesmo texto e parâmetros: exaggeration 0.35, cfg 0.5, temperature 0.7, seed 42. Ganho constante para -23 LUFS; sem efeitos de timbre.

| Frase | Heart sintética | Emma sintética |
|---|---|---|
| Mistério | [WAV](https://chatgpt.com/library?file_id=libfile_93d5d5bba2cc819181f80ee46c256602&account_id=personal) | [WAV](https://chatgpt.com/library?file_id=libfile_47407d7e35e081919fe7f1edc16b1397&account_id=personal) |
| Humor | [WAV](https://chatgpt.com/library?file_id=libfile_58803baae27481919d49f2ebb44eb342&account_id=personal) | [WAV](https://chatgpt.com/library?file_id=libfile_bc124f9e6bb08191928ac48e377e85bf&account_id=personal) |
| Suspense | [WAV](https://chatgpt.com/library?file_id=libfile_ab26e5fcf0308191a719dbd684792cc3&account_id=personal) | [WAV](https://chatgpt.com/library?file_id=libfile_7934faea2494819185214ff3988d2503&account_id=personal) |
| Interação | [WAV](https://chatgpt.com/library?file_id=libfile_4a6176aa249481919c198c45e4784724&account_id=personal) | [WAV](https://chatgpt.com/library?file_id=libfile_23e0d6b1aae08191814e6b094a011a05&account_id=personal) |
| Surpresa | [WAV](https://chatgpt.com/library?file_id=libfile_39ef1424d9b88191bda58c96bd1c879b&account_id=personal) | [WAV](https://chatgpt.com/library?file_id=libfile_012fa7df574c81919b60d95cf157f1c8&account_id=personal) |
| Demo contínua, 30 s | [Ouvir](https://chatgpt.com/library?file_id=libfile_1be460d3f5ec81919ad8dfc30b5c0013&account_id=personal) | [Ouvir](https://chatgpt.com/library?file_id=libfile_a2918410579c81919cb1f6ecb55b1bdc&account_id=personal) |

| Modelo / voz | Licença | Síntese CPU por fala | Pico RAM | Naturalidade / limitações |
|---|---|---|---|---|
| Chatterbox PT-BR / Heart sintética | MIT; referência Apache-2.0 | 44.88–86.49 s | 4.98 GB | Áudio real sem fallback; avaliação perceptiva pendente. Referência inglesa; verificar sotaque e identidade. |
| Chatterbox PT-BR / Emma sintética | MIT; referência Apache-2.0 | 42.68–63.78 s | 4.98 GB | Áudio real sem fallback; avaliação perceptiva pendente. Referência inglesa; verificar sotaque e identidade. |

Inicialização medida: 17.83 s. CPU AMD EPYC 9V74, 2 threads de inferência; sem GPU disponível. VRAM e desempenho GPU não medidos. Ambas ficaram mais lentas que tempo real. Não foram aprovadas para live. As demos concatenam as cinco falas com silêncio; não são uma única inferência longa. Não houve escuta perceptiva pelo agente; nenhum julgamento de carisma foi atribuído às métricas.

[Dados completos](https://chatgpt.com/library?file_id=libfile_0a4a0665f9588191afb14a54800d0ba2&account_id=personal). Hashes individuais e proveniência em measurements.json.

