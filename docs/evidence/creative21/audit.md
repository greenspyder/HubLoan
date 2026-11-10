# Auditoria antes da implementação 2.1
HEAD remoto/local: 89d98ea4b66c5fc41a91be95769147d2867309f4. Branch codex/viral-audiovisual12, árvore limpa. Lidos AGENTS.md, relatório creative20, creative-director, runner, provider, checkpoints, viral-director, motion-story e painel existente.

Funcionais: fila e checkpoints de missões, armazenamento por workspace com CAS, contratos de proposta, modo conectado com orçamento/política global, renderizadores short/motion-story, revisão de versão, frontend. Testados historicamente: renderização 2.0 e interface. Não presumir aprovação artística.

Incompletos: proposta conectada termina em revisão, sem seleção ou despacho automático; registro local contém cinco roteiros fixos. creative-demo escolhe formatos explicitamente e chama produce para cada proposta. Isso explica a intervenção do desenvolvedor: não existia campanha nem ligação automática entre decisão e execução. Microconto tem movimentos codificados por tempo, independentes do roteiro. Short usa direção determinística com ações da simulação, não contrato visual gerado pelo modelo.

Fixtures: testes de modelo controlado não executaram inferência externa. Falhas históricas: três testes voice20 e lint global. Não há evidência de chave/modelo no novo ambiente; checkout contém código, não credenciais do workspace de produção. O teste de autonomia deve registrar essa ausência e parar; nunca usar conceitos locais ou MP4s históricos como substituição.
