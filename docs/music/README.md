# Repertório autorizado pelo operador

## Brazilian Sunsets — Ketsa

Lucas autorizou o uso em 22/10/2026: “Perfeito. Pode usar essa musica.” A autorização refere-se à candidata entregue anteriormente, cujo hash está em `brazilian-sunsets.json`. Não representa avaliação auditiva pelo agente, aprovação de outras faixas ou autorização de despesas.

Fonte: https://freemusicarchive.org/music/Ketsa/cc-by-free-to-use-for-anything/brazilian-sunsets/

Licença: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/

Crédito: **Brazilian Sunsets — Ketsa / Free Music Archive — CC BY 4.0**.

Modificação: conversão técnica para WAV PCM16 mono 24 kHz; ducking e mixagem com voz/efeitos durante a transmissão. A obra é instrumental de terceiro, não canto por IA nem composição do HubLoan.

A reprodução usa a biblioteca/mixer existentes. Na demonstração, a faixa é importada, aprovada pelo hash autorizado e selecionada como ambiente principal pela API normal. O renderer exibe o título, criador e licença. O arquivo fica no pacote entregue ao operador, não é duplicado no Git. A instalação no workspace de produção ainda exige importar esse arquivo no painel; a demonstração usa armazenamento local isolado.

Para reproduzir a evidência com o WAV do pacote entregue:

```bash
LIVE_APPROVED_AMBIENT_WAV=/caminho/brazilian-sunsets.wav \
LIVE_REPERTOIRE_EVIDENCE_DIR=/caminho/evidencia \
LIVE_EVIDENCE_PROFILE=light \
node --test --test-name-pattern='RTMP performance' server/tests/live-performance.test.mjs
```

Configure Chromium/FFmpeg/Kokoro conforme `docs/live-factory-phase42.md`. Crie previamente o diretório de evidência. A aprovação só é reutilizada se os bytes conferirem com o SHA-256 registrado. Não há custo de API ou geração por presente. As rosas e o presente especial da demonstração continuam acionando jingles instrumentais de teste identificados; a autorização desta faixa ambiente não resolve canto melódico.
