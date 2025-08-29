// data/redutores.js
// Catálogo de Redutores (reduções de PA). Cada item pode ter:
// id, nome, aplica:['tecnica'|'manifestacao'], desc, paramsSpec[], requisitos(ctx)->string|null, calcPA({tecnica, params, emManifestacao, context})->number
// Observação: o retorno de calcPA deve ser **negativo** (redução de PA).

import { CONDICOES } from './condicoes.js';

function hasEffect(t, idOrName) {
  if (!t || !Array.isArray(t.efeitos)) return false;
  return t.efeitos.some(e =>
    e?.id === idOrName ||
    (e?.nome && e.nome.toLowerCase().includes(String(idOrName).toLowerCase()))
  );
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

export const REDUTORES = [

  // ——— Controle / Geral ————————————————————————————————————————————————————
  {
    id: 'concentracao_crucial',
    nome: 'Concentração Crucial',
    aplica: ['tecnica','manifestacao'],
    desc: 'Passa a exigir Concentração; técnica consome 2 PA/rodada (exceto em Manifestação).',
    requisitos: ({ tecnica, emManifestacao }) => {
      if (emManifestacao) return null; // em MH pode
      // Em técnica: precisa ter "Duração Prolongada"
      if (!hasEffect(tecnica, 'duracao_prolongada') && !hasEffect(tecnica, 'duração prolongada')) {
        return 'Requer a característica “Duração Prolongada” na técnica.';
      }
      return null;
    },
    calcPA: ({ emManifestacao }) => emManifestacao ? -2 : -6,
    paramsSpec: []
  },

  {
    id: 'efeito_colateral',
    nome: 'Efeito Colateral (auto dano/condição em você)',
    aplica: ['tecnica','manifestacao'],
    desc: 'Ao executar, você sofre dano/condição igual ao efeito (falha auto em testes, se houver).',
    paramsSpec: [
      { key: 'tipo', label: 'Tipo', type: 'select', options: ['dano','condicao'], default: 'dano' },
      { key: 'd8', label: 'Qtd. de d8 de dano (se tipo=dano)', type: 'int', min: 1, default: 1 },
      { key: 'cond', label: 'Condição (id ex.: “atordoado”) (se tipo=condicao)', type: 'select',
        options: Object.keys(CONDICOES), default: 'caido' }
    ],
    calcPA: ({ params }) => {
      if (params?.tipo === 'dano') {
        const nd8 = Math.max(1, parseInt(params.d8||1,10));
        return -nd8; // -1 PA por d8
      }
      const c = CONDICOES[params?.cond];
      const pa = c?.pa ?? 0;
      return pa ? -pa : 0;
    }
  },

  {
    id: 'reduzir_area',
    nome: 'Reduzir Área',
    aplica: ['tecnica'],
    desc: 'Reduz alcance/raio/linha etc. da técnica.',
    requisitos: ({ tecnica }) => {
      // Livro: “Técnicas Aprimoradas que afetem área”. Aqui validamos “comum”.
      if (tecnica?.tipo !== 'comum') return 'Somente para Técnicas Comuns (aprimoradas) que afetem área.';
      return null;
    },
    paramsSpec: [
      { key: 'metros', label: 'Metros reduzidos (múltiplos de 3)', type: 'int', min: 3, default: 3 }
    ],
    calcPA: ({ params }) => {
      const m = Math.max(0, parseInt(params?.metros||0,10));
      return -Math.floor(m/3); // -1 PA por 3m
    }
  },

  {
    id: 'requisito_limitador',
    nome: 'Requisito Limitador',
    aplica: ['tecnica','manifestacao'],
    desc: 'Exige um requisito extra substancial para executar.',
    paramsSpec: [
      { key: 'valor', label: 'Redução de PA (1 a 5) conforme avaliação do mestre', type: 'int', min: 1, max: 5, default: 1 }
    ],
    calcPA: ({ params }) => -clamp(parseInt(params?.valor||1,10), 1, 5)
  },

  // ——— Técnicas ————————————————————————————————————————————————
  {
    id: 'tecnica_demorada',
    nome: 'Técnica Demorada (Ação de Poder)',
    aplica: ['tecnica'],
    requisitos: ({ tecnica }) => (tecnica?.tipo==='aux' ? null : 'Apenas para Técnicas Auxiliares.'),
    calcPA: () => -3
  },

  {
    id: 'tecnica_dependente',
    nome: 'Técnica Dependente (precisa de outra ativa)',
    aplica: ['tecnica'],
    paramsSpec: [
      { key: 'custoReq', label: 'Custo (PA) da técnica requisito', type: 'int', min: 1, default: 2 }
    ],
    calcPA: ({ params }) => {
      const c = Math.max(1, parseInt(params?.custoReq||1,10));
      const metade = Math.floor(c/2);
      return -clamp(metade, 1, 3);
    }
  },

  {
    id: 'tecnica_indomavel',
    nome: 'Técnica Indomável (sem metade no acerto)',
    aplica: ['tecnica'],
    desc: 'Dano vira d8 e quem passar na salvaguarda não recebe dano.',
    calcPA: ({ tecnica }) => {
      const g = Math.max(1, parseInt(tecnica?.grau||1,10));
      return -g; // igual ao grau
    }
  },

  {
    id: 'tecnica_exaustiva',
    nome: 'Técnica Exaustiva (N níveis)',
    aplica: ['tecnica'],
    paramsSpec: [
      { key: 'niveis', label: 'Níveis de Exaustão ao fim', type: 'int', min: 1, max: 6, default: 1 }
    ],
    calcPA: ({ params }) => {
      const n = Math.max(1, parseInt(params?.niveis||1,10));
      return -4*n;
    }
  },

  {
    id: 'exaustao_insistente',
    nome: 'Exaustão Insistente',
    aplica: ['tecnica'],
    requisitos: ({ tecnica, params }) => {
      const ok = Array.isArray(tecnica?.redutores) && tecnica.redutores.some(r=>r.id==='tecnica_exaustiva');
      if (!ok) return 'Requer o redutor “Técnica Exaustiva”.';
      return null;
    },
    paramsSpec: [
      { key: 'niveis', label: 'Níveis de Exaustão (igual ao da Exaustiva se quiser auto)', type: 'int', min: 1, max: 6, default: 1 }
    ],
    calcPA: ({ tecnica, params }) => {
      // tenta herdar a quantidade da exaustiva
      let n = parseInt(params?.niveis||0,10);
      if (!n && Array.isArray(tecnica?.redutores)) {
        const ex = tecnica.redutores.find(r=>r.id==='tecnica_exaustiva');
        if (ex?.params?.niveis) n = parseInt(ex.params.niveis,10);
      }
      n = Math.max(1, n||1);
      return -1*n;
    }
  },

  {
    id: 'letargia_constante',
    nome: 'Letargia Constante (16h por nível)',
    aplica: ['tecnica'],
    requisitos: ({ tecnica }) => {
      const hasEx = Array.isArray(tecnica?.redutores) && tecnica.redutores.some(r=>r.id==='tecnica_exaustiva');
      const hasIns = Array.isArray(tecnica?.redutores) && tecnica.redutores.some(r=>r.id==='exaustao_insistente');
      if (!hasEx || !hasIns) return 'Requer “Técnica Exaustiva” e “Exaustão Insistente”.';
      return null;
    },
    paramsSpec: [
      { key: 'niveis', label: 'Níveis de Exaustão (igual ao da Exaustiva se quiser auto)', type: 'int', min: 1, max: 6, default: 1 }
    ],
    calcPA: ({ tecnica, params }) => {
      let n = parseInt(params?.niveis||0,10);
      if (!n && Array.isArray(tecnica?.redutores)) {
        const ex = tecnica.redutores.find(r=>r.id==='tecnica_exaustiva');
        if (ex?.params?.niveis) n = parseInt(ex.params.niveis,10);
      }
      n = Math.max(1, n||1);
      return -2*n;
    }
  },

  {
    id: 'uso_unico',
    nome: 'Uso Único (descanso longo p/ recarregar)',
    aplica: ['tecnica'],
    paramsSpec: [
      { key: 'instantanea', label: 'Duração instantânea? (s/n)', type: 'bool', default: true }
    ],
    calcPA: ({ params }) => (params?.instantanea ? -3 : -1)
  },

  {
    id: 'tecnica_nao_ofensiva',
    nome: 'Técnica Não Ofensiva',
    aplica: ['tecnica'],
    desc: 'Não pode causar dano direto/indireto nem facilitar dano (acerto, vantagem etc.).',
    calcPA: ({ tecnica }) => (tecnica?.tipo === 'aux' ? -1 : -2)
  },

];
