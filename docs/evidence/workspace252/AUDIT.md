# Inventário anterior à reorganização — 2.5.2

Base: master e53a4635f016628df35694fafb96ff83fff4f1bf. Hotfix Astra Recovery integrado. Branch feat/production-financial-workspace.

- AstraCampaigns: compositor e todas as campanhas expandidas; recuperação com checkpoints e consentimento para resultados externos desconhecidos.
- StudioProductions: todos os detalhes montados; previews reais baixados para cada produção; MP4 somente ao clicar.
- ViralContentPanel: polling independente do workspace pai; manual multiformato, voz, experimentos e provedores.
- AgentWorkspacePage: conexão OpenAI e orçamento em seções separadas; código de recuperação do workspace deve ser preservado.
- AiCostsPanel/server/ai-costs: limites internos em centavos BRL, reservas conservadoras, despesas confirmadas separadas das incertas.
- MediaProviders/server/multimodal-studio: limite diário USD, reservas por campanha e operação, CAS, credenciais criptografadas.
- VoiceStudio/server/universal-voice: limites em caracteres por amostras, viral e live; limite de sessão e consentimento específico. Amostras sem fallback silencioso.
- Autorizações de mídia são vinculadas à revisão do plano. Recuperação pode exigir autorização específica de repetição; não equivale a aumentar budget.

Não existe saldo monetário único entre esses controles. Uma central deve projetar as fontes existentes sem somar moedas, caracteres ou contar narração duas vezes. Cotas externas e custos finais podem permanecer desconhecidos.

Acesso a logs privados do Render e credenciais reais de geração não disponível nesta sessão. Nenhuma geração paga faz parte desta mudança.
