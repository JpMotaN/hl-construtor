
// js/engine.calcs.js — núcleo de cálculo (PV/PA) e validações

import { CATEGORIAS, AFINIDADES_PADRAO } from '../data/categorias.js';
import { SUBCATEGORIAS } from '../data/subcategorias.js';
import { EFEITOS }    from '../data/efeitos.js';
import { REDUTORES }  from '../data/redutores.js';
import { RESTRICOES } from '../data/restricoes.js';
import { CONDICOES }  from '../data/condicoes.js';

function num(n){ return (typeof n === 'number' && !Number.isNaN(n)) ? n : 0; }

export function readPAraw(item, context={}){
  if (!item) return 0;
  if (typeof item.calcPA === 'function'){
    try { return num(item.calcPA(context) ?? 0); } catch(e){ return 0; }
  }
  if (typeof item.calcPv === 'function'){
    try { return num(item.calcPv(context) ?? 0); } catch(e){ return 0; }
  }
  const keys = ['pa','PA','pv','PV','custo','valor','value'];
  for (const k of keys) if (k in (item||{})) return num(item[k]);
  return 0;
}

export function readPA(item, context={}){
  const v = readPAraw(item, context);
  return Math.abs(Number.isFinite(v) ? v : 0);
}

export function activationBonus(activation){
  if (activation === 'acao-poder') return 3;
  if (activation === 'acao-bonus' || activation === 'acao-bônus' || activation === 'reacao' || activation === 'reação') return 1;
  return 0;
}

export function subcatInfo(subId){
  const s = SUBCATEGORIAS.find(x => x.id === subId);
  let pvLimit = 8, pvBase = 3;
  if (s){
    if ('pvLimit' in s) pvLimit = s.pvLimit|0;
    if ('pvBase'  in s) pvBase  = s.pvBase|0;
    if ('pvLimitDelta'   in s) pvLimit += s.pvLimitDelta|0;
    if ('pvCurrentDelta' in s) pvBase  += s.pvCurrentDelta|0;
    if ('pvLimitSetTo'   in s) pvLimit  = s.pvLimitSetTo|0;
  }
  return { pvLimit, pvBase, regras: s?.regras||{} };
}

export function sumEffectsPA(itens, context={}){
  return (itens||[]).reduce((acc, e) => acc + Math.max(0, readPAraw(e, context)), 0);
}

export function sumReductionsPA(itens, context={}){
  return (itens||[]).reduce((acc, r) => {
    const v = readPAraw(r, context);
    return acc + (v < 0 ? -v : 0);
  }, 0);
}

export function validateItem(item, context={}){
  if (!item) return null;
  if (Array.isArray(item.aplica) && context.scope){
    if (!item.aplica.includes(context.scope)) return `Disponível apenas em: ${item.aplica.join(', ')}`;
  }
  if (typeof item.requisitos === 'function'){
    try{
      const msg = item.requisitos(context);
      if (msg) return msg;
    }catch(e){}
  }
  return null;
}

export function calcManifestacao({ subcatId, activation, efeitos=[], redutores=[], restricoes=[] }){
  const { pvLimit, pvBase } = subcatInfo(subcatId);
  const bonus = activationBonus(activation);
  const ctx = { subcatId, activation, scope:'manifestacao' };

  const gastoPV   = sumEffectsPA(efeitos, ctx);
  const ganhoPV   = sumReductionsPA([...(redutores||[]), ...(restricoes||[])], ctx);

  const elevamLimite = new Set(['grupo_especifico','corte_vitalidade','sacrificar_aura','tecnica_devoradora']);
  const ganhoExcecoes = [...(redutores||[]), ...(restricoes||[])].reduce((acc,i)=>{
    return acc + (elevamLimite.has(i?.id) ? Math.max(0, -readPAraw(i, ctx)) : 0);
  }, 0);

  const limiteEfetivo = pvLimit + ganhoExcecoes;
  const capacidade    = Math.min(limiteEfetivo, pvBase + bonus + ganhoPV);
  const saldo         = gastoPV - ganhoPV;

  return {
    pvBase: pvBase + bonus,
    pvLimite: limiteEfetivo,
    pvDisponiveis: capacidade,
    pvEmEfeitos: gastoPV,
    pvDeReducoes: ganhoPV,
    saldo
  };
}

export const Catalog = {
  categorias: () => CATEGORIAS,
  subcats: () => SUBCATEGORIAS,
  efeitos: () => EFEITOS,
  redutores: () => REDUTORES,
  restricoes: () => RESTRICOES,
  condicoes: () => CONDICOES,
  afinidadesPadrao: () => AFINIDADES_PADRAO,
};

if (typeof window !== 'undefined'){
  window.Engine = { readPA, readPAraw, activationBonus, subcatInfo, sumEffectsPA, sumReductionsPA, calcManifestacao, validateItem, Catalog };
}
