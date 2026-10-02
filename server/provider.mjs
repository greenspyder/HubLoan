import { AppError } from './domain.mjs';

export function providerError(status, code) {
  if (status === 401) return new AppError('A chave da OpenAI não é válida. Reconecte a chave nas configurações.', 422);
  if (code === 'insufficient_quota') return new AppError('Sua conta de API está sem saldo ou atingiu o limite de gastos. Verifique a cobrança na OpenAI.', 422);
  if (status === 429) return new AppError('A OpenAI limitou as chamadas. Aguarde antes de tentar novamente.', 422);
  if (status === 403) return new AppError('Sua conta não tem acesso ao modelo. Para imagens, pode ser necessária a verificação da organização na OpenAI.', 422);
  if (status === 404) return new AppError('O modelo não está disponível nesta conta. Escolha outro modelo nas configurações.', 422);
  if (code === 'content_policy_violation') return new AppError('O provedor não pôde gerar este conteúdo. Ajuste o briefing.', 422);
  return new AppError('O provedor não conseguiu concluir a chamada. Verifique o modelo e tente novamente.', 422);
}
export function createProvider(fetcher = fetch) {
  async function request(path, key, { body, signal, method = 'POST' } = {}) {
    const response = await fetcher(`https://api.openai.com/v1/${path}`, { method, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.any([signal || new AbortController().signal, AbortSignal.timeout(180000)]) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw providerError(response.status, data.error?.code);
    return data;
  }
  return {
    async validate(key, model) { await request(`models/${encodeURIComponent(model)}`, key, { method: 'GET' }); },
    async text(key, model, instructions, input, maxTokens, signal) {
      const data = await request('responses', key, { body: { model, instructions, input, max_output_tokens: maxTokens, store: false }, signal });
      const output = (data.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('\n').trim();
      if (!output) throw new AppError('O modelo não devolveu uma entrega em texto. Ajuste o briefing.', 422);
      return { output, tokens: data.usage?.total_tokens || 0, truncated: data.status === 'incomplete' };
    },
    async image(key, model, prompt, signal) {
      const data = await request('images/generations', key, { body: { model, prompt, n: 1, size: '1536x1024', quality: 'low', output_format: 'png' }, signal });
      const base64 = data.data?.[0]?.b64_json;
      if (!base64 || base64.length > 20000000) throw new AppError('O provedor não devolveu uma imagem válida.', 422);
      return { base64, tokens: data.usage?.total_tokens || 0 };
    },
  };
}
