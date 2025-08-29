// js/engine.calcs.js — MÓDULO DA ENGINE (com exportações nomeadas)

import { CATEGORIAS, AFINIDADES_PADRAO, penalidadePorAfinidade } from '../data/categorias.js';
import { SUBCATEGORIAS } from '../data/subcategorias.js';
import { EFEITOS }    from '../data/efeitos.js';
import { REDUTORES }  from '../data/redutores.js';
import { RESTRICOES } from '../data/restricoes.js';
import { CONDICOES }  from '../data/condicoes.js';

// ========================= Constantes =========================

// Limites de PA por grau (base do livro: 2 × grau para técnicas comuns; auxiliares até 10)
export const GRAUS = {
  1: { paMax: 2 },
  2: { paMax: 4 },
  3: { paMax: 6 },
  4: { paMax: 8 },
  5: { paMax: 10 },
  6: { paMax: 12 },
};

// ========================= Afinidades =========================

/** Retorna o mapa de afinidades padrão dado o rótulo da categoria principal */
export function calcAutoAffinities(categoriaRotulo) {
  // aceita tanto rótulo ("Aprimoramento") quanto id ("aprimorador")
  const cat =
    CATEGORIAS.find(c => c.nome === categoriaRotulo || c.id === categoriaRotulo) ||
    CATEGORIAS[0];
  return { ...(AFINIDADES_PADRAO[cat.id] || {}) };
}

// ========================= Utilidades de Catálogo =========================

/** Cria uma instância de efeito com _pa/_pv já avaliados para o contexto */
export function materializeEffect(def, ctx = {}) {
  if (!def) return null;
  const inst = {
    id: def.id,
    nome: def.nome,
    grupo: def.grupo,
    desc: def.desc,
    params: def.params ? JSON.parse(JSON.stringify(def.params)) : undefined,
  };
  try {
    inst._pa = typeof def.calcPA === 'function' ? Number(def.calcPA(ctx)) || 0 : 0;
    inst._pv = typeof def.calcPV === 'function' ? Number(def.calcPV(ctx)) || 0 : 0;
  } catch (e) {
    console.warn('calcPA/calcPV lançou erro para efeito', def?.id, e);
    inst._pa = 0;
    inst._pv = 0;
  }
  return inst;
}

/** Cria uma instância de redutor com _pa/_pv já avaliados para o contexto */
export function materializeReducer(def, ctx = {}) {
  if (!def) return null;
  const inst = {
    id: def.id,
    nome: def.nome,
    grupo: def.grupo,
    desc: def.desc,
    params: def.params ? JSON.parse(JSON.stringify(def.params)) : undefined,
  };
  try {
    const pa = typeof def.calcPA === 'function' ? Number(def.calcPA(ctx)) || 0 : 0;
    const pv = typeof def.calcPV === 'function' ? Number(def.calcPV(ctx)) || 0 : 0;
    // Redutores "diminuem" custo: guardamos _pa negativo e _pv negativo
    inst._pa = pa ? -Math.abs(pa) : 0;
    inst._pv = pv ? -Math.abs(pv) : 0;
  } catch (e) {
    console.warn('calcPA/calcPV lançou erro para redutor', def?.id, e);
    inst._pa = 0;
    inst._pv = 0;
  }
  return inst;
}

/** Cria uma instância de restrição com _pa/_pv avaliados (para MH tipicamente gera _pa; algumas geram _pv). */
export function materializeRestriction(def, ctx = {}) {
  if (!def) return null;
  const inst = {
    id: def.id,
    nome: def.nome,
    stars: def.stars || 0,
    desc: def.desc,
    params: def.params ? JSON.parse(JSON.stringify(def.params)) : undefined,
  };
  try {
    const pa = typeof def.calcPA === 'function' ? Number(def.calcPA(ctx)) || 0 : 0;
    const pv = typeof def.calcPV === 'function' ? Number(def.calcPV(ctx)) || 0 : 0;
    // Restrição para MH geralmente "reduz" PV disponíveis, então tratamos _pv como negativo
    inst._pa = pa ? -Math.abs(pa) : 0;
    inst._pv = pv ? -Math.abs(pv) : 0;
  } catch (e) {
    console.warn('calcPA/calcPV lançou erro para restrição', def?.id, e);
    inst._pa = 0;
    inst._pv = 0;
  }
  return inst;
}

// ========================= Subcategorias / Limites =========================

/** Retorna {comumMax, auxMax, comumExtraTreinavel, auxExtraTreinavel} para a subcategoria da MH */
export function subcatTechniqueLimits(manifest) {
  const s = SUBCATEGORIAS.find(x => x.id === manifest?.subcatId);
  if (!s) return { comumMax: 0, auxMax: 0, comumExtraTreinavel: 0, auxExtraTreinavel: 0 };

  const slots = s.slots || {};
  const extra = s.treinarExtras || {};
  return {
    comumMax: Number(slots.comum?.base ?? slots.comum ?? 0),
    auxMax: Number(slots.auxiliar?.base ?? slots.auxiliar ?? 0),
    comumExtraTreinavel: Number(extra.comum ?? 0),
    auxExtraTreinavel: Number(extra.auxiliar ?? 0),
  };
}

/** Valida contagem de técnicas x limites da subcategoria. Retorna lista de mensagens de erro. */
export function validateTechniqueCounts(state) {
  const lim = subcatTechniqueLimits(state.manifest || {});
  const comuns = (state.techs || []).filter(t => t.tipo === 'comum').length;
  const aux = (state.techs || []).filter(t => t.tipo === 'aux').length;
  const errs = [];
  if (comuns > lim.comumMax) errs.push(`Excesso de técnicas Comuns: ${comuns}/${lim.comumMax}.`);
  if (aux > lim.auxMax) errs.push(`Excesso de técnicas Auxiliares: ${aux}/${lim.auxMax}.`);
  return errs;
}

