// data/efeitos.js
// Observações de implementação:
// - Em Manifestação (MH), se não houver calcPV, PV=PA.
// - calcPA recebe: { tecnica, params, emManifestacao, context:{condicoes, subcatId, affinities} }
// - Para itens com pré-requisitos complexos, descrevi em 'desc' e deixei 'params' para configuração.
// - Onde o livro cita “dobro/reduzido/limite”, coloquei flags em params para controlar (quando não há
//   dados do personagem suficientes em runtime).

export const EFEITOS = [
  // =========================
  // CONTROLE / AUMENTO DE CUSTO
  // =========================
  {
    id:'adicionar_condicao',
    nome:'Adicionar Condição',
    grupo:'controle',
    desc:'Impõe uma condição à criatura. Se não tiver duração própria, dura até o início do seu próximo turno (ou até o fim do próximo turno de outra criatura afetada). Sempre exige Salvaguarda.',
    paramsSpec:[
      { key:'cond', label:'Condição', type:'select', default:'agarrado',
        options: [
          // mapeie usando os ids do arquivo condicoes.js
          'agarrado','alucinado','amedrontado','apaixonado','atordoado','bebado','caido','cego','congelado','desidratado',
          'empoderado','enfeiticado','estremecido','exausto','envenenado','enfurecido','impedido','incapacitado','inconsciente',
          'invisivel','hipotermico','letargico','paralisado','pesado','petrificado','queimado','sangramento','sonolento','sufocado','surdo'
        ]
      },
      { key:'numTestes', label:'Quantidade de Salvaguardas simultâneas (se a técnica pedir mais de uma)', type:'int', min:1, default:1 },
    ],
    calcPA:({params, context})=>{
      const cond = context?.condicoes?.find(c=>c.id===params?.cond);
      const base = (cond?.pa ?? 0);
      const tests = Math.max(1, parseInt(params?.numTestes??1,10));
      if(!isFinite(base)) return 9999; // Aura Esgotada não reproduzível
      return base * tests;
    }
  },
  {
    id:'adicionar_vantagem_desvantagem',
    nome:'Adicionar Vantagem/Desvantagem',
    grupo:'controle',
    desc:'Dá vantagem ou desvantagem em um tipo de jogada: ataque, testes de atributo, ou salvaguardas (dura até o início do seu próximo turno).',
    paramsSpec:[
      { key:'tipo', label:'Tipo de jogada', type:'select', default:'ataque', options:['ataque','testes','salvaguardas','ataques_multiplos'] },
    ],
    calcPA:({params, emManifestacao})=>{
      const t = params?.tipo || 'ataque';
      if(t==='ataques_multiplos') return emManifestacao ? 2 : 3;
      if(t==='ataque') return emManifestacao ? 1 : 2;
      // testes de atributo ou salvaguardas: 1 PA fixo
      return 1;
    }
  },
  { id:'disputa_honrosa', nome:'Disputa Honrosa', grupo:'controle',
    desc:'O alvo não tem vantagem nem desvantagem para te atacar (ataques comuns ou técnicas).',
    calcPA:()=>3
  },
  { id:'reducao_pv_maximo', nome:'Redução de PV Máximo', grupo:'controle',
    desc:'Metade do dano causado é retirada dos PV máximos do inimigo. Recupera os PV máx. em descanso curto/longos normais.',
    calcPA:()=>12
  },
  {
    id:'alcance_melee_plus',
    nome:'Aumentar Alcance Corpo-a-Corpo',
    grupo:'controle',
    desc:'Aumenta alcance de ataque corpo-a-corpo: +1 PA a cada 3 m (máx. +12 m).',
    paramsSpec:[{ key:'metros', label:'Metros extras (≤12)', type:'int', min:3, max:12, step:3, default:3 },
                { key:'afin_emissor_100', label:'Afinidade 100% Emissão? (custa dobro)', type:'bool', default:false }],
    calcPA:({params})=>{
      const extra = Math.max(3, Math.min(12, parseInt(params?.metros??3,10)));
      let pa = Math.ceil(extra/3);
      if(params?.afin_emissor_100) pa *= 2;
      return pa;
    }
  },
  {
    id:'aumentar_cd',
    nome:'Aumentar Classe de Dificuldade (CD)',
    grupo:'controle',
    desc:'+1 CD por 1 PA (até +2). Se houver 2+ salvaguardas, pagar para cada teste.',
    paramsSpec:[
      { key:'bonus', label:'Bônus de CD (1–2)', type:'int', min:1, max:2, default:1 },
      { key:'numTestes', label:'Qtd. de testes na técnica', type:'int', min:1, default:1 },
    ],
    calcPA:({params})=> (Math.max(1, Math.min(2, parseInt(params?.bonus??1,10))) * Math.max(1, parseInt(params?.numTestes??1,10)))
  },
  {
    id:'condicao_efeito_extra',
    nome:'Condição/Efeito Extra',
    grupo:'controle',
    desc:'Permite 2º efeito/condição (máx. 2). Custa o mesmo valor de PA do(s) efeito(s)/condição(ões) adicional(is).',
    paramsSpec:[
      { key:'custoExtra', label:'PA do(s) efeito(s) extra(s) somado(s)', type:'int', min:1, default:2 }
    ],
    calcPA:({params})=> Math.max(1, parseInt(params?.custoExtra??1,10))
  },
  {
    id:'condicao_efeito_em_area',
    nome:'Condição/Efeito em Área',
    grupo:'controle',
    desc:'Aplica a condição/efeito em todas as criaturas da área. Se a técnica causar dano, só quem falhar no Save do dano pode ser afetado (fazendo outro Save).',
    paramsSpec:[/* grau vem da técnica */],
    calcPA:({tecnica})=>{
      const g = Math.max(1, parseInt(tecnica?.grau||1,10));
      return Math.ceil(g/2);
    }
  },
  { id:'controle_cirurgico', nome:'Controle Cirúrgico', grupo:'controle',
    desc:'Permite excluir aliados (até seu modificador principal) dentro da área da técnica que exige salvaguarda.',
    calcPA:()=>1
  },
  { id:'criar_lacaio_suporte', nome:'Criar Lacaio de Suporte', grupo:'controle',
    desc:'Cria um lacaio de suporte (até 1h). CR base 10, PV 20, Desl. 9 m; pode: Ajuda, Usar Objeto, Esquiva, Esconder, Disparada. Sem ataques.',
    calcPA:()=>4
  },
  {
    id:'duracao_prolongada',
    nome:'Duração Prolongada',
    grupo:'controle',
    desc:'Estende duração de efeitos/condições. Primeiro minuto: 6 PA; cada minuto adicional: +3 PA. Pode pagar +1 PA por efeito extra a prolongar.',
    paramsSpec:[
      { key:'minutos', label:'Duração (minutos)', type:'int', min:1, default:1 },
      { key:'extras', label:'Qtd. de efeitos/condições adicionais a prolongar', type:'int', min:0, default:0 },
    ],
    calcPA:({params})=>{
      const m = Math.max(1, parseInt(params?.minutos??1,10));
      const extra = Math.max(0, parseInt(params?.extras??0,10));
      return 6 + (m-1)*3 + extra*1;
    }
  },
  {
    id:'criar_lacaio_combate',
    nome:'Criar Lacaio de Combate',
    grupo:'controle',
    desc:'Cria um lacaio de combate (1 min). Ações: Atacar(1x), Ajuda, Usar Objeto, Agarrão. Pode melhorar CR/PV/Deslocamento pagando PA extra.',
    paramsSpec:[
      { key:'cr', label:'CR alvo (10 base; +1 CR = +2 PA; máx 18 CR)', type:'int', min:10, max:18, default:15 },
      { key:'pvExtra', label:'PV extras (10 PV por +1 PA; máx 120 PV extras)', type:'int', min:0, max:120, step:10, default:0 },
      { key:'mExtra', label:'Metros extras de deslocamento (+3m = +1 PA; máx +6m)', type:'int', min:0, max:6, step:3, default:0 },
    ],
    calcPA:({params})=>{
      const base = 8;
      const cr = Math.max(10, Math.min(18, parseInt(params?.cr??15,10)));
      const pv = Math.max(0, Math.min(120, parseInt(params?.pvExtra??0,10)));
      const m = Math.max(0, Math.min(6, parseInt(params?.mExtra??0,10)));
      return base + (cr-10)*2 + Math.ceil(pv/10)*1 + Math.ceil(m/3)*1;
    }
  },
  {
    id:'supressao_aura',
    nome:'Supressão de Aura (Zetsu Forçado)',
    grupo:'controle',
    desc:'Força Zetsu no alvo por 1m/1h/24h/30d. +4 PA para cada passo acima de 1 min. Manifestações: 10 PA base; Técnicas: 20 PA base. Requisitos pesados (4 restrições, tema, 5 rodadas ou “Grupo Específico”).',
    paramsSpec:[
      { key:'dur', label:'Duração', type:'select', default:'1m', options:['1m','1h','24h','30d'] },
      { key:'modo', label:'Está aplicando em (tecnica/manifestacao)', type:'select', default:'manifestacao', options:['manifestacao','tecnica'] },
    ],
    calcPA:({params})=>{
      const base = params?.modo==='tecnica' ? 20 : 10;
      const extra = params?.dur==='1h' ? 4 : params?.dur==='24h' ? 8 : params?.dur==='30d' ? 12 : 0;
      return base + extra;
    }
  },
  {
    id:'regra_imposta',
    nome:'Regra Imposta (Pacto)',
    grupo:'controle',
    desc:'Estipula termos a serem seguidos (pacto). Quebrar regra = morte/preço. Custo 25 PA (10 PA em Manifestação). Requer MH com 3+ restrições ou “Múltiplos Caminhos”.',
    paramsSpec:[{ key:'modo', label:'tecnica ou manifestacao', type:'select', default:'manifestacao', options:['manifestacao','tecnica'] }],
    calcPA:({params})=> (params?.modo==='manifestacao'?10:25)
  },
  {
    id:'tecnica_dominada',
    nome:'Técnica Dominada',
    grupo:'controle',
    desc:'Permite ajustar o custo de PA por uso e ultrapassar o limite máximo do grau em +1 PA.',
    calcPA:()=>1
  },
  {
    id:'tecnica_rapida',
    nome:'Técnica Rápida (Ação → Bônus/Reação)',
    grupo:'controle',
    desc:'Transforma execução da técnica de Ação para Ação Bônus ou Reação. Custo = metade do grau (arred. p/ cima).',
    calcPA:({tecnica})=> Math.ceil(Math.max(1, parseInt(tecnica?.grau||1,10))/2)
  },

  // =========================
  // OFENSIVO
  // =========================
  {
    id:'acerto_automatico',
    nome:'Acerto Automático',
    grupo:'ofensivo',
    desc:'Acerta sem rolar (sem crítico). 5 PA (técnica) ou 3 PA (ataque comum).',
    paramsSpec:[{ key:'modo', label:'Tipo', type:'select', default:'tecnica', options:['tecnica','ataque'] }],
    calcPA:({params})=> (params?.modo==='ataque'?3:5)
  },
  {
    id:'adicionar_critico',
    nome:'Adicionar Crítico',
    grupo:'ofensivo',
    desc:'Aumenta margem de crítico. 1 PA (19–20) ou 3 PA (18–20). Em MH Defensivo o custo dobra (use flag).',
    paramsSpec:[
      { key:'faixa', label:'Faixa de crítico', type:'select', default:'19-20', options:['19-20','18-20'] },
      { key:'defensivo', label:'Manifestação Defensiva? (dobra custo)', type:'bool', default:false },
    ],
    calcPA:({params})=>{
      let pa = (params?.faixa==='18-20') ? 3 : 1;
      if(params?.defensivo) pa *= 2;
      return pa;
    }
  },
  { id:'adicionar_modificador', nome:'Adicionar Modificador', grupo:'ofensivo',
    desc:'Adiciona o Modificador da Categoria em curas/escudos/danos indiretos (não combina com “Criar Arma”).',
    calcPA:()=>1
  },
  {
    id:'ataque_de_cerco',
    nome:'Ataque de Cerco',
    grupo:'ofensivo',
    desc:'Dobra/Triplica dano em objetos/estruturas (não vestindo/carregando).',
    paramsSpec:[{ key:'multiplicador', label:'2x ou 3x', type:'select', default:'2x', options:['2x','3x'] }],
    calcPA:({params})=> (params?.multiplicador==='3x'?2:1)
  },
  {
    id:'ataques_multiplos',
    nome:'Ataques Múltiplos',
    grupo:'ofensivo',
    desc:'Garante ataques comuns extras até o fim do turno (requer Ação Bônus). 3 PA (1 ataque), 7 PA (2 ataques). MH não pode dar >1 ataque.',
    paramsSpec:[{ key:'qtd', label:'Qtd. de ataques comuns adicionais', type:'select', default:'1', options:['1','2'] }],
    calcPA:({params, emManifestacao})=>{
      const n = parseInt(params?.qtd||'1',10);
      if(emManifestacao) return 3; // limite de 1 ataque adicional
      return n===2 ? 7 : 3;
    }
  },
  {
    id:'aumentar_acerto',
    nome:'Aumentar Acerto (+Ataque)',
    grupo:'ofensivo',
    desc:'+1 no acerto por 1 PA (até +5).',
    paramsSpec:[{ key:'bonus', label:'Bônus de Ataque (1–5)', type:'int', min:1, max:5, default:1 }],
    calcPA:({params})=> Math.max(1, Math.min(5, parseInt(params?.bonus??1,10)))
  },
  {
    id:'aumentar_dano',
    nome:'Aumentar Dano (+fixo)',
    grupo:'ofensivo',
    desc:'+1 dano por 3 PA; +1 adicional por cada +2 PA (máx +5). Consome 2 PA por turno de manutenção enquanto ativo.',
    paramsSpec:[{ key:'bonus', label:'Bônus de dano (1–5)', type:'int', min:1, max:5, default:1 }],
    calcPA:({params})=>{
      const b = Math.max(1, Math.min(5, parseInt(params?.bonus??1,10)));
      return 3 + (b-1)*2;
    }
  },
  {
    id:'mudar_alcance',
    nome:'Mudar Alcance (melee → distância)',
    grupo:'ofensivo',
    desc:'1 PA para mudar para 9m; +1 PA a cada +3m.',
    paramsSpec:[{key:'metros',label:'Alcance (m)',type:'int',min:9,step:3,default:9,max:90}],
    calcPA:({params})=>{
      const m = Math.max(9, parseInt(params?.metros??9,10));
      return 1 + Math.ceil((m-9)/3);
    }
  },
  {
    id:'dano_adicional',
    nome:'Dano Adicional (dados extras)',
    grupo:'ofensivo',
    desc:'Adiciona dados de dano adicionais (mesmo dado da técnica). Máx 7 PA (1 PA = +1 dado). Em MH: máx +2 dados.',
    paramsSpec:[{ key:'dados', label:'Qtd. de dados', type:'int', min:1, max:7, default:1 }],
    calcPA:({params, emManifestacao})=>{
      const maxDados = emManifestacao ? 2 : 7;
      const d = Math.max(1, Math.min(maxDados, parseInt(params?.dados??1,10)));
      return d;
    }
  },
  {
    id:'dano_fixo',
    nome:'Dano Fixo (criar/boost arma)',
    grupo:'ofensivo',
    desc:'+1 passo no dano da arma/ataque desarmado (máx 2d6). 2 PA por passo.',
    paramsSpec:[{ key:'passos', label:'Passos de aumento', type:'int', min:1, max:5, default:1 }],
    calcPA:({params})=> Math.max(1, parseInt(params?.passos??1,10)) * 2
  },
  {
    id:'redirecionar_ataque',
    nome:'Redirecionar Ataque',
    grupo:'ofensivo',
    desc:'Muda o alvo de um ataque p/ outra criatura. 4 PA (ataque comum), 22 PA (técnica). Se for só para criaturas voluntárias não-conjuradas: 4 PA. Em MH: custo pela metade.',
    paramsSpec:[
      { key:'tipo', label:'Tipo', type:'select', default:'comum', options:['comum','tecnica','tecnica_voluntario'] }
    ],
    calcPA:({params, emManifestacao})=>{
      let pa = (params?.tipo==='tecnica') ? 22 : 4;
      if(params?.tipo==='tecnica_voluntario') pa = 4;
      if(emManifestacao) pa = Math.ceil(pa/2);
      return pa;
    }
  },
  {
    id:'dano_continuo',
    nome:'Dano Contínuo (área fixa)',
    grupo:'ofensivo',
    desc:'Causa dano por turno em área fixa; requer Duração Prolongada. Máx dados/turno = grau da técnica.',
    calcPA:({tecnica})=> Math.ceil(Math.max(1, parseInt(tecnica?.grau||1,10))/2)
  },
  {
    id:'destruicao_instantanea',
    nome:'Destruição Instantânea',
    grupo:'ofensivo',
    desc:'Destrói instantaneamente objetos/estruturas não carregadas. Tamanho: Médio=2 PA, Grande=3, Enorme=4, Imenso=6.',
    paramsSpec:[{ key:'tam', label:'Tamanho', type:'select', default:'medio', options:['medio','grande','enorme','imenso'] }],
    calcPA:({params})=>{
      const map = { medio:2, grande:3, enorme:4, imenso:6 };
      return map[params?.tam||'medio'] || 2;
    }
  },

  // =========================
  // SUPORTE
  // =========================
  {
    id:'adicionar_cura',
    nome:'Adicionar Cura',
    grupo:'suporte',
    desc:'Cura PV: 1 PA por 1d10 (alvo único) ou 1d6 (em área). Exigência: custo base da técnica ≥ metade dos dados.',
    paramsSpec:[
      { key:'modo', label:'Alvo único ou área', type:'select', default:'unico', options:['unico','area'] },
      { key:'dados', label:'Qtd. de dados', type:'int', min:1, max:20, default:1 }
    ],
    calcPA:({params})=>{
      const d = Math.max(1, parseInt(params?.dados??1,10));
      return d * 1; // 1 PA por dado (d10 ou d6)
    }
  },
  {
    id:'acoes_adicionais',
    nome:'Ações Adicionais',
    grupo:'suporte',
    desc:'Ganha ações bônus/reações extras. 10 PA (uma ação bônus OU reação); 18 PA (uma de cada).',
    paramsSpec:[{ key:'tipo', label:'Tipo', type:'select', default:'uma', options:['uma','ambas'] }],
    calcPA:({params})=> (params?.tipo==='ambas'?18:10)
  },
  {
    id:'cura_continua',
    nome:'Cura Contínua',
    grupo:'suporte',
    desc:'Cura por turno (requer Duração Prolongada). Máx dados/turno = grau.',
    calcPA:({tecnica})=> Math.ceil(Math.max(1, parseInt(tecnica?.grau||1,10))/2)
  },
  {
    id:'adicionar_resistencia',
    nome:'Adicionar Resistência (dano)',
    grupo:'suporte',
    desc:'Resistência a dano(s). 1 PA por tipo elemental, ou 6 PA para “todos exceto Verdadeiro + 1 tipo do mestre”.',
    paramsSpec:[{ key:'modo', label:'Modo', type:'select', default:'por_tipo', options:['por_tipo','todos_exceto_verdadeiro'] },
                { key:'qtd', label:'Qtd. de tipos (se por tipo)', type:'int', min:1, max:6, default:1 }],
    calcPA:({params})=>{
      if(params?.modo==='todos_exceto_verdadeiro') return 6;
      return Math.max(1, parseInt(params?.qtd??1,10)) * 1;
    }
  },
  {
    id:'alterar_aparencia',
    nome:'Alterar Aparência/Voz',
    grupo:'suporte',
    desc:'2 PA (Voz), 3 PA (Aparência), 6 PA (Mudança Completa), 10 PA (Mudança Perfeita).',
    paramsSpec:[{ key:'nivel', label:'Voz/Aparência/Completo/Perfeito', type:'select', default:'voz', options:['voz','aparencia','completo','perfeito'] }],
    calcPA:({params})=>{
      return (params?.nivel==='perfeito') ? 10 :
             (params?.nivel==='completo') ? 6 :
             (params?.nivel==='aparencia') ? 3 : 2;
    }
  },
  {
    id:'pv_temporarios',
    nome:'Adicionar PV Temporários',
    grupo:'suporte',
    desc:'Cria PV temporários: 1 PA por 1d10 (único) ou 1d6 (área). MH: máx 4 dados por vez.',
    paramsSpec:[
      { key:'modo', label:'Alvo único ou área', type:'select', default:'unico', options:['unico','area'] },
      { key:'dados', label:'Qtd. de dados', type:'int', min:1, max:40, default:1 }
    ],
    calcPA:({params, emManifestacao})=>{
      const max = emManifestacao ? 4 : 40;
      const d = Math.max(1, Math.min(max, parseInt(params?.dados??1,10)));
      return d;
    }
  },
  {
    id:'adicionar_voo',
    nome:'Adicionar Voo',
    grupo:'suporte',
    desc:'2 PA: 12 m de voo a uma criatura. 4 PA: voo = seu deslocamento de caminhada.',
    paramsSpec:[{ key:'modo', label:'12m ou igual ao deslocamento', type:'select', default:'12m', options:['12m','igual_deslocamento'] }],
    calcPA:({params})=> (params?.modo==='igual_deslocamento'?4:2)
  },
  { id:'aura_invisivel', nome:'Aura Invisível', grupo:'suporte',
    desc:'Habilidade imperceptível sem Gyo quando dormente. Não pode causar dano/condições.',
    calcPA:()=>2
  },
  {
    id:'aumentar_cr',
    nome:'Aumentar Classe de Resistência (CR)',
    grupo:'suporte',
    desc:'+1 CR por 2 PA (até CR 30).',
    paramsSpec:[{ key:'bonus', label:'Bônus (1–10)', type:'int', min:1, max:10, default:1 }],
    calcPA:({params})=> Math.max(1, Math.min(10, parseInt(params?.bonus??1,10))) * 2
  },
  {
    id:'aumentar_mov',
    nome:'Aumentar Movimento',
    grupo:'suporte',
    desc:'+3 m por 1 PA ou +6 m por 2 PA.',
    paramsSpec:[{ key:'metros', label:'Metros (+3 ou +6)', type:'select', default:'3', options:['3','6'] }],
    calcPA:({params})=> (params?.metros==='6'?2:1)
  },
  {
    id:'contencao_coletiva',
    nome:'Contenção de Dano (Coletivo)',
    grupo:'suporte',
    desc:'Reduz dano recebido por você e aliados atrás em cone de 12 m, até seu próximo turno. 1 PA por 1d8 (máx 15d8).',
    paramsSpec:[{ key:'dados', label:'Dados d8 de proteção (1–15)', type:'int', min:1, max:15, default:1 }],
    calcPA:({params})=> Math.max(1, Math.min(15, parseInt(params?.dados??1,10)))
  },
  { id:'ignorar_terreno', nome:'Ignorar Terreno Difícil', grupo:'suporte',
    desc:'Ignora terreno difícil por 1 min (padrão).',
    calcPA:()=>2
  },
  {
    id:'contencao_individual',
    nome:'Contenção de Dano (Individual)',
    grupo:'suporte',
    desc:'Modelo A: 1 PA por 2d8 (máx 30d8; em MH máx 4d8 e só reduz um ataque). Modelo B (estendido): 2 PA por 1d8, máx = grau da técnica (até 4).',
    paramsSpec:[
      { key:'modelo', label:'Modelo', type:'select', default:'A', options:['A','B'] },
      { key:'dados', label:'Qtd. d8', type:'int', min:1, max:30, default:2 }
    ],
    calcPA:({params, emManifestacao, tecnica})=>{
      const modelo = params?.modelo || 'A';
      let dados = Math.max(1, parseInt(params?.dados??2,10));
      if(modelo==='A'){
        if(emManifestacao) dados = Math.min(dados, 4);
        return Math.ceil(dados/2);
      }else{
        const g = Math.max(1, parseInt(tecnica?.grau||4,10));
        dados = Math.min(dados, Math.min(4,g));
        return 2 * dados;
      }
    }
  },
  {
    id:'reducao_final',
    nome:'Redução Final (meio/zero)',
    grupo:'suporte',
    desc:'Reduz o dano final de um único ataque/técnica pela metade (7 PA) ou totalmente (14 PA; exige subcat Defensivo).',
    paramsSpec:[{ key:'modo', label:'Metade (7) ou Zero (14)', type:'select', default:'metade', options:['metade','zero'] }],
    calcPA:({params})=> (params?.modo==='zero'?14:7)
  },
  {
    id:'localizador',
    nome:'Localizador (rastrear)',
    grupo:'suporte',
    desc:'Acha objeto/criatura. 8 PA (criaturas), 12 PA (objetos marcados). Custo dobra se nunca encontrou; vira Especialização.',
    paramsSpec:[
      { key:'alvo', label:'Criatura ou Objeto', type:'select', default:'criatura', options:['criatura','objeto'] },
      { key:'conhecido', label:'Já encontrou/tem marca?', type:'bool', default:true }
    ],
    calcPA:({params})=>{
      let pa = (params?.alvo==='objeto') ? 12 : 8;
      if(params?.conhecido===false) pa *= 2;
      return pa;
    }
  },
  {
    id:'efeito_multiplo',
    nome:'Efeito Múltiplo (opções alternadas)',
    grupo:'suporte',
    desc:'Mais de uma opção de efeito não simultânea. 2 PA (2 opções) +1 PA por opção extra. Ofensivas não podem passar de 5 PA (cada).',
    paramsSpec:[{ key:'opcoes', label:'Qtd. de opções', type:'int', min:2, max:5, default:2 }],
    calcPA:({params})=> 1 + Math.max(1, parseInt(params?.opcoes??2,10))
  },
  { id:'remocao_doencas', nome:'Remoção de Doenças', grupo:'suporte',
    desc:'Remove doenças do corpo (requer MH de cura).',
    calcPA:()=>6
  },
  {
    id:'ignorar_imunidade',
    nome:'Ignorar Imunidade',
    grupo:'suporte',
    desc:'Transforma imunidade em resistência. 1 PA por tipo elemental ou 3 PA para todos que você puder causar.',
    paramsSpec:[{ key:'modo', label:'Por tipo ou Todos', type:'select', default:'tipo', options:['tipo','todos'] },
                { key:'qtd', label:'Qtd. tipos (se por tipo)', type:'int', min:1, max:6, default:1 }],
    calcPA:({params})=> (params?.modo==='todos'?3:Math.max(1, parseInt(params?.qtd??1,10)) )
  },
  {
    id:'movimento_rapido',
    nome:'Movimento Rápido',
    grupo:'suporte',
    desc:'Ignora ataques de oportunidade: 1 PA (AO) ou 2 PA (AO Superior).',
    paramsSpec:[{ key:'nivel', label:'AO ou AO Superior', type:'select', default:'AO', options:['AO','AO_superior'] }],
    calcPA:({params})=> (params?.nivel==='AO_superior'?2:1)
  },
  {
    id:'reducao_movimento',
    nome:'Redução de Movimento',
    grupo:'suporte',
    desc:'Reduz deslocamento: metade (1 PA) ou 0 (2 PA).',
    paramsSpec:[{ key:'nivel', label:'Metade ou Zero', type:'select', default:'metade', options:['metade','zero'] }],
    calcPA:({params})=> (params?.nivel==='zero'?2:1)
  },
  {
    id:'movimento_em_grupo',
    nome:'Movimento em Grupo',
    grupo:'suporte',
    desc:'Leva criaturas voluntárias com você numa técnica de movimento. 1 PA por criatura.',
    paramsSpec:[{ key:'qtd', label:'Qtd. de criaturas', type:'int', min:1, max:10, default:1 }],
    calcPA:({params})=> Math.max(1, parseInt(params?.qtd??1,10))
  },
  {
    id:'reducao_de_custo',
    nome:'Redução de Custo (técnicas)',
    grupo:'suporte',
    desc:'Reduz custo de técnicas em até X PA (X = grau). Exigência: a técnica que dá o desconto não pode custar < 3*X para ativar (exceto MH e inatas).',
    paramsSpec:[{ key:'x', label:'PA máximo a reduzir', type:'int', min:1, max:7, default:1 }],
    calcPA:({params})=> Math.max(1, parseInt(params?.x??1,10)) * 3
  },
  {
    id:'percepcao_especial',
    nome:'Percepção Especial',
    grupo:'suporte',
    desc:'Visões/Sentidos: 1 PA visão noturna/calor (18 m); 4 PA sentido cego (18 m); 5 PA visão verdadeira (18 m); 7 PA sentido verdadeiro (18 m). +1 PA a cada +6 m. Metade do custo (arred. p/ cima) se exigir En.',
    paramsSpec:[
      { key:'tipo', label:'Tipo', type:'select', default:'visao', options:['visao','sentido_cego','visao_verdadeira','sentido_verdadeiro'] },
      { key:'alcance', label:'Alcance (m)', type:'int', min:18, step:6, default:18, max:60 },
      { key:'requer_en', label:'Requer En?', type:'bool', default:false },
    ],
    calcPA:({params})=>{
      const tipo = params?.tipo || 'visao';
      const base = (tipo==='sentido_cego')?4 : (tipo==='visao_verdadeira')?5 : (tipo==='sentido_verdadeiro')?7 : 1;
      const extra = Math.max(0, Math.ceil(((parseInt(params?.alcance??18,10))-18)/6));
      let pa = base + extra;
      if(params?.requer_en) pa = Math.ceil(pa/2);
      return pa;
    }
  },
  {
    id:'movimento_imparavel',
    nome:'Movimento Imparável',
    grupo:'suporte',
    desc:'Imune a redução de deslocamento: 2 PA (condições ≤ 3 PA) ou 4 PA (qualquer exceto Petrificado/Congelado).',
    paramsSpec:[{ key:'nivel', label:'Até 3 PA ou Geral', type:'select', default:'ate3', options:['ate3','geral'] }],
    calcPA:({params})=> (params?.nivel==='geral'?4:2)
  },

  // =========================
  // EFEITOS DE CATEGORIA
  // =========================

  // APRIMORADOR
  { id:'cura_completa', nome:'Cura Completa', grupo:'aprimoramento',
    desc:'Recupera PV totalmente; nos usos seguintes na mesma criatura reduz para 50%, depois metade sucessiva. Requer MH de cura; Categoria: 100% Aprimoramento ou Especialista.',
    calcPA:()=>26
  },
  { id:'cura_parcial', nome:'Cura Parcial', grupo:'aprimoramento',
    desc:'Cura 50% dos PV atuais; usos seguintes: 25% (e vai reduzindo). Requer MH de cura; Categoria: 80% Aprimoramento ou Especialista.',
    calcPA:()=>13
  },
  { id:'imunidade_ferimentos', nome:'Imunidade a Ferimentos', grupo:'aprimoramento',
    desc:'Imune a feridas brutais/persistentes. Primeira MH precisa ser de cura. Categoria: ≥80% Aprimoramento ou Especialista.',
    paramsSpec:[{ key:'modo', label:'Técnica (3 PA) ou Manifestação (1 PA)', type:'select', default:'tecnica', options:['tecnica','manifestacao'] }],
    calcPA:({params})=> (params?.modo==='manifestacao'?1:3)
  },
  { id:'regenerar_membros', nome:'Regenerar Membros', grupo:'aprimoramento',
    desc:'Regenera membros/órgãos. Em manifestação de cura: 1 PA; em técnica: 5 PA.',
    paramsSpec:[{ key:'modo', label:'Manifestação (1) ou Técnica (5)', type:'select', default:'manifestacao', options:['manifestacao','tecnica'] }],
    calcPA:({params})=> (params?.modo==='manifestacao'?1:5)
  },
  {
    id:'regeneracao_constante',
    nome:'Regeneração Constante',
    grupo:'aprimoramento',
    desc:'Regenera constantemente até limite. Só MH de cura. 6 PA para dobrar nível por cura até cap 16x nível; Aprimoradores podem aumentar limite pagando +2 PA por +2x nível.',
    paramsSpec:[
      { key:'bonus_limite', label:'Aumentar limite (em múltiplos de 2x nível)?', type:'int', min:0, max:8, step:2, default:0 }
    ],
    calcPA:({params})=> 6 + Math.ceil((parseInt(params?.bonus_limite??0,10))/2)*2
  },
  { id:'maximizar_cura', nome:'Maximizar Cura', grupo:'aprimoramento',
    desc:'Maximiza dados de cura. 5 PA (próxima cura) ou 10 PA (com Duração Estendida).',
    paramsSpec:[{ key:'estendida', label:'Duração Estendida?', type:'bool', default:false }],
    calcPA:({params})=> (params?.estendida?10:5)
  },
  { id:'remocao_condicao', nome:'Remoção de Condição', grupo:'aprimoramento',
    desc:'Remove condições. 8 PA (todas) ou 4 PA (apenas por falha em Constituição).',
    paramsSpec:[{ key:'escopo', label:'Todas ou por Constituição', type:'select', default:'todas', options:['todas','constituição'] }],
    calcPA:({params})=> (params?.escopo==='constituição'?4:8)
  },
  {
    id:'defesa_absoluta',
    nome:'Defesa Absoluta (CR=30)',
    grupo:'aprimoramento',
    desc:'CR torna-se 30. Exige técnica 5º grau+ ou auxiliar equivalente. Categoria: ≥60% Aprimoramento ou Especialista.',
    paramsSpec:[{ key:'afin', label:'Afinidade 80% ( +4 PA ) / 60% ( +8 PA ) / 100% ( +0 )', type:'select', default:'100', options:['100','80','60'] }],
    calcPA:({params})=>{
      const base = 10;
      return base + (params?.afin==='80'?4 : params?.afin==='60'?8 : 0);
    }
  },
  { id:'aumento_atributo_perm', nome:'Aumento de Atributo Permanente (+1)', grupo:'aprimoramento',
    desc:'+1 permanente (exceto Espírito). Requer MH. Categoria: ≥80% Aprimoramento ou Especialista.',
    paramsSpec:[{ key:'pontos', label:'Pontos (+1 cada)', type:'int', min:1, max:5, default:1 }],
    calcPA:({params})=> Math.max(1, parseInt(params?.pontos??1,10)) * 2
  },
  { id:'aumento_limite', nome:'Aumento de Limite (cap 30)', grupo:'aprimoramento',
    desc:'Permite treinar um atributo até 30 (ativo apenas com a habilidade ligada). Não inclui Espírito.',
    calcPA:()=>3
  },
  { id:'atributo_fixo_30', nome:'Atributo Fixo (30)', grupo:'aprimoramento',
    desc:'Define atributo escolhido como 30 (exceto Espírito). Categoria: Aprimorador.',
    calcPA:()=>20
  },

  // EMISSÃO
  {
    id:'teletransporte_total',
    nome:'Teletransporte Total',
    grupo:'emissao',
    desc:'Marca local/dimensão para teletransportar ignorando distância (usar portal/porta etc.). 8 PA (≤500 km), 12 (≤1000 km), 16 (mesmo continente), 25 (mundo conhecido).',
    paramsSpec:[{ key:'alcance', label:'500km/1000km/continente/mundo', type:'select', default:'500km', options:['500km','1000km','continente','mundo'] }],
    calcPA:({params})=> ({'500km':8,'1000km':12,'continente':16,'mundo':25}[params?.alcance||'500km'])
  },
  {
    id:'teletransporte_parcial',
    nome:'Teletransporte Parcial',
    grupo:'emissao',
    desc:'Teletransporta parte do corpo por passagem/portal. 1 PA (6 m) +1 PA por +3 m; ou 3 PA para local marcado (qualquer distância).',
    paramsSpec:[
      { key:'modo', label:'Distância curta ou Local marcado', type:'select', default:'curta', options:['curta','marcado'] },
      { key:'metros', label:'Metros (se curta)', type:'int', min:6, step:3, default:6, max:60 },
    ],
    calcPA:({params})=>{
      if(params?.modo==='marcado') return 3;
      const m = Math.max(6, parseInt(params?.metros??6,10));
      return 1 + Math.ceil((m-6)/3);
    }
  },
  {
    id:'teletransporte_limitado',
    nome:'Teletransporte Limitado',
    grupo:'emissao',
    desc:'Teleporta até 60 m (não gera AO). 2 PA por 6 m +1 PA por +3 m; ou 5 PA para usar o alcance da técnica.',
    paramsSpec:[
      { key:'modo', label:'Por metros ou pelo alcance da técnica', type:'select', default:'metros', options:['metros','alcance_tecnica'] },
      { key:'metros', label:'Metros (se escolhido)', type:'int', min:6, step:3, default:6, max:60 },
    ],
    calcPA:({params})=>{
      if(params?.modo==='alcance_tecnica') return 5;
      const m = Math.max(6, parseInt(params?.metros??6,10));
      return 2 + Math.ceil((m-6)/3);
    }
  },
  {
    id:'aumentar_alcance_emissao',
    nome:'Aumentar Alcance (à distância)',
    grupo:'emissao',
    desc:'+3 m por +1 PA em ataques de Linha que exigem jogada de ataque. Categoria: ≥40% Emissão/Especialista.',
    paramsSpec:[{ key:'metros', label:'Metros adicionais', type:'int', min:3, step:3, default:3, max:90 }],
    calcPA:({params})=> Math.ceil((parseInt(params?.metros??3,10))/3)
  },
  {
    id:'alcance_estendido',
    nome:'Alcance Estendido',
    grupo:'emissao',
    desc:'Alcance = nível x 1,5 m (mín 3m) e Linha/Cone usam alcance da MH. 2 PA por 1,5m por nível.',
    calcPA:()=>2
  },
  {
    id:'alcance_variavel',
    nome:'Alcance Variável',
    grupo:'emissao',
    desc:'Alcance = nível x 3 m (mín 3m) e Linha/Cone usam alcance da MH. 4 PA por 3m por nível.',
    calcPA:()=>4
  },
  {
    id:'aumentar_area',
    nome:'Aumentar Área',
    grupo:'emissao',
    desc:'+3 m na área por +1 PA (cone, esfera, cilindro, linha).',
    paramsSpec:[{ key:'metros', label:'Metros adicionais', type:'int', min:3, step:3, default:3, max:90 }],
    calcPA:({params})=> Math.ceil((parseInt(params?.metros??3,10))/3)
  },
  {
    id:'transferir_ataque',
    nome:'Transferir Ataque',
    grupo:'emissao',
    desc:'Transfere ataque/dano para outra criatura no alcance da MH: 2 PA (usando reação) ou 3 PA (como “inação” 1x/rodada). Técnicas: custo x7.',
    paramsSpec:[{ key:'modo', label:'Reação (2) / Inação (3)', type:'select', default:'reacao', options:['reacao','inacao'] },
                { key:'aplicacao', label:'Manifestação ou Técnica', type:'select', default:'manifestacao', options:['manifestacao','tecnica'] }],
    calcPA:({params})=>{
      const base = (params?.modo==='reacao'?2:3);
      return (params?.aplicacao==='tecnica') ? base*7 : base;
    }
  },
  { id:'marca_transporte', nome:'Marca de Transporte', grupo:'emissao',
    desc:'Marca local/objeto como porta para teletransportes. Custa 3 PA da Aura Máxima (permanente enquanto ativa).',
    calcPA:()=>3
  },

  // TRANSMUTAÇÃO
  { id:'adicionar_propriedade', nome:'Adicionar Propriedade (combinar elementos)', grupo:'transmutacao',
    desc:'Combina propriedades/elementos na aura (máx 5; 3 para 80% afinidade).',
    calcPA:()=>1
  },
  {
    id:'critico_aprimorado',
    nome:'Crítico Aprimorado',
    grupo:'transmutacao',
    desc:'+3 dados em crítico (técnicas ≤3º) ou +6 dados (≥4º). Ignora afinidade se tiver estilo (Arruaceiro/Assassino/Ninja).',
    paramsSpec:[{ key:'grau', label:'Grau da técnica', type:'int', min:1, max:7, default:3 }],
    calcPA:({params})=> (parseInt(params?.grau??3,10) <= 3 ? 1 : 2)
  },
  { id:'moldar_aura', nome:'Moldar Aura (arma de aura)', grupo:'transmutacao',
    desc:'Cria/reveste arma com aura (1 min). Incrementa 1 passo no dano até máx 1d12.',
    calcPA:()=>1
  },
  { id:'forma_aura', nome:'Forma de Aura (traços animais)', grupo:'transmutacao',
    desc:'Ganha 2 Traços Simples + 1 Específico (Cap. 2 – Espécies).',
    calcPA:()=>4
  },

  // MANIPULAÇÃO
  { id:'lacaio_adicional', nome:'Lacaio Adicional', grupo:'manipulacao',
    desc:'Cria lacaios de suporte extras = modificador da categoria. Requer “Criar Lacaio Suporte”.',
    paramsSpec:[{ key:'aplicacao', label:'Em Manifestação (1) ou Técnica (2)', type:'select', default:'manifestacao', options:['manifestacao','tecnica'] }],
    calcPA:({params})=> (params?.aplicacao==='tecnica'?2:1)
  },
  { id:'lacaio_dormente', nome:'Lacaio Dormente', grupo:'manipulacao',
    desc:'Muda duração de lacaios para “Especial” até agirem; depois vira Duração Prolongada.',
    calcPA:()=>2
  },
  {
    id:'dominar_criatura',
    nome:'Dominar Criatura',
    grupo:'manipulacao',
    desc:'Controla criatura (ND ≤ nível+5). Requer manifestação coercitiva e várias regras (ver descrição). 24 PA (ou metade se só com “Técnica Passível”).',
    paramsSpec:[{ key:'passivel', label:'Funciona apenas sob “Técnica Passível”?', type:'bool', default:false }],
    calcPA:({params})=> (params?.passivel?12:24)
  },
  {
    id:'gerar_criatura',
    nome:'Gerar Criatura (usa suas técnicas)',
    grupo:'manipulacao',
    desc:'Cria criatura que usa aura/técnicas (1 min). Técnicas: 16 PA; MH: 10 PA.',
    paramsSpec:[{ key:'aplicacao', label:'Manifestação (10) ou Técnica (16)', type:'select', default:'manifestacao', options:['manifestacao','tecnica'] }],
    calcPA:({params})=> (params?.aplicacao==='tecnica'?16:10)
  },

  // CONJURAÇÃO
  { id:'alterar_tamanho', nome:'Alterar Tamanho', grupo:'conjuracao',
    desc:'Altera tamanho de ser vivo/constructo/objeto. 1 PA Grande; 2 PA Enorme; 4 PA Imenso.',
    paramsSpec:[{ key:'nivel', label:'Grande/Enorme/Imenso', type:'select', default:'grande', options:['grande','enorme','imenso'] }],
    calcPA:({params})=> ({grande:1,enorme:2,imenso:4}[params?.nivel||'grande'])
  },
  {
    id:'criar_objeto',
    nome:'Criar Objeto',
    grupo:'conjuracao',
    desc:'Cria itens comuns sem aura. 1 PA armas; 2 PA armas de fogo comuns; 4 PA armas de fogo avançadas; 1 PA objetos/estruturas pequenas; 2 PA grandes; 4 PA enormes; 8 PA imensas.',
    paramsSpec:[
      { key:'tipo', label:'Arma/AF comum/AF avançada/Objeto Pequeno/Grande/Enorme/Imenso', type:'select', default:'arma', options:['arma','arma_fogo_comum','arma_fogo_avancada','obj_pequeno','obj_grande','obj_enorme','obj_imenso'] }
    ],
    calcPA:({params})=>{
      const map = { arma:1, arma_fogo_comum:2, arma_fogo_avancada:4, obj_pequeno:1, obj_grande:2, obj_enorme:4, obj_imenso:8 };
      return map[params?.tipo||'arma'] || 1;
    }
  },
  { id:'multiplos_caminhos', nome:'Múltiplos Caminhos', grupo:'conjuracao',
    desc:'Cria várias formas para o Hatsu (máx 5). Considera todas as categorias como 80% para criação (penalidade final normal). Máx 2 focadas em combate sem uso simultâneo. MH composto: máx 3 efeitos simultâneos.',
    calcPA:()=>4
  },
  {
    id:'criacao_indestrutivel',
    nome:'Criação Indestrutível',
    grupo:'conjuracao',
    desc:'Objeto conjurado torna-se indestrutível. Requer 3+ restrições, não pode prevenir dano em criaturas, nem conter Supressão de Aura.',
    paramsSpec:[{ key:'alvo', label:'Armas/Objetos/Enormes/Dimensões', type:'select', default:'arma', options:['arma','obj_pequeno','obj_enorme','dimensao'] }],
    calcPA:({params})=> ({arma:3,obj_pequeno:5,obj_enorme:8,dimensao:12}[params?.alvo||'arma'])
  },
  {
    id:'consertar_objeto',
    nome:'Consertar Objeto',
    grupo:'conjuracao',
    desc:'Repara objeto/estrutura (ou retorna ao estado anterior). Paga custo máximo da categoria de tamanho desejada.',
    paramsSpec:[{ key:'tamanho', label:'Miúdo→Imenso', type:'select', default:'miudo', options:['miudo','pequeno','medio','grande','enorme','imenso'] }],
    calcPA:({params})=>{
      // Mapea por analogia de "Criar Objeto"
      const map = { miudo:1, pequeno:1, medio:2, grande:2, enorme:4, imenso:8 };
      return map[params?.tamanho||'miudo'];
    }
  },
  {
    id:'clone_perfeito',
    nome:'Clone Perfeito',
    grupo:'conjuracao',
    desc:'Cria clone com quase todas as suas características (limites de ações/PA, PV=1/2, sem resistências, etc.). Técnicas: 20 PA; MH: 10 PA.',
    paramsSpec:[{ key:'aplicacao', label:'Manifestação (10) ou Técnica (20)', type:'select', default:'tecnica', options:['manifestacao','tecnica'] }],
    calcPA:({params})=> (params?.aplicacao==='manifestacao'?10:20)
  },
  {
    id:'dimensao_completa',
    nome:'Dimensão Completa',
    grupo:'conjuracao',
    desc:'Cria dimensão com regras (pode teletransportar criaturas num raio de 9 m). Cap 300 m lado; 3 efeitos de 1 PA padrão; PV 400, CR 12. Técnicas 18 PA; MH 10 PA.',
    paramsSpec:[{ key:'aplicacao', label:'Manifestação (10) ou Técnica (18)', type:'select', default:'manifestacao', options:['manifestacao','tecnica'] }],
    calcPA:({params})=> (params?.aplicacao==='tecnica'?18:10)
  },
  { id:'dimensao_simples', nome:'Dimensão Simples', grupo:'conjuracao',
    desc:'Dimensão sem regras complexas; qualquer um entra/sai pela entrada ativa. Não prende criaturas.',
    calcPA:()=>4
  },

  // ESPECIALIZAÇÃO
  {
    id:'roubo_permanente',
    nome:'Roubo Permanente',
    grupo:'especializacao',
    desc:'Rouba permanentemente o Hatsu de outra criatura (regras rígidas: subcategoria Roubo, 4+ restrições, etc.).',
    calcPA:()=>25
  },
  {
    id:'roubo_temporario',
    nome:'Roubo Temporário',
    grupo:'especializacao',
    desc:'Rouba temporariamente o Hatsu (1 por vez). Volta ao dono após uso; se dono morreu, desaparece.',
    calcPA:()=>16
  },
  {
    id:'emprestimo_hatsu',
    nome:'Empréstimo de Hatsu',
    grupo:'especializacao',
    desc:'Pega o Hatsu de uma criatura voluntária por até 1 hora (Ação de Poder para ativar; exige 2 restrições).',
    calcPA:()=>12
  },
];
