# Especializações de produção

A central pesquisa separadamente cada especialização habilitada em cada ciclo, compara de três a cinco oportunidades apoiadas nas citações retornadas e produz uma hipótese com evidência/viabilidade mínimas. Pontuação não é previsão de lucro. Packs destinam-se a desenvolvedores, não a inventários de jogos comerciais.

| Fluxo | Entrega | Chamadas de produção |
|---|---|---|
| Thumbnails | Duas variantes 1280×720 PNG/JPG abaixo de 2 MB no JPG, fundo separado, títulos em SVG editável, revisão visual e instruções de teste | 4 |
| Objetos/mobília 2D | Quatro PNGs RGBA 512×512, atlas 1024×1024, estilo/paleta compartilhados no prompt, manifesto, revisão visual e demonstração Godot 4 | 7 |
| Mobília 3D | Caixas procedurais, UV, materiais e texturas de 16×16, GLB embutido validado pelo Khronos, OBJ/MTL, JSON regenerável e demonstração Godot 4 | 2 |

Cada ZIP inclui README, manifesto, prévia e rascunho de oferta. Cabe ao usuário revisar direitos e definir licença/preço antes de publicar. Thumbnails sem resumo de vídeo real são conceitos de portfólio; não se afirma acesso à transcrição. Duas variantes compartilham um fundo, não duas gerações independentes. Revisão visual por IA aponta problemas e não mede CTR.

Objetos 2D sem transparência ou com silhueta cortada são rejeitados. Dimensões comuns e instruções de estilo não garantem consistência artística perfeita ou escala física. Mobília 3D fica limitada a até sessenta caixas e quatro materiais; não produz formas orgânicas, rig, animação, física ou texturas fotográficas.

## Uso

Em Criar projeto autônomo, escolha especializações, limites e canais. Ative Permitir geração de imagens para thumbnails/2D; sem isso somente 3D será pesquisado. Conecte a chave na própria interface e inicie. A área Nova missão oferece os mesmos formatos com briefing específico. Downloads e prévias exigem o código de acesso do espaço, sem dados binários públicos no histórico.

Com três especializações, o pior ciclo reserva 12 chamadas: três pesquisas + análise + coordenação + sete chamadas do pack 2D. Apenas 3D usa até cinco. Falhas contam; não há retentativa automática cobrada. O limite é por chamada, não em dólares; cobranças de busca e imagens variam. Projetos existentes preservam seu comportamento anterior.

## Validação realizada

Testes automatizados exercitam composição e dimensões das thumbnails, transparência real dos sprites, atlas e ZIP, UV/geometria/materiais e validador GLB, seleção por especialização, contagem de chamadas e isolamento dos downloads/prévias.

As cenas de demonstração 2D e 3D foram importadas e executadas sem erros em Godot 4.5.1 oficial com modo headless, usando imagens/especificação de teste e o mesmo gerador de pacotes. Isso verifica o caminho de importação e a cena, não a qualidade visual de gerações futuras. Cada novo pack ainda deve ser conferido no motor. Unity não foi executado neste ambiente; instruções usam importação nativa de PNG/OBJ/MTL, GLB requer importador compatível.

Nenhuma chave real foi usada nesta validação. Publicação, contato com clientes, vendas e recebimento continuam sem integração. Não se registram receitas fictícias. O lint das alterações de agentes passa; o lint geral ainda aponta problemas anteriores nas telas legadas de crédito, fora deste fluxo.