// ========================= PV da Manifestação =========================

function activationDeltaPV(ativacao) {
  if (ativacao === 'acao-poder') return 3;
  if (ativacao === 'acao-bonus' || ativacao === 'reacao') return 1;
  return 0;
}

/** Soma _pv de uma lista (efeitos positivos, redutores negativos, restrições negativas) */
function sumPV(arr) { return (arr || []).reduce((a, x) => a + (Number(x?._pv) || 0), 0); }

/** Calcula PVs da MH e retorna estrutura para renderização. */
export function validatePV(manifest) {
  const sub = SUBCATEGORIAS.find(x => x.id === manifest.subcatId) || {};
  const base0 = 3 + activationDeltaPV(manifest.ativacao);
  const base = base0 + Number(sub.pvCurrentDelta || 0);

  const pvEfeitos   = +sumPV(manifest.efeitos);              // normalmente >= 0
  const pvReducao   = +sumPV(manifest.redutores) + sumPV(manifest.restricoes); // normalmente <= 0
  const disponiveis = base + (pvReducao);                    // PV base ajustado por reduções
  // Limite
  let limite = 8;
  if (typeof sub.pvLimitSetTo === 'number') limite = sub.pvLimitSetTo;
  else if (typeof sub.pvLimitDelta === 'number') limite = base + sub.pvLimitDelta;

  const liquido = pvEfeitos + (pvReducao); // saldo dos itens adicionados (info)

  const errs = [];
  if (pvEfeitos > limite) errs.push(`Efeitos consomem ${pvEfeitos} PV e excedem o limite da subcategoria (${limite}).`);
  if ((pvEfeitos) > Math.max(disponiveis, 0))
    errs.push(`Efeitos (${pvEfeitos} PV) superam os PV disponíveis (${disponiveis}). Adicione redutores/restrições ou remova efeitos.`);

  return {
    base,
    disponiveis,
    limite,
    pvDetalhe: {
      efeitos: pvEfeitos,
      reduzido: pvReducao,
      liquido,
    },
    errs,
  };
}

// ========================= Custo de Técnica =========================

/**
 * Calcula o custo de uma técnica:
 * - base: efeitos + redutores (redução limitada ao "cap" do grau/tipo)
 * - extra: penalidade por afinidades das categorias marcadas
 * - total: base + extra (∞ se alguma categoria for 0%)
 */
export function costTechnique(tecnica, afinidades, starsMitig = 0) {
  // Soma de PA
  const somaEfeitos = (tecnica.efeitos || []).reduce((a, e) => a + (Number(e?._pa) || 0), 0);
  const somaRed     = (tecnica.redutores || []).reduce((a, r) => a + (Number(r?._pa) || 0), 0); // negativo

  // Redução máxima permitida
  const cap = tecnica.tipo === 'aux' ? 10 : (GRAUS[tecnica.grau]?.paMax ?? 2);
  const reducaoPermitida = Math.max(somaRed, -cap); // somaRed é negativo; limita pelo -cap
  const base = Math.max(1, somaEfeitos + reducaoPermitida);

  // Penalidade por afinidades
  let extra = 0;
  for (const ent of (tecnica.categorias || [])) {
    const rot = ent.categoria || ent.id;
    const perc = (afinidades && (afinidades[rot] ?? afinidades[rot?.toLowerCase?.()] ?? afinidades[rot?.toUpperCase?.()])) ?? 0;
    const pen = penalidadePorAfinidade(perc);
    if (pen === Infinity) { extra = Infinity; break; }
    extra += pen;
  }

  // Mitigação por ★ das restrições da MH
  if (extra !== Infinity && starsMitig > 0) {
    extra = Math.max(0, extra - Number(starsMitig || 0));
  }

  return { base, extra, total: extra === Infinity ? Infinity : base + extra };
}

// ========================= Checagem de requisitos simples =========================

/** Valida requisitos triviais dos itens adicionados (ex.: aplica em manifestacao, etc.). Retorna mensagens. */
export function checarRequisitosEfeitosRedutores(manifest) {
  const msgs = [];
  const sub = SUBCATEGORIAS.find(x => x.id === manifest.subcatId);

  for (const e of (manifest.efeitos || [])) {
    if (e && e.aplica && Array.isArray(e.aplica) && !e.aplica.includes('manifestacao')) {
      msgs.push(`Efeito “${e.nome}” não se aplica a Manifestação.`);
    }
  }
  for (const r of (manifest.redutores || [])) {
    if (r && r.aplica && Array.isArray(r.aplica) && !r.aplica.includes('manifestacao')) {
      msgs.push(`Redutor “${r.nome}” não se aplica a Manifestação.`);
    }
  }

  // Exemplo de validação contextual simples
  if (sub?.id === 'defensivo') {
    const temDano = (manifest.efeitos || []).some(e => /dano/i.test(e?.nome || ''));
    if (temDano) msgs.push('Subcategoria Defensivo: evite efeitos de dano direto na Manifestação.');
  }

  return msgs;
}

// ========================= Export opcional no window (sem "E" solto) =========================
// (Isto evita o erro "E is not defined" caso alguém consulte window.Engine para debug.)
if (typeof window !== 'undefined') {
  window.Engine = {
    GRAUS,
    calcAutoAffinities,
    materializeEffect,
    materializeReducer,
    materializeRestriction,
    subcatTechniqueLimits,
    validateTechniqueCounts,
    validatePV,
    costTechnique,
    checarRequisitosEfeitosRedutores,
  };
}
