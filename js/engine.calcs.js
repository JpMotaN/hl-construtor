
// js/engine.calcs.js
// Engine de cálculos — 100% independente da UI.
// Objetivo: somar custos de PA dos efeitos, subtrair PA de redutores/restrições
// e fornecer utilitários para Manifestação (MH) e Técnicas.

import { CATEGORIAS, AFINIDADES_PADRAO } from '../data/categorias.js';
import { SUBCATEGORIAS } from '../data/subcategorias.js';
import { EFEITOS }    from '../data/efeitos.js';
import { REDUTORES }  from '../data/redutores.js';
import { RESTRICOES } from '../data/restricoes.js';
import { CONDICOES }  from '../data/condicoes.js';

function num(n){ return (typeof n === 'number' && !Number.isNaN(n)) ? n : 0; }
function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

/** Constrói objeto de afinidades conforme categoria principal e/ou modo manual */
export function buildAffinities(categoriaId, manualAff = null){
  if (manualAff && typeof manualAff === 'object') return manualAff;
  const map = AFINIDADES_PADRAO[categoriaId] || AFINIDADES_PADRAO['aprimorador'];
  // cópia defensiva
  return JSON.parse(JSON.stringify(map));
}

/** Lê custo "em PA" de um item de catálogo (efeito/restrição/redutor) com contexto */
export function readPA(item, ctx = {}){
  if (!item) return 0;
  // Se for uma instância (com params próprios), preferimos item.params a ctx.params
  const params = (item.params ?? ctx.params) || {};
  const tecnica = item.tecnica || ctx.tecnica || null;
  const emManifestacao = !!(ctx.emManifestacao);
  const context = {
    ...ctx.context,
    condicoes: CONDICOES,
    subcatId: ctx.subcatId,
    affinities: ctx.affinities
  };

  // calcPA tem prioridade
  if (typeof item.calcPA === 'function'){
    try {
      const v = item.calcPA({ tecnica, params, emManifestacao, context });
      return Math.abs(num(v));
    } catch(e){ /* silencia */ }
  }
  // calcPv (fallback raro)
  if (typeof item.calcPv === 'function'){
    try {
      const v = item.calcPv({ tecnica, params, emManifestacao, context });
      return Math.abs(num(v));
    } catch(e){ /* silencia */ }
  }
  // campos comuns
  for (const k of ['pa','PA','pv','PV','custo','cost','valor','value']){
    if (k in item) return Math.abs(num(item[k]));
  }
  return 0;
}

/** Info básica de subcategoria (limite/base) com deltas */
export function subcatInfo(subId){
  const s = SUBCATEGORIAS.find(x => x.id === subId);
  let pvLimit = 8, pvBase = 3;
  if (s && typeof s === 'object'){
    for (const k of ['pvLimite','pv_limit','pvLimit','limite','limit','pvMax','pv_max']) {
      if (k in s){ pvLimit = num(s[k]) || pvLimit; break; }
    }
    for (const k of ['pvBase','pv_base','base','pvDefault','pv_default']){
      if (k in s){ pvBase = num(s[k]) || pvBase; break; }
    }
    if ('pvLimitDelta' in s)    pvLimit += num(s.pvLimitDelta);
    if ('pvCurrentDelta' in s)  pvBase  += num(s.pvCurrentDelta);
  }
  return { pvLimit, pvBase };
}

/** Bônus de PV pela ativação escolhida (apenas MH) */
export function activationBonus(mode){
  switch(mode){
    case 'acao-bonus':
    case 'reacao': return 1;
    case 'acao-poder': return 3;
    case 'acao':
    default: return 0;
  }
}

/** Soma de custos dos efeitos */
export function sumEffectsPA(efeitos, ctx={}){
  return (efeitos||[]).reduce((acc, it) => acc + Math.max(0, readPA(it, ctx)), 0);
}

/** Soma de reduções (restrições + redutores) — tratadas como números positivos */
export function sumReductionsPA(items, ctx={}){
  return (items||[]).reduce((acc, it) => acc + Math.max(0, readPA(it, ctx)), 0);
}

/** Calcula MH (capacidade/consumo) */
export function calcManifestacao({ categoriaId, subcatId, activation, efeitos=[], redutores=[], restricoes=[], affinities=null }){
  const { pvLimit, pvBase } = subcatInfo(subcatId);
  const bonusAtiv = activationBonus(activation);
  const aff = buildAffinities(categoriaId, affinities);
  const ctx = { emManifestacao:true, subcatId, affinities: aff };

  const gastoPV = sumEffectsPA(efeitos, ctx);
  const ganhoPV = sumReductionsPA([...redutores, ...restricoes], ctx);

  // capacidade: quanto você pode gastar em efeitos
  const capacidade = Math.min(pvLimit, pvBase + bonusAtiv + ganhoPV);
  const pvDisponiveis = Math.max(0, capacidade - gastoPV);
  const saldo = gastoPV - ganhoPV;

  return {
    pvBase: pvBase + bonusAtiv,
    pvLimite: pvLimit,
    pvDisponiveis,
    pvEmEfeitos: gastoPV,
    pvDeReducoes: ganhoPV,
    saldo,
    ok: gastoPV <= capacidade,
    capacidade
  };
}

/** Regras e limites por grau (máx de PA final) */
export const GRAUS = {1:{paMax:2},2:{paMax:4},3:{paMax:6},4:{paMax:8},5:{paMax:10},6:{paMax:12}};

/** Calcula uma técnica (custo final de PA) */
export function calcTecnica({ tipo='comum', grau=1, efeitos=[], redutores=[], restricoes=[] }){
  const g = clamp(parseInt(grau||1,10), 1, 6);
  const paMax = GRAUS[g].paMax;
  const ctx = { emManifestacao:false };

  const paEfeitos = sumEffectsPA(efeitos.map(e => ({...e, tecnica:{tipo,grau:g}})), ctx);
  const paReduc   = sumReductionsPA([...redutores, ...restricoes].map(r => ({...r, tecnica:{tipo,grau:g}})), ctx);
  const total = Math.max(0, paEfeitos - paReduc);

  return {
    grau: g,
    tipo,
    paEfeitos,
    paReduc,
    total,
    paMax,
    ok: total >= 1 && total <= paMax
  };
}

/** Exposição para depuração em window.Engine */
export const Catalog = {
  categorias: () => CATEGORIAS,
  subcats: () => SUBCATEGORIAS,
  efeitos: () => EFEITOS,
  redutores: () => REDUTORES,
  restricoes: () => RESTRICOES,
  condicoes: () => CONDICOES
};

// debug helpers no browser
if (typeof window !== 'undefined'){
  window.Engine = { buildAffinities, readPA, subcatInfo, activationBonus, sumEffectsPA, sumReductionsPA, calcManifestacao, calcTecnica, Catalog, GRAUS };
  window.CATALOG = { CATEGORIAS, SUBCATEGORIAS, EFEITOS, REDUTORES, RESTRICOES, CONDICOES };
}
