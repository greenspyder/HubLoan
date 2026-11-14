# Production Workspace & Financial Control Center — 2.5.2

## Implementação

Base auditada: master `e53a4635f016628df35694fafb96ff83fff4f1bf`, com Astra Recovery integrado. [Inventário](AUDIT.md).

- Campanhas e produções em abas, grids de oito itens, busca, estado, ordem e seleção via URL. Apenas o detalhe selecionado monta timeline, logs, revisão e player. Miniaturas usam somente previews existentes dos itens visíveis; nenhum MP4 é baixado automaticamente.
- Compositor Astra continua acessível em Criar com Astra. Manual multiformato, voz, conceitos e experimentos continuam no Studio avançado.
- Central financeira global em dialog nativo: foco modal, Escape, botão flutuante sem valores sensíveis, orçamento Astra, voz por finalidade, mídia, credenciais e autorizações por campanha/plano.
- Formulários existentes foram movidos e reutilizados. Orçamentos não ganharam armazenamento concorrente. O backend continua responsável por reservas e autorização.
- Configuração OpenAI preserva validação de modelos, chave criptografada, remoção e backup/restauração do workspace. Nenhuma chave armazenada é retornada.
- Orçamento OpenAI ganha revisão otimista para clientes atualizados. Clientes antigos sem revisão permanecem compatíveis. Voz e mídia mantêm suas revisões existentes. Auditoria financeira registra metadados e limites permitidos, nunca corpos de requisição ou chaves; janela persistida de 200 alterações.
- Creative Studio utiliza o estado e polling do workspace pai; salvar na central atualiza os módulos sem uma segunda cópia de configurações.

## Validação

- Backend: 313 testes, 304 aprovados, 9 skips de dependências/integrações opcionais, nenhuma falha.
- Três novos testes de integração financeira: autenticação, isolamento, CAS concorrente, finalidade, persistência entre requisições, compatibilidade legada, auditoria sem segredos e rejeição de configuração inválida.
- Build aprovado. Lint do módulo de agentes aprovado. Lint global: 11 erros e 2 avisos preexistentes, reproduzidos no checkout da base; não declaramos lint global limpo.
- Navegador Chromium real local em 390 e 1440 px: paginação, busca, seleção única, retorno com filtro preservado, galeria, carregamento e leitura do MP4, central, salvar orçamento, Escape, campos de chave vazios e ausência de overflow horizontal.
- Regressão visual de recuperação: campanha selecionada continua exigindo consentimento explícito para resultado desconhecido; autenticação bloqueada até reconexão. Nenhuma retomada paga executada.
- Capturas `ui/before-*.webp` usam frontend compilado da master anterior. Demais capturas usam esta implementação. Dados são fixtures locais identificadas, nunca inseridos em produção.
- O MP4 usado no teste de player é um artefato técnico local anterior; não é apresentado como nova geração audiovisual.

## Limitações explícitas

- Paginação e busca das listas são locais. A projeção autenticada do Studio remove planos, decisões, relatórios e logs dos itens não selecionados também das respostas de rede; detalhes são buscados ao selecionar. Outros módulos e clientes antigos mantêm seu contrato de snapshot.
- Não existe saldo único intercambiável entre BRL, USD e caracteres, nem novo limite global de múltiplos provedores. A central expõe os controles existentes e não calcula conversão cambial fictícia.
- Custos finais e saldos externos permanecem desconhecidos quando a integração não os informa. Limite de mídia é compartilhado; não há novos limites monetários independentes por provedor.
- Orçamentos de experimentos comerciais/audiência não são autorização de API e permanecem junto da criação desses experimentos. A central reúne autorizações operacionais de Astra, voz e mídia; não substitui a contabilidade comercial.
- Higgsfield não possui consulta geral de catálogo/saldo implementada. Seu estado não é apresentado como verificado ao apenas salvar a chave.
- Ledger detalhado usa histórico existente; o histórico de auditoria começa com esta versão, sem reconstruir alterações antigas.
- Não foram usados provedores pagos, credenciais reais nem campanhas privadas do usuário. Custo de geração consumido: zero. A validação externa de navegador depende do acesso disponível; capturas aqui são locais.

Os controles de produção e recuperação foram preservados. A central utiliza as capacidades financeiras existentes; os limites citados não são apresentados como recursos implementados.
