import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Package, ShoppingBag, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { storefrontApi, productionLabels } from '../services/agentApi';
import type { PublicCatalog, PurchaseReceipt } from '../services/agentApi';
import '../storefront.css';
const money = (minor: number) => (minor / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Não foi possível concluir a ação.';
function randomToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join(''); }
export function StorefrontPage() {
  const { slug = '' } = useParams();
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [purchase, setPurchase] = useState<PurchaseReceipt | null>(null);
  const [receipt] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('compra') || localStorage.getItem(`hubloan.purchase.${slug}`) || '');
  const selected = new URLSearchParams(window.location.search).get('produto');
  const checkPurchase = useCallback(async () => { if (!receipt) return; try { const data = await storefrontApi.receipt(slug, receipt); setPurchase(data); setError(''); } catch (e) { setError(errorText(e)); } }, [slug, receipt]);
  useEffect(() => { let active = true; storefrontApi.catalog(slug).then(data => { if (active) { setCatalog(data); document.title = `${data.name} · Produtos digitais`; } }).catch(e => { if (active) setError(errorText(e)); }); return () => { active = false; }; }, [slug]);
  useEffect(() => { let active = true; if (receipt) { localStorage.setItem(`hubloan.purchase.${slug}`, receipt); storefrontApi.receipt(slug, receipt).then(data => { if (active) setPurchase(data); }).catch(e => { if (active) setError(errorText(e)); }); } return () => { active = false; }; }, [slug, receipt]);
  async function buy(id: string) {
    setBusy(true); setError('');
    const storageKey = `hubloan.checkout.${slug}.${id}`;
    const token = localStorage.getItem(storageKey) || randomToken();
    localStorage.setItem(storageKey, token); localStorage.setItem(`hubloan.purchase.${slug}`, token);
    try { const result = await storefrontApi.checkout(slug, id, token); window.location.assign(result.url); }
    catch (e) { localStorage.removeItem(storageKey); setError(errorText(e)); setBusy(false); }
  }
  async function download() { setBusy(true); setError(''); try { const blob = await storefrontApi.download(slug, receipt); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = purchase?.filename || 'produto.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (e) { setError(errorText(e)); } finally { setBusy(false); } }
  const products = catalog?.products.filter(p => !selected || p.id === selected) || [];
  return <div className="digital-store"><header className="ds-nav"><a href={`/loja/${slug}`}><Package size={23} /> {catalog?.name || 'Produtos digitais'}</a><span><ShieldCheck size={16} /> Checkout Stripe</span></header><main><section className="ds-intro"><p className="ds-eyebrow">ARQUIVOS DIGITAIS / ENTREGA AUTOMÁTICA</p><h1>{catalog?.name || 'Carregando loja…'}</h1><p>Escolha um produto, pague no checkout e baixe os arquivos. Produtos criados com auxílio de IA; formatos e condições estão descritos em cada oferta.</p>{catalog && !catalog.livemode && <div className="ds-notice"><strong>Loja em modo teste.</strong> Pagamentos de teste não representam compras nem receita real. Não use um cartão real.</div>}{catalog && !catalog.enabled && <p className="ds-notice">A loja está pausada para novas compras. Downloads de compras existentes continuam disponíveis.</p>}</section>
    {error && <p className="ds-error" role="alert">{error}</p>}
    {!!receipt && <section className="ds-purchase"><h2>Sua compra</h2><p>{purchase?.title || 'Consultar pagamento'}</p><p>{purchase?.status === 'paid' ? 'Pagamento confirmado. Seu arquivo está disponível.' : purchase?.status === 'revoked' ? 'Acesso suspenso por reembolso ou contestação. Contate o vendedor.' : 'O download será liberado quando o pagamento for confirmado.'}</p><div className="ds-actions">{purchase?.status === 'paid' && <button disabled={busy} onClick={() => void download()}><Download size={16} /> Baixar ZIP</button>}<button className="ds-secondary" disabled={busy} onClick={() => void checkPurchase()}>Verificar pagamento</button></div><small>Guarde o link de retorno da compra em um local privado. Ele permite recuperar o download sem criar conta nesta loja.</small></section>}
    <section className="ds-products" aria-label="Produtos disponíveis">{products.map(p => <article className="ds-product" key={p.id}><div className="ds-product-icon">{p.hasPreview ? <img src={storefrontApi.previewUrl(slug, p.id)} alt={`Prévia de ${p.title}`} loading="lazy" /> : <Package size={38} />}<span>{productionLabels[p.kind]}</span></div><div className="ds-product-content"><h2>{p.title}</h2><p>{p.description}</p><p className="ds-file">ZIP · {(p.bytes / 1024).toFixed(0)} KB · download após pagamento</p><details><summary>Licença e condições</summary><p className="ds-license">{p.license}</p></details><div className="ds-buy"><strong>{money(p.priceMinor)}</strong><button disabled={busy || !catalog?.enabled} onClick={() => void buy(p.id)}><ShoppingBag size={16} /> {catalog?.livemode ? 'Comprar' : 'Testar checkout'}<ArrowUpRight size={16} /></button></div></div></article>)}</section>{catalog && !products.length && <p className="ds-empty">Nenhum produto disponível neste momento.</p>}
  </main><footer><span>Produtos digitais · arquivos e condições definidos pelo vendedor.</span>{catalog?.contact && <a href={`mailto:${catalog.contact}`}>Suporte: {catalog.contact}</a>}</footer></div>;
}
