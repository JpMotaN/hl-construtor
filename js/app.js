
// js/app.js
// UI mínima reescrita focada em: (1) efeitos entrando no cálculo de PV
// e (2) criação de técnicas funcional com custo por grau.

import { CATEGORIAS, AFINIDADES_PADRAO } from '../data/categorias.js';
import { SUBCATEGORIAS } from '../data/subcategorias.js';
import { EFEITOS }    from '../data/efeitos.js';
import { REDUTORES }  from '../data/redutores.js';
import { RESTRICOES } from '../data/restricoes.js';
import { calcManifestacao, activationBonus, Catalog, validateItem, readPA } from './engine.calcs.js';

// ---------- util ----------

function titleCase(str){ return (str||'').toLowerCase().replace(/(?:^|\s|-)([a-zà-ú])/g, s=>s.toUpperCase()); }
function showPreview(el, item, scope, context){
  if (!el) return;
  if (!item){ el.textContent=''; return; }
  const desc = item.desc || item.descricao || '';
  const msg = (typeof item.requisitos==='function') ? (item.requisitos(context)||'') : '';
  const aplica = Array.isArray(item.aplica) ? `Disponível em: ${item.aplica.join(', ')}` : '';
  el.innerHTML = [desc, aplica, msg && ('<b>Requisito:</b> '+msg)].filter(Boolean).join('<br/>');
}

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function num(n){ return typeof n === 'number' && !Number.isNaN(n) ? n : 0; }
function option(v, t){ const o=document.createElement('option'); o.value=v; o.textContent=t; return o; }

// ---------- estado ----------
const state = {
  categoria: CATEGORIAS[0]?.id ?? 'aprimorador',
  affMode: 'auto',
  affinities: {},
  subcatId: SUBCATEGORIAS[0]?.id,
  activation: 'acao-poder',
  efeitos: [],
  redutores: [],
  restricoes: [],
  tecnicas: []
};

// ---------- montar selects ----------
(function mountSelectors(){
  // subcategorias
  const sel = $('#subcatSelect');
  if (sel){
    sel.innerHTML = '';
    for (const s of SUBCATEGORIAS){ sel.append(option(s.id, s.nome)); }
    sel.value = state.subcatId;
  }

  // grupos de efeitos
  const grupos = Array.from(new Set(EFEITOS.map(e => e.grupo || e.group || 'outros')));
  const gSel = $('#efeitoGroup');
  if (gSel){
    gSel.innerHTML = '';
    gSel.append(option('', '(todos)'));
    for (const g of grupos) gSel.append(option(g, g));
  }

  // pickers
  if ($('#efeitoPicker')) fillEffectPicker();
  const rst = $('#restricaoPicker');
  if (rst){
    rst.innerHTML = '';
    for (const r of RESTRICOES) rst.append(option(r.id, `${r.nome||r.name}`));
  }
  const red = $('#redutorPicker');
  if (red){
    red.innerHTML = '';
    for (const r of REDUTORES) red.append(option(r.id, `${r.nome||r.name}`));
  }
})();

// montar categoria principal
(function(){
  const sel = document.getElementById('catSelect');
  if (sel){
    sel.innerHTML = '';
    for (const c of CATEGORIAS){ const o=document.createElement('option'); o.value=c.id; o.textContent=c.nome; sel.append(o); }
    state.categoria = state.categoria || CATEGORIAS[0].id;
    sel.value = state.categoria;
    sel.addEventListener('change', e => { state.categoria = e.target.value; if (state.affMode!=='manual'){ // atualiza afinidades padrão
      state.affinities = { ...AFINIDADES_PADRAO[state.categoria] }; renderAffinities();
    }});
  }
  const mode = document.getElementById('affModeSelect');
  if (mode){
    mode.value = state.affMode || 'auto';
    mode.addEventListener('change', e => {
      state.affMode = e.target.value;
      const ed = document.getElementById('affinityEditor');
      if (state.affMode==='manual') { ed.classList.remove('hidden'); }
      else { ed.classList.add('hidden'); state.affinities = { ...AFINIDADES_PADRAO[state.categoria||CATEGORIAS[0].id] }; renderAffinities(); }
    });
  }
  // iniciar afinidades
  state.affinities = state.affinities || { ...AFINIDADES_PADRAO[state.categoria||CATEGORIAS[0].id] };
  renderAffinities();
})();

function renderAffinities(){
  const grid = document.getElementById('affinityGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const cat of Object.keys(AFINIDADES_PADRAO)){
    const wrap = document.createElement('div');
    wrap.innerHTML = `<label class="lbl">${titleCase(cat)}</label><input type="number" min="0" max="120" value="${state.affinities?.[cat]??(AFINIDADES_PADRAO[state.categoria]?.[cat]||0)}" ${(document.getElementById('affModeSelect')?.value!=='manual')?'disabled':''} />`;
    const input = wrap.querySelector('input');
    input.addEventListener('input', ev => { state.affinities[cat] = Math.max(0, Math.min(120, parseInt(ev.target.value||'0',10))); });
    grid.append(wrap);
  }
}


