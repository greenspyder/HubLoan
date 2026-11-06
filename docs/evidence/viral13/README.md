# Viral 1.3 — entrega privada para revisão, sem aceite artístico

Continuação autorizada na branch `codex/viral-audiovisual12` depois de o GitHub informar que a PR #26 já foi mesclada. Nenhuma nova PR/branch, merge, deploy ou publicação nesta etapa. A PR histórica não pode voltar a rascunho.

## Implementação

Modelo compartilhado live/offline: transição contínua entre crânio, pescoço, corpo e cauda; espessura progressiva, escala da cabeça proporcional e cores consistentes. Física e hitboxes preservadas. Materiais menos saturados, tone mapping e sombras de contato leves.

Champion tem cinco etapas por competidor, poses distintas por espécie, close-up e retorno à silhueta. São apresentações editoriais explicitamente identificadas; não simulam eventos reais. Outros competidores permanecem no cenário.

Comedy usa a própria Lume da arena. Duas pausas cômicas identificadas na tela alternam com dois trechos em movimento, dando espaço às expressões e à fala. As pausas congelam o tempo da gravação, não modificam os snapshots ou a física. O retrato da interface live permanece disponível.

Battle registra aproximações, afastamentos, perseguições, eliminações e liderança em snapshots reais. A reprodução offline usa câmera lenta identificada (0,5×, replay 0,35×) para permitir trajetória legível nas curvas; não altera a velocidade da simulação ou remove cenas. Essa solução tem ritmo mais contido e ainda depende de avaliação humana.

## Quality gate

- **Geometric Integrity:** primeiro anel da malha dentro do crânio, orientação e coordenadas finitas.
- **Visual Anatomy:** seis amostras de pescoço e doze de corpo; oclusão estimada por cápsulas amostradas da curva. São frações de amostras, não porcentagens de pixels. Durante pausas de Comedy mede tronco próximo (5–32,5% da curva), declarado como `upper-body-for-deliberate-bust`; nos outros planos mede 13–98,8% da curva.
- **Cinematic Readability:** limites projetados das malhas, nove raios no rosto, área segura de legendas, adversários próximos e limites temporais. Vistas que já falham nos limites baratos não executam raios, e declaram zero raios avaliados. Um caminho válido ainda precisa de todos os testes.
- **Artistic Quality:** revisão humana obrigatória. Nenhum alerta zero comprova carisma, qualidade artística ou viralidade.

O planejador só admite corte corretivo diante de curva/evento real, com intervalo mínimo de 1 s desde o corte anterior e no máximo 12 correções. Não relaxa limites de movimento. Live e render final mantêm limite de 5 s por quadro; somente a prévia offline tem 30 s para analisar candidatos. O limite offline total permanece em dez minutos.

## Problemas encontrados e correções

A primeira apresentação de Champion era pouco variada: foram introduzidos cortes de close-up. Exigir corpo inteiro em todas as falas de Comedy produzia câmera elevada; acompanhar curvas em close-up exigia deslocamentos bruscos, por isso foram adotadas pausas editoriais alternadas com ação. Em Battle, corpos próximos encobriam a boca nos quadros originais 7, 195, 207 e 208: a postura visual foi elevada 0,35 unidade, com pescoço contínuo. Um teste WebGL conserva esses instantes de origem e exige vistas seguras sem mutação da simulação.

A matriz tem dez casos reais e inclui controles negativos. Vistas frontal/close/cruzamentos ainda podem falhar perceptivamente; essas falhas são sinalizadas, não declaradas aprovadas. O cenário permanece estilizado e simples e a animação corporal ainda é procedural. A entrega não equivale ao cumprimento de todos os critérios artísticos.

## Voz e compatibilidade

Heart continua provisória, com WAVs Chatterbox anteriores verificados por SHA-256. Não houve nova inferência, troca da voz oficial ou serviço pago. Voice Studio, mixer e contratos globais preservados. Não se declara validação neural em live. Renderização feita em software, sem validação de desempenho GPU.

## Testes e arquivos

Resultados, métricas, hashes, comparações e links abaixo serão registrados após a inspeção dos arquivos finais. Artefatos anteriores permanecem históricos, não são reapresentados como novos.

## Validação executada

