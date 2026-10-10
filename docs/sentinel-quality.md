# Sentinel: revisão estruturada de packs 2D

A chamada visual existente compara os quatro sprites reais e recebe o inventário dos arquivos já construídos (atlas, cena, documentação), medições técnicas e estilo. Não há chamadas adicionais ou regeneração automática. O contrato exige evidência por objeto e por critério: coerência, perspectiva, escala relativa, paleta/iluminação.

O servidor normaliza APPROVE, REGENERATE_PARTIAL e REJECT. Campos ausentes, JSON inválido/truncado, IDs inventados e UNKNOWN bloqueiam a aprovação simples; o pacote pago continua disponível. Critérios reprovados prevalecem sobre uma decisão otimista. Perspectivas declaradas incompatíveis também prevalecem; um alvo top-down inequívoco no estilo permite localizar desvios. Sem alvo claro, um conjunto misto pede revisão completa. Isso verifica consistência da análise, não mede objetivamente a perspectiva das imagens.

Em Armazém → Detalhes, Sentinel mostra decisão, evidências e ajustes por arquivo. Preparar ajustes sugeridos apenas preenche feedback/seleção; Solicitar ajustes inicia o fluxo existente sob orçamento. A aprovação humana de uma reprovação/inconclusão exige confirmação, justificativa e versão atual, registrada no histórico. A autorização comercial de preço/versão/canal continua separada.

`mission.qualityReview`, `quality-review.json` e o manifesto guardam o resultado. Versões arquivadas conservam a avaliação anterior. O contrato antigo de revisão é arquivado em `execution.previousReviews` antes do preflight do novo contrato; imagens e texto pagos permanecem reutilizáveis. Não há migração destrutiva nem reavaliação paga de entregas antigas por simples leitura. Entregas antigas sem avaliação estruturada mantêm a aprovação humana existente.

Limites: somente sprites nesta fatia; thumbnail/3D permanecem no fluxo anterior. Não comprova importação no motor, originalidade, demanda ou valor comercial. A confiabilidade da percepção visual exige validação humana com packs reais. Testes usam imagens e respostas simuladas, sem provider pago; cobrem contradições, parcial/rejeição, dados inválidos, override vinculado à versão e inventário/ZIP. Teste em celular real ainda necessário.