function fillEffectPicker(){
  const group = $('#efeitoGroup')?.value || '';
  const effSel = $('#efeitoPicker');
  if (!effSel) return;
  effSel.innerHTML = '';
  const list = group ? EFEITOS.filter(e => (e.grupo||e.group) === group) : EFEITOS;
  for (const e of list) effSel.append(option(e.id, `[${e.grupo||e.group||'—'}] ${e.nome||e.name}`));
}

// ---------- handlers UI ----------
if ($('#subcatSelect')) $('#subcatSelect').addEventListener('change', e => { state.subcatId = e.target.value; recalc(); });
if ($('#manifestActivation')) $('#manifestActivation').addEventListener('change', e => { state.activation = e.target.value; recalc(); });
if ($('#efeitoGroup')) $('#efeitoGroup').addEventListener('change', fillEffectPicker);
if ($('#efeitoPicker')) $('#efeitoPicker').addEventListener('change', ()=>{ const id=$('#efeitoPicker').value; const e=EFEITOS.find(x=>x.id==id); showPreview($('#efeitoPreview'), e, 'manifestacao', {subcatId:state.subcatId, activation:state.activation, scope:'manifestacao'}); });

if ($('#addEfeito')) $('#addEfeito').addEventListener('click', () => {
  const id = $('#efeitoPicker').value;
  const e = EFEITOS.find(x => x.id == id);
  if (!e) return;
  const ctx = { subcatId: state.subcatId, activation: state.activation, scope:'manifestacao' };
  const msg = validateItem(e, ctx);
  if (msg){ alert('Não é possível adicionar: '+msg); return; }
  const pv = readPA(e, ctx);
  // bloquear se exceder capacidade
  const r0 = calcManifestacao({ subcatId: state.subcatId, activation: state.activation, efeitos: state.efeitos, redutores: state.redutores, restricoes: state.restricoes });
  const r1 = calcManifestacao({ subcatId: state.subcatId, activation: state.activation, efeitos: [...state.efeitos, {...e, _pa: pv}], redutores: state.redutores, restricoes: state.restricoes });
  if (r1.pvEmEfeitos > r1.pvDisponiveis){ alert('Adicionar este efeito excede os PV disponíveis.'); return; }
  state.efeitos.push({ ...e, _pa: pv });
  // adiciona tag visual
  addTag('#efeitosMH', `${e.nome||e.name}`, pv, () => {
    const idx = state.efeitos.findIndex(x => x.id==id);
    if (idx>=0){ state.efeitos.splice(idx,1); recalc(); }
  });
  recalc();
});

if ($('#addRestricao')) $('#addRestricao').addEventListener('click', () => {
  const id = $('#restricaoPicker').value;
  const r = RESTRICOES.find(x => x.id == id);
  if (!r) return;
  const ctx = { subcatId: state.subcatId, activation: state.activation, scope:'manifestacao' };
  const msg = validateItem(r, ctx);
  if (msg){ alert('Não é possível adicionar: '+msg); return; }
  const pv = readPA(r, ctx);
  // Cap de contribuição de reduções para capacidade (sem exceções)
  const before = calcManifestacao({ subcatId: state.subcatId, activation: state.activation, efeitos: state.efeitos, redutores: state.redutores, restricoes: state.restricoes });
  const after  = calcManifestacao({ subcatId: state.subcatId, activation: state.activation, efeitos: state.efeitos, redutores: state.redutores, restricoes: [...state.restricoes, {...r, _pa: pv}] });
  if (after.pvDisponiveis <= before.pvDisponiveis && pv>0){ alert('Este item não aumenta mais sua capacidade de PV (limite atingido).'); return; }
  state.restricoes.push({ ...r, _pa: pv });
  addTag('#restricoesLista', `${r.nome||r.name}`, pv, () => {
    const idx = state.restricoes.findIndex(x => x.id==id);
    if (idx>=0){ state.restricoes.splice(idx,1); recalc(); }
  });
  recalc();
});

