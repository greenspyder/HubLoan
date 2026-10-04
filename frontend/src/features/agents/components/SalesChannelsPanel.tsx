import { Link } from 'react-router-dom';
import { ArrowRight, Store } from 'lucide-react';
import type { Workspace } from '../services/agentApi';
import { channelState, existingOffer, factoryChannels, marketplaceNames, offerUrl, publicationState } from '../services/salesChannels';
import '../marketplaces.css';

export function SalesChannelsPanel({ workspace: w }: { workspace: Workspace }) {
  return <section className="aw-panel sc-panel" id="channels"><p className="aw-eyebrow">SAÍDAS COMERCIAIS DAS SUAS FÁBRICAS</p><h2>Canais de venda</h2><p>Escolha onde oferecer seu trabalho. Preparar uma oferta não publica nem inicia gastos.</p><div className="sc-grid">{(['fiverr', 'etsy', 'itchio', 'shop'] as const).map(id => {
    const state = channelState(w, id);
    const factories = (w.factories || []).filter(f => id !== 'shop' && factoryChannels(f).includes(id));
    return <article className="sc-card" key={id}><div className={`sc-status sc-${state.tone}`}><i />{state.label}</div><h3><Store size={23} />{id === 'shop' ? 'Loja HubLoan' : marketplaceNames[id]}</h3><small>{id === 'fiverr' ? 'Serviço de thumbnails' : id === 'etsy' ? 'Downloads originais elegíveis' : id === 'itchio' ? 'Assets 2D / 3D' : 'Loja própria · canal complementar'}</small><p>{state.detail}</p><div className="sc-links">{factories.map(f => {
      const e = existingOffer(w, f.id, id);
      return <Link key={f.id} to={offerUrl(f.id, id, e?.id)}><span><strong>{f.name}</strong><small>{publicationState(e)}</small></span><span>{e ? 'Continuar oferta' : id === 'fiverr' ? 'Preparar Gig' : 'Preparar listing'} <ArrowRight size={14} /></span></Link>;
    })}</div>{id === 'itchio' && <Link className="aw-button aw-secondary" to="/agentes/conexoes#commerce">{w.commerce?.configured ? 'Gerenciar uploads e destinos' : 'Configurar integração itch.io'}</Link>}{id === 'shop' && <Link className="aw-button" to="/agentes/vendas#shop">Abrir minha loja</Link>}{id === 'etsy' && <small>Criações próprias elegíveis; revise as regras e declare uso de IA quando aplicável.</small>}</article>;
  })}</div><div className="sc-legend"><span className="sc-integrated">● Integrado</span><span className="sc-manual">● Assistido / manual</span><span>● Não configurado</span><span className="sc-error">● Erro</span></div></section>;
}