- Backend: 248 aprovados, zero falhas, um opcional ignorado na bateria anterior desta implementação (249 total).
- Unidades finais de diretor, anatomia visual e planejador: 13 aprovadas.
- WebGL/anatomia/câmera: dez aprovadas, um opcional ignorado. Teste adicional dos quatro instantes originais de Battle: aprovado.
- Build frontend e smoke do Voice Studio: aprovados. Lint global: 11 erros e dois avisos em arquivos fora das alterações; não declarado limpo.
- Quatro cenas preservadas em Battle/Comedy; vinte etapas de apresentação em Champion. A última tomada de uma cena pode ser menor que um segundo; o limite aplica-se ao intervalo desde o corte anterior, não à duração remanescente.

A proposta técnica encontrou trajetórias válidas para os três formatos; a edição de Comedy usa cinco cortes corretivos, a de Battle usa um. O ritmo desses cortes e a atuação ainda precisam de avaliação humana. Nenhum vídeo é considerado aprovado pelo usuário.

## Inspeção visual — limites observados

Folhas de contato: 12 instantes de cada vídeo, incluindo apresentação e ação; comparações antes/depois em três instantes por formato. A inspeção amostrada não substitui assistir aos MP4s completos.

Em Champion, os corpos e caudas estão presentes e distinguíveis por espécie; os close-ups mudam o tamanho do rosto. A composição ainda é semelhante entre competidores e há bastante chão vazio. Em Comedy, a conexão com o corpo da arena fica clara e os planos de fala são maiores, mas rivais no fundo ainda disputam atenção em alguns quadros. A animação corporal permanece procedural. Esses pontos impedem declarar acabamento artístico definitivo.

Em Battle, os corpos têm cores consistentes e pescoços presentes, mas ainda existe sobreposição entre rivais em alguns confrontos (por exemplo, perto de 18 s). O gate de oclusão facial prioriza o sujeito principal; adversários próximos recebem verificação de enquadramento, não uma prova completa de rosto visível. Não se declara a missão artisticamente concluída.

## Métricas dos arquivos novos

Todos são H.264/AAC, 360×640, 15 FPS, com decodificação integral aprovada. Cada quadro decodificado é distinto. SHA-256 diferente dos três arquivos revisados pelo proprietário. Correlação mínima com os WAVs arquivados: Comedy 0,91985; Battle 0,96247; Champion 0,98778. Legendas continuam usando distribuição por palavras dentro dos intervalos PCM, não alinhamento fonético.

| Formato | Duração / quadros | Tempo total | RSS navegador | Cortes corretivos |
|---|---|---|---|---|
| Comedy | 18 s / 270 | 83,609 s | 564.318.208 bytes | 5 |
| Battle | 25 s / 375 | 166,623 s | 572.207.104 bytes | 1 |
| Champion | 20 s / 300 | 95,947 s | 542.318.592 bytes | 0 |

Cada quadro final foi reavaliado; zero alertas nas verificações implementadas. Isso não elimina as limitações perceptivas descritas acima. Os tempos são deste hardware/software e não constituem benchmark de live.

## Arquivos para revisão

| Formato | MP4 novo | Folha de contato | Antes/depois |
|---|---|---|---|
| Lume Comedy | [Assistir](https://chatgpt.com/library?file_id=libfile_67dad7d4f1f481919ffd6a50b32da39a&account_id=personal) | [Quadros](https://chatgpt.com/library?file_id=libfile_eb9dcfd212ec8191b652e66a7a1e0148&account_id=personal) | [Comparar](https://chatgpt.com/library?file_id=libfile_f54ff51ded408191987383f8011eede1&account_id=personal) |
| Snake Battles | [Assistir](https://chatgpt.com/library?file_id=libfile_5b396c4d8d048191aaf9b6ee213c1375&account_id=personal) | [Quadros](https://chatgpt.com/library?file_id=libfile_ecd43981a0a481918772217df15e43f4&account_id=personal) | [Comparar](https://chatgpt.com/library?file_id=libfile_1864fa75a184819199cdcad4c9f71e55&account_id=personal) |
| Choose Your Champion | [Assistir](https://chatgpt.com/library?file_id=libfile_de82d1b9c1688191bc467d40c612c5b9&account_id=personal) | [Quadros](https://chatgpt.com/library?file_id=libfile_3b9cd88b72488191a66ed7fab8812d8d&account_id=personal) | [Comparar](https://chatgpt.com/library?file_id=libfile_f2f2a272f3f0819188a89202a3273775&account_id=personal) |

[Matriz de poses](https://chatgpt.com/library?file_id=libfile_a45ce4940770819193d4370c4db921a7&account_id=personal). [Quadros críticos e relatórios](https://chatgpt.com/library?file_id=libfile_5df14903af408191a74182153fa2e46a&account_id=personal).