if ($('#addRedutor')) $('#addRedutor').addEventListener('click', () => {
  const id = $('#redutorPicker').value;
  const r = REDUTORES.find(x => x.id == id);
  if (!r) return;
  const ctx = { subcatId: state.subcatId, activation: state.activation, scope:'manifestacao' };
  const msg = validateItem(r, ctx);
  if (msg){ alert('Não é possível adicionar: '+msg); return; }
  const pv = readPA(r, ctx);
  const before = calcManifestacao({ subcatId: state.subcatId, activation: state.activation, efeitos: state.efeitos, redutores: state.redutores, restricoes: state.restricoes });
  const after  = calcManifestacao({ subcatId: state.subcatId, activation: state.activation, efeitos: state.efeitos, redutores: [...state.redutores, {...r, _pa: pv}], restricoes: state.restricoes });
  if (after.pvDisponiveis <= before.pvDisponiveis && pv>0){ alert('Este item não aumenta mais sua capacidade de PV (limite atingido).'); return; }
  state.redutores.push({ ...r, _pa: pv });
  addTag('#redutoresMH', `${r.nome||r.name}`, pv, () => {
    const idx = state.redutores.findIndex(x => x.id==id);
    if (idx>=0){ state.redutores.splice(idx,1); recalc(); }
  });
  recalc();
});

function addTag(containerSel, text, pv, onRemove){
  const wrap = document.createElement('div');
  wrap.className = 'tag';
  wrap.innerHTML = `
    <span>${text}</span>
    <span class="pv">${pv} PV</span>
    <button class="x" aria-label="remover">×</button>
  `;
  wrap.querySelector('button.x').addEventListener('click', () => {
    const next = wrap.nextElementSibling; if (next && next.classList && next.classList.contains('inline-editor')) next.remove();
    wrap.remove();
    onRemove && onRemove();
  });
  const cont = document.querySelector(containerSel);
  if (cont) cont.append(wrap);
}

// ---------- Técnicas ----------
const GRAUS = {1:{paMax:2},2:{paMax:4},3:{paMax:6},4:{paMax:8},5:{paMax:10},6:{paMax:12}};
if (document.querySelector('#addTech')) document.querySelector('#addTech').addEventListener('click', () => {
  const tipo = document.querySelector('#techType').value;
  const grau = parseInt(document.querySelector('#techGrau').value,10);
  const nome = document.querySelector('#techNome').value || `Técnica de ${grau}º`;
  const paMax = GRAUS[grau]?.paMax ?? 2;

  const tech = {
    id: 't'+Date.now(),
    tipo, grau, nome,
    efeitos: [], redutores: [], restricoes: [],
    paMax, paBase: 0, paEfeitos: 0, paReducoes: 0
  };
  state.tecnicas.push(tech);
  renderTechList();
});

function renderTechList(){
  const list = document.querySelector('#techList');
  if (!list) return;
  list.innerHTML = '';
  const c1 = state.tecnicas.filter(t=>t.tipo==='comum').length;
  const c2 = state.tecnicas.filter(t=>t.tipo==='aux').length;
  const cc = document.querySelector('#countComum'); if (cc) cc.textContent = String(c1);
  const ca = document.querySelector('#countAux'); if (ca) ca.textContent   = String(c2);
  for (const t of state.tecnicas){
    const div = document.createElement('div');
    div.className = 'panel';
    const saldo = t.paEfeitos - t.paReducoes;
    div.innerHTML = `
      <div class="row between">
        <div><b>${t.nome}</b> · ${t.grau}º · ${t.tipo.toUpperCase()}</div>
        <div>PA máx: ${t.paMax} · Saldo: ${saldo} PA</div>
      </div>
    `;
    list.append(div);
  }
}

// ---------- recálculo ----------
function recalc(){
  const r = calcManifestacao({
    subcatId: state.subcatId,
    activation: state.activation,
    efeitos: state.efeitos,
    redutores: state.redutores,
    restricoes: state.restricoes
  });

  const set = (id, v) => { const el = document.querySelector(id); if (el) el.textContent = String(v); };
  set('#pvBase', r.pvBase);
  set('#pvAtuais', r.pvDisponiveis);
  set('#pvLimite', r.pvLimite);
  set('#pvEfeitosMH', r.pvEmEfeitos);
  set('#pvReduzidoMH', r.pvDeReducoes);
  set('#pvLiquidoMH', r.saldo);
}

// boot
document.addEventListener('DOMContentLoaded', () => {
  try { recalc(); } catch(e){ console.error(e); }
});

if (document.querySelector('#restricaoPicker')) document.querySelector('#restricaoPicker').addEventListener('change', ()=>{ const id=document.querySelector('#restricaoPicker').value; const it=RESTRICOES.find(x=>x.id==id); showPreview(document.querySelector('#restricaoPreview'), it, 'manifestacao', {subcatId:state.subcatId, activation:state.activation, scope:'manifestacao'}); });

if (document.querySelector('#redutorPicker')) document.querySelector('#redutorPicker').addEventListener('change', ()=>{ const id=document.querySelector('#redutorPicker').value; const it=REDUTORES.find(x=>x.id==id); showPreview(document.querySelector('#redutorPreview'), it, 'manifestacao', {subcatId:state.subcatId, activation:state.activation, scope:'manifestacao'}); });
