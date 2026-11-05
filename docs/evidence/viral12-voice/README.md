# Revisão vocal e cinematográfica — PR #26

## Implementado

Voice Studio na rota existente, perfil global por workspace, rascunho/escuta/aprovação explícita, revisão concorrente, snapshot por produção e autorização live. Kokoro existente, sem provedor pago ou segundo pipeline. Estados de intenção controlam velocidade/pontuação, não emoção neural. Voz ativa não substituída automaticamente.

Rig existente com envelope facial, correção durante curvas Front e telemetria de possíveis oclusões. Apresentação de personagens usa três planos Front e conclusão Action. Roteiro corrigido para não chamar a raposa de gato. Sem mudanças na física.

## Testado

Resultados reproduzíveis em `backend-final.txt`, `webgl-final.txt`, `build-final.txt`, `lint-final.txt` e `validation.json`. Build e lint dos módulos alterados aprovados. O lint global ainda apresenta problemas fora do escopo; não foi declarado limpo. Testes backend incluem receptor RTMP independente, interrupção do encoder, isolamento, revisão de perfil, snapshots e fallback. Isso não valida a voz neural em uma live prolongada.

## Validação perceptiva

Inspeção visual feita em quadros extraídos dos MP4s, distribuídos ao longo dos três formatos. Não houve escuta perceptiva do áudio nem reprodução integral em tempo real. Naturalidade, mistério, humor e qualidade musical dependem da revisão do operador. Métricas PCM/AAC não substituem essa aprovação.

A comédia mantém a Lume grande e legível, mas o fundo ainda disputa atenção. A batalha melhora o enquadramento geométrico; corpos continuam próximos e a leitura espacial ainda exige atenção. Os personagens têm silhuetas diferenciadas, porém o acabamento procedural e os enquadramentos laterais não desapareceram. As heurísticas não provam ausência de oclusões. Legendas podem competir com o retrato secundário da apresentadora; revisão fina de composição permanece necessária.

## Vozes e custos

15 amostras reais: cinco frases idênticas em três direções da mesma `pf_dora`. Não há três timbres femininos brasileiros comprovados neste ambiente. Nenhuma candidata foi declarada vencedora. Vídeos usam direção contida provisória. Não há gasto de API, assinatura ou publicação. CPU/energia locais não monetizadas. Brazilian Sunsets, Ketsa, CC BY 4.0, reutilizada com hash/aprovação existentes; não é música nova nem canto IA.

## Pendências explícitas

- Escolha auditiva da voz oficial e validação da intenção emocional.
- Modelos alternativos realmente comparáveis, caso as três direções não agradem.
- Correção fina de sobreposições e aprovação artística dos novos MP4s.
- Alinhamento fonético: a boca continua baseada no envelope do áudio.
- Validação neural de longa duração em live e perfil 720p/30 em hardware adequado.

Manter PR em rascunho. Nenhum merge, deploy ou publicação autorizado nesta entrega.

Última execução: 223 testes backend aprovados, 4 opcionais pulados; WebGL real 3 aprovados, 1 Piper opcional pulado; smoke test de interface aprovado. Lint global: 11 erros e 2 avisos fora dos módulos alterados. Lint direcionado e build passaram. MP4s: 270/375/300 quadros distintos em 18/25/20 segundos, H.264/AAC, 360×640/15 FPS. 12 falas neurais, zero fallback. Renderização offline: 24,351 / 35,255 / 24,596 segundos.
