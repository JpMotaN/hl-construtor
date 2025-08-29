// data/restricoes.js
// Catálogo de Restrições (reduzem PA; em Manifestação, também somam PV).
// Cada item: { id, nome, aplica:['tecnica'|'manifestacao'], stars, desc,
//              paramsSpec[], requisitos(ctx)->string|null, calcPA({tecnica, params, emManifestacao})->number }

function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }
function hasEffect(t, idOrText){
  if (!t || !Array.isArray(t.efeitos)) return false;
  const needle = String(idOrText).toLowerCase();
  return t.efeitos.some(e => (e?.id && String(e.id).toLowerCase()===needle) ||
                             (e?.nome && e.nome.toLowerCase().includes(needle)));
}

export const RESTRICOES = [
  // ——— Gerais ————————————————————————————————————————————————————————————
  {
    id: 'ativacao_punitiva',
    nome: 'Ativação Punitiva',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    desc: 'Ganha poder/custo baseado no dano sofrido até a ativação.',
    paramsSpec: [{ key:'dano', label:'Dano sofrido até a ativação', type:'int', min:0, default:0 }],
    calcPA: ({ params }) => -Math.floor(Math.max(0, parseInt(params?.dano||0,10)) / 7),
  },
  {
    id: 'custo_constante',
    nome: 'Custo Constante (drena PA por turno)',
    aplica: ['tecnica','manifestacao'],
    stars: 3,
    desc: 'Consome 4 PA na ativação e a cada turno.',
    calcPA: () => -8,
  },
  {
    id: 'movimento_necessario',
    nome: 'Movimento Necessário',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    desc: 'Exige gesto/ritual consumindo ação bônus/ação de poder e/ou ataques.',
    paramsSpec: [
      { key:'acao', label:'Tipo (bonus/poder/nenhuma)', type:'select', options:['bonus','poder','nenhuma'], default:'bonus' },
      { key:'ataques', label:'Ataques consumidos (se for habilidade de ataque)', type:'int', min:0, default:0 }
    ],
    calcPA: ({ params }) => {
      const a = (params?.acao==='poder') ? -3 : (params?.acao==='bonus' ? -1 : 0);
      const at = -Math.max(0, parseInt(params?.ataques||0,10));
      return a + at;
    }
  },
  {
    id: 'componente_necessario',
    nome: 'Componente Necessário (consumível)',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    desc: 'Exige item consumido; redução varia com o valor total.',
    paramsSpec: [
      { key:'tier', label:'Valor do(s) componente(s)', type:'select',
        options:['700','1500','3000'], default:'700' }
    ],
    calcPA: ({ params }) => {
      const t = String(params?.tier||'700');
      if (t==='3000') return -3;
      if (t==='1500') return -2;
      return -1;
    }
  },
  {
    id: 'explicar_habilidade',
    nome: 'Explicar Habilidade (divulgar funcionamento)',
    aplica: ['tecnica','manifestacao'],
    stars: 2,
    desc: 'Explica totalmente a técnica (efeitos, dano, como evitar/desativar).',
    requisitos: ({ tecnica }) => {
      // Livre: apenas alerta suave (não causa dano direto/condições)
      if (tecnica && hasEffect(tecnica,'dano')) return 'Não pode causar dano diretamente.';
      if (tecnica && hasEffect(tecnica,'condição')) return 'Não pode impor condição diretamente.';
      return null;
    },
    calcPA: () => -4
  },
  {
    id: 'desativacao',
    nome: 'Desativação (palavra/ação/marca)',
    aplica: ['tecnica','manifestacao'],
    stars: 2,
    desc: 'Existe uma forma externa de desligar a habilidade (ou marca com fraqueza).',
    requisitos: ({ tecnica, emManifestacao }) => {
      const hasExplain = (typeof tecnica==='object') ? (tecnica.restricoes||[]).some(r=>r.id==='explicar_habilidade') : false;
      if (!emManifestacao && !hasExplain) return 'Requer “Explicar Habilidade”.';
      if (!emManifestacao && (!hasEffect(tecnica,'duração prolongada') && !hasEffect(tecnica,'duracao_prolongada')))
        return 'Técnica básica/aprimorada/auxiliar precisa “Duração Prolongada”.';
      return null;
    },
    calcPA: () => -4
  },
  {
    id: 'grupo_especifico',
    nome: 'Grupo Específico (até 20 alvos)',
    aplica: ['tecnica','manifestacao'],
    stars: 3,
    desc: 'Funciona apenas para um grupo definido; fora do grupo → consequências severas.',
    requisitos: ({ tecnica, emManifestacao }) => {
      if (!emManifestacao && tecnica?.tipo!=='aux') return 'Precisa ser Auxiliar (ou Manifestação).';
      return null;
    },
    calcPA: () => -8
  },
  {
    id: 'pessoa_especifica',
    nome: 'Pessoa Específica',
    aplica: ['tecnica','manifestacao'],
    stars: 2,
    desc: 'Só beneficia 1 pessoa ou um tipo específico (não pode ser você).',
    requisitos: ({ tecnica, emManifestacao }) => {
      if (!emManifestacao && tecnica?.tipo!=='aux') return 'Use em Manifestação ou Técnica Auxiliar.';
      return null;
    },
    calcPA: () => -3
  },
  {
    id: 'corte_vitalidade',
    nome: 'Corte de Vitalidade (Constituição)',
    aplica: ['manifestacao'],
    stars: 3,
    desc: 'Gasta pontos de CON a cada ativação (perda permanente do atual ou do atual+máximo).',
    paramsSpec: [
      { key:'modo', label:'Retirada', type:'select', options:['atual','atual+maximo'], default:'atual' }
    ],
    calcPA: ({ params }) => (params?.modo==='atual+maximo' ? -6 : -3),
  },
  {
    id: 'habilidade_inorganica',
    nome: 'Habilidade Inorgânica',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    desc: 'Não afeta seres vivos nem algo feito de aura.',
    calcPA: () => -2
  },
  {
    id: 'item_especifico',
    nome: 'Item Específico (único e necessário)',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    desc: 'Necessita um item único gravado com runas de Nen.',
    paramsSpec: [
      { key:'raridade', label:'Raridade', type:'select',
        options:['Comum','Incomum','Raro','Muito Raro','Perfeito'], default:'Comum' }
    ],
    calcPA: ({ params }) => {
      const r = String(params?.raridade||'Comum');
      if (r==='Perfeito') return -6;
      if (r==='Muito Raro') return -4;
      if (r==='Raro') return -3;
      if (r==='Incomum') return -2;
      return -1;
    }
  },
  {
    id: 'memoria_cheia',
    nome: 'Memória Cheia (máx. 8 técnicas no Hatsu)',
    aplica: ['manifestacao','tecnica'],
    stars: 3,
    desc: 'Impede aprender formas/alternativas/treinos extra; limite global de 8 técnicas.',
    calcPA: () => -8
  },
  {
    id: 'palavra_chave',
    nome: 'Palavra-chave (ativação/desativação)',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    desc: 'Ativa/desativa ao tocar algo e falar uma palavra em voz alta.',
    calcPA: () => -1
  },
  {
    id: 'presenciar',
    nome: 'Presenciar (ver a técnica alvo antes)',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    desc: 'Só pode ativar após ver pessoalmente a técnica do alvo em ação.',
    calcPA: () => -2
  },
  {
    id: 'resposta',
    nome: 'Resposta (informação exigida do alvo)',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    paramsSpec: [
      { key:'tipo', label:'Tipo da resposta', type:'select',
        options:['simples','especifica','rara'], default:'simples' }
    ],
    desc: 'Ativa apenas se o alvo responder o que você quer.',
    calcPA: ({ params }) => {
      const t = String(params?.tipo||'simples');
      if (t==='rara') return -4;
      if (t==='especifica') return -2;
      return -1;
    }
  },
  {
    id: 'recarga',
    nome: 'Recarga (carregar antes de usar)',
    aplica: ['tecnica','manifestacao'],
    stars: 2,
    desc: '10 min de carga → até 2 min/20 usos; senão, paga PA por turno/uso.',
    calcPA: () => -4
  },
  {
    id: 'tecnica_aleatoria',
    nome: 'Técnica Aleatória (opção sem escolha)',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    paramsSpec: [
      { key:'opcoes', label:'Quantidade de opções', type:'select', options:['2','4','8'], default:'2' }
    ],
    desc: 'Aciona uma entre N opções aleatoriamente; não troca até o fim do encontro.',
    calcPA: ({ params }) => {
      const n = String(params?.opcoes||'2');
      if (n==='8') return -4;
      if (n==='4') return -2;
      return -1;
    }
  },
  {
    id: 'tecnica_devoradora',
    nome: 'Técnica Devoradora (fica sem Nen depois)',
    aplica: ['tecnica','manifestacao'],
    stars: 2,
    paramsSpec: [
      { key:'tempo', label:'Sem Nen por', type:'select', options:['1h','8h','1 semana'], default:'1h' }
    ],
    desc: 'Fica sem poder usar Nen por um tempo após terminar.',
    calcPA: ({ params }) => {
      const t = String(params?.tempo||'1h');
      if (t==='1 semana') return -10;
      if (t==='8h') return -6;
      return -4;
    }
  },
  {
    id: 'ambiente_requerido',
    nome: 'Ambiente Requerido (clima/elemento)',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    paramsSpec: [
      { key:'tipo', label:'Tipo', type:'select',
        options:['clima_extremo','clima_pesado','elemento_abundante'], default:'clima_pesado' }
    ],
    desc: 'Só funciona em clima ou ambiente específicos (chuva forte, glacial, muita água etc.).',
    calcPA: ({ params }) => {
      const t = String(params?.tipo||'clima_pesado');
      if (t==='clima_extremo') return -5;
      if (t==='elemento_abundante') return -2;
      return -3; // clima pesado
    }
  },
  {
    id: 'tempo_conjuracao',
    nome: 'Tempo de Conjuração (canalizar)',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    paramsSpec: [
      { key:'duracao', label:'Tempo', type:'select',
        options:['1 minuto','1 hora','8 horas'], default:'1 minuto' }
    ],
    desc: 'Requer canalização longa antes de executar.',
    calcPA: ({ params }) => {
      const d = String(params?.duracao||'1 minuto');
      if (d==='8 horas') return -6;
      if (d==='1 hora') return -4;
      return -2;
    }
  },
  {
    id: 'sacrificio_carne',
    nome: 'Sacrifício da Carne (mutilação)',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    paramsSpec: [
      { key:'parte', label:'Parte sacrificada',
        type:'select',
        options:[
          'olfato','5 dedos','audicao','mao','braco','perna','visao','duas pernas'
        ],
        default: 'olfato'
      }
    ],
    desc: 'Sacrificar parte(s) do corpo para criar/ativar a habilidade.',
    calcPA: ({ params }) => {
      const p = String(params?.parte||'olfato').toLowerCase();
      if (p==='duas pernas') return -6;
      if (p==='visao') return -5;
      if (p==='braco' || p==='perna') return -4;
      if (p==='mao') return -3;
      if (p==='5 dedos' || p==='audicao') return -2;
      // olfato
      return -1;
    }
  },
  {
    id: 'sacrificar_aura',
    nome: 'Sacrificar Aura (reduz Aura Máxima)',
    aplica: ['tecnica','manifestacao'],
    stars: 3,
    paramsSpec: [
      { key:'fracao', label:'Fração sacrificada', type:'select', options:['1/4','1/2'], default:'1/4' }
    ],
    desc: 'Reduz temporariamente o valor máximo de aura.',
    calcPA: ({ params }) => (String(params?.fracao||'1/4')==='1/2' ? -14 : -6)
  },
  {
    id: 'requisito_limitador_rst',
    nome: 'Requisito Limitador (restrição)',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    desc: 'Exige um requisito forte (noite, submerso, etc.).',
    paramsSpec: [{ key:'valor', label:'Redução (1 a 6) conforme o mestre', type:'int', min:1, max:6, default:1 }],
    calcPA: ({ params }) => -clamp(parseInt(params?.valor||1,10),1,6)
  },
  {
    id: 'tecnica_passivel',
    nome: 'Técnica Passível (alvo 0 PV, Incap./Inconsciente)',
    aplica: ['tecnica','manifestacao'],
    stars: 1,
    desc: 'Só ativa tocando criatura a 0 PV e Incapacitada/Inconsciente.',
    calcPA: () => -2
  },
];
