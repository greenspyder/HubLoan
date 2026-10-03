export const screens = [
  {id:'inicio', title:'Início', description:'Seu próximo passo e o que precisa de atenção.'},
  {id:'base', title:'Base 2D', description:'Fábricas, equipe e armazém ligados à operação real.'},
  {id:'producao', title:'Produção', description:'Escolha uma entrega ou autorize a pesquisa de oportunidades.'},
  {id:'armazem', title:'Armazém', description:'Revise, baixe e acompanhe suas entregas.'},
  {id:'vendas', title:'Vendas e custos', description:'Produtos publicados, pagamentos e resultados dos testes.'},
  {id:'divulgacao', title:'Divulgação', description:'Leve suas ofertas aos canais e acompanhe os resultados.'},
  {id:'conexoes', title:'Conexões', description:'Conecte um serviço por vez. Veja o que está pronto e o que falta.'},
  {id:'avancado', title:'Avançado', description:'Memória, equipe, decisões e melhorias da aplicação.'},
] as const;
export const sectionScreen: Record<string,string> = {overview:'inicio',start:'inicio',station:'base',factories:'base',autonomy:'producao','new-mission':'producao',missions:'armazem',terminal:'armazem',experiments:'vendas',shop:'vendas',marketing:'divulgacao',settings:'conexoes',costs:'conexoes',commerce:'conexoes',knowledge:'avancado',improvements:'avancado',agents:'avancado',astra:'avancado'};
export const sectionUrl = (section:string) => `/agentes/${sectionScreen[section] || 'inicio'}#${section}`;
