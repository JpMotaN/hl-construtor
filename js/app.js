
// js/app.js — UI completa para MH e Técnicas
import { CATEGORIAS }   from '../data/categorias.js';
import { SUBCATEGORIAS } from '../data/subcategorias.js';
import { EFEITOS }      from '../data/efeitos.js';
import { REDUTORES }    from '../data/redutores.js';
import { RESTRICOES }   from '../data/restricoes.js';
import { CONDICOES }    from '../data/condicoes.js';
import { calcManifestacao, calcTecnica, activationBonus, Catalog, readPA, buildAffinities, GRAUS } from './engine.calcs.js';

// helpers
const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const el = (tag, cls=null) => { const n = document.createElement(tag); if (cls) n.className=cls; return n; };
const uid = () => Math.random().toString(36).slice(2,9);
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));

function option(v, t){ const o=document.createElement('option'); o.value=v; o.textContent=t; return o; }

// estado global
const state = {
  categoriaId: CATEGORIAS[0]?.id ?? 'aprimorador',
  affMode: 'auto',          // auto | manual
  affinities: null,         // quando manual
  subcatId: SUBCATEGORIAS[0]?.id ?? 'ofensivo',
  activation: 'acao-poder', // para MH
  efeitos: [], redutores: [], restricoes: [], // da MH
  tecnicas: [],
};

// ==== Montagem inicial ====

function mountResRedPickers(){
  const rSel = $('#restricaoPicker'); rSel.innerHTML='';
  RESTRICOES.forEach(r => rSel.append(option(r.id, r.nome||r.name)));
  const dSel = $('#redutorPicker'); dSel.innerHTML='';
  REDUTORES.forEach(d => dSel.append(option(d.id, d.nome||d.name)));
}

function mountCategorias(){
  const wrap = $('#catRadios');
  wrap.innerHTML = '';
  for (const c of CATEGORIAS){
    const lbl = el('label','chip');
    const inp = el('input');
    inp.type = 'radio'; inp.name = 'categoria'; inp.value = c.id;
    if (c.id === state.categoriaId) inp.checked = true;
    const txt = document.createTextNode(' ' + (c.nome||c.id));
    lbl.append(inp, txt);
    inp.addEventListener('change', () => { state.categoriaId = c.id; recalcMH(); });
    wrap.append(lbl);
  }
}

function mountSubcats(){
  const sel = $('#subcatSelect');
  sel.innerHTML = '';
  for (const s of SUBCATEGORIAS) sel.append(option(s.id, s.nome || s.id));
  sel.value = state.subcatId;
  sel.addEventListener('change', e => { state.subcatId = e.target.value; recalcMH(); });
}

function mountEffectGroup(){
  const grupos = Array.from(new Set(EFEITOS.map(e => e.grupo || e.group || 'outros')));
  const gSel = $('#efeitoGroup'); gSel.innerHTML = '';
  gSel.append(option('', '(todos)'));
  for (const g of grupos) gSel.append(option(g,g));
  gSel.addEventListener('change', fillEffectPicker);
  fillEffectPicker();
}

function fillEffectPicker(){
  const group = $('#efeitoGroup').value;
  const effSel = $('#efeitoPicker'); effSel.innerHTML = '';
  const list = group ? EFEITOS.filter(e => (e.grupo||e.group) === group) : EFEITOS;
  for (const e of list) effSel.append(option(e.id, `[${e.grupo||e.group||'—'}] ${e.nome||e.name}`));
  updateEfeitoPreview();
}

function defaultParamsFromSpec(paramsSpec){
  const p = {};
  for (const f of (paramsSpec||[])){
    if ('default' in f) p[f.key] = f.default;
    else if (f.type === 'int') p[f.key] = 0;
    else if (f.type === 'bool') p[f.key] = false;
    else if (f.type === 'select') p[f.key] = (f.options&&f.options[0]) || '';
  }
  return p;
}

function updateEfeitoPreview(){
  const id = $('#efeitoPicker').value;
  const eff = EFEITOS.find(x => x.id===id);
  if (!eff){ $('#efeitoPreview').textContent = '—'; return; }
  const params = defaultParamsFromSpec(eff.paramsSpec);
  const pa = readPA({ ...eff, params, tecnica:{grau:1,tipo:'comum'} }, { emManifestacao:true, subcatId: state.subcatId, affinities: buildAffinities(state.categoriaId) });
  $('#efeitoPreview').textContent = `${pa} PA`;
}

// ==== Tags com editor de parâmetros ====
function makeParamEditor(item, onChange){
  if (!item.paramsSpec || !item.paramsSpec.length) return null;
  const box = el('div','preview'); // caixinha simples
  const form = el('div','grid g2');
  const inputs = {};
  for (const f of item.paramsSpec){
    const wrap = el('div');
    const lab = el('label','lbl'); lab.textContent = f.label || f.key;
    let input;
    if (f.type === 'int'){
      input = el('input'); input.type='number';
      if ('min' in f) input.min = f.min;
      if ('max' in f) input.max = f.max;
      if ('step' in f) input.step = f.step;
      input.value = String(item.params?.[f.key] ?? f.default ?? 0);
    } else if (f.type === 'bool'){
      input = el('input'); input.type='checkbox';
      input.checked = !!(item.params?.[f.key] ?? f.default ?? false);
    } else if (f.type === 'select'){
      input = el('select');
      for (const opt of (f.options||[])) input.append(option(opt,opt));
      input.value = String(item.params?.[f.key] ?? f.default ?? '');
    } else {
      input = el('input'); input.value = String(item.params?.[f.key] ?? '');
    }
    input.addEventListener('input', () => {
      if (f.type === 'bool') item.params[f.key] = input.checked;
      else if (f.type === 'int') item.params[f.key] = parseInt(input.value||'0',10);
      else item.params[f.key] = input.value;
      onChange && onChange();
    });
    wrap.append(lab,input);
    form.append(wrap);
    inputs[f.key]=input;
  }
  box.append(form);
  return box;
}

function addRemovableTag(container, item, ctx, onRemove){
  const tag = el('div','tag');
  const name = el('span'); name.textContent = item.nome || item.name || item.id;
  const pv = el('span','pv'); pv.textContent = '…';
  const btnX = el('button','x'); btnX.textContent = '×'; btnX.setAttribute('aria-label','remover');

  // inicializa params e calcula
  if (!item.params) item.params = defaultParamsFromSpec(item.paramsSpec);
  const recalcTag = () => {
    const pa = readPA(item, ctx);
    pv.textContent = `${pa} PA`;
    // propagate totals
    recalcMH();
    recalcTodasTecnicas();
  };

  // editor (se houver)
  const editor = makeParamEditor(item, recalcTag);
  if (editor){
    const detailsBtn = el('button','btn outline'); detailsBtn.textContent = 'Ajustar';
    detailsBtn.style.marginLeft = '6px';
    detailsBtn.addEventListener('click', () => {
      if (editor.isConnected) editor.remove(); else tag.after(editor);
    });
    tag.append(detailsBtn);
  }

  btnX.addEventListener('click', () => { tag.remove(); onRemove && onRemove(); recalcTag(); });

  tag.prepend(name);
  tag.append(pv, btnX);
  container.append(tag);
  // primeira atualização
  recalcTag();
}

// ==== Seção MH ====
function bindMH(){
  // afinidades: alternância auto/manual (editor simples)
  $$('input[name="affMode"]').forEach(inp => {
    inp.addEventListener('change', e => {
      state.affMode = e.target.value;
      $('#affinityEditor').classList.toggle('hidden', state.affMode!=='manual');
      if (state.affMode==='manual'){
        // monta grid de sliders (6 categorias)
        const grid = $('#affinityGrid'); grid.innerHTML='';
        const base = buildAffinities(state.categoriaId);
        state.affinities = {...base};
        Object.keys(base).forEach(cat => {
          const cell = el('div','stat-bar');
          const lab = el('div','muted'); lab.textContent = cat;
          const input = el('input'); input.type='range'; input.min='0'; input.max='100'; input.step='20';
          input.value = base[cat];
          const out = el('div'); out.textContent = base[cat] + '%';
          input.addEventListener('input', () => { state.affinities[cat]=parseInt(input.value,10); out.textContent=input.value+'%'; recalcMH(); });
          cell.append(lab, input, out);
          grid.append(cell);
        });
      } else {
        state.affinities = null;
      }
      recalcMH();
    });
  });

  $('#manifestActivation').addEventListener('change', e => { state.activation = e.target.value; recalcMH(); });

  $('#addEfeito').addEventListener('click', () => {
    const id = $('#efeitoPicker').value;
    const eff = EFEITOS.find(x => x.id==id);
    if (!eff) return;
    state.efeitos.push({...eff, id: eff.id, params: defaultParamsFromSpec(eff.paramsSpec)});
    addRemovableTag($('#efeitosMH'), state.efeitos[state.efeitos.length-1], { emManifestacao:true, subcatId: state.subcatId, affinities: buildAffinities(state.categoriaId, state.affinities) }, () => {
      const idx = state.efeitos.findIndex(x => x===eff); if (idx>=0) state.efeitos.splice(idx,1);
    });
  });

  $('#addRestricao').addEventListener('click', () => {
    const id = $('#restricaoPicker').value;
    const r = RESTRICOES.find(x => x.id==id);
    if (!r) return;
    state.restricoes.push({...r, params: defaultParamsFromSpec(r.paramsSpec)});
    addRemovableTag($('#restricoesLista'), state.restricoes[state.restricoes.length-1], { emManifestacao:true, subcatId: state.subcatId }, () => {
      const idx = state.restricoes.findIndex(x => x.id===id); if (idx>=0) state.restricoes.splice(idx,1);
    });
  });

  $('#addRedutor').addEventListener('click', () => {
    const id = $('#redutorPicker').value;
    const r = REDUTORES.find(x => x.id==id);
    if (!r) return;
    state.redutores.push({...r, params: defaultParamsFromSpec(r.paramsSpec)});
    addRemovableTag($('#redutoresMH'), state.redutores[state.redutores.length-1], { emManifestacao:true, subcatId: state.subcatId }, () => {
      const idx = state.redutores.findIndex(x => x.id===id); if (idx>=0) state.redutores.splice(idx,1);
    });
  });
}

function recalcMH(){
  // Mostra limites/descritivo
  const { pvLimit, pvBase } = (function(){ const s = SUBCATEGORIAS.find(x=>x.id===state.subcatId)||{}; 
    // mesma heurística do engine
    let limit = 8, base=3;
    for (const k of ['pvLimite','pv_limit','pvLimit','limite','limit','pvMax','pv_max']) if (k in s){ limit = s[k]; break; }
    for (const k of ['pvBase','pv_base','base','pvDefault','pv_default']) if (k in s){ base = s[k]; break; }
    if ('pvLimitDelta' in s) limit += s.pvLimitDelta||0;
    if ('pvCurrentDelta' in s) base += s.pvCurrentDelta||0;
    return { pvLimit: limit, pvBase: base };
  })();
  $('#subcatInfo').textContent = `Base: ${pvBase} PV · Limite: ${pvLimit} PV · Ativação (+${activationBonus(state.activation)} PV)`;

  const r = calcManifestacao({
    categoriaId: state.categoriaId,
    subcatId: state.subcatId,
    activation: state.activation,
    efeitos: state.efeitos,
    redutores: state.redutores,
    restricoes: state.restricoes,
    affinities: state.affinities
  });

  $('#pvBase').textContent      = String(pvBase + activationBonus(state.activation));
  $('#pvAtuais').textContent    = String(r.pvDisponiveis);
  $('#pvLimite').textContent    = String(r.pvLimite);
  $('#pvEfeitosMH').textContent = String(r.pvEmEfeitos);
  $('#pvReduzidoMH').textContent= String(r.pvDeReducoes);
  $('#pvLiquidoMH').textContent = String(r.saldo);
  $('#pvWarn').innerHTML = r.ok ? '' : `<span class="bad">Você excedeu sua capacidade em ${r.pvEmEfeitos - r.capacidade} PV.</span>`;

  // ★ -> mitigação exibida (visual apenas, não altera cálculo)
  const totalStars = state.restricoes.reduce((acc, it) => acc + (it.stars||0), 0);
  $('#totalStars').textContent = String(totalStars);
  $('#affMit').textContent = `${totalStars} PA`;
}

// ==== Técnicas ====
function renderTecnicaCard(t){
  const card = el('div','saved-list item');
  card.dataset.id = t._id;

  const header = el('div','row');
  const title = el('strong'); title.textContent = `${t.nome || 'Técnica'} — ${t.tipo} · Grau ${t.grau}`;
  const meter = el('div','muted'); meter.style.marginLeft='auto';

  const totals = el('div','muted mt8'); totals.textContent = '—';

  // pickers internos
  const cols = el('div','grid g3 mt8');

  // Efeitos
  const colE = el('div');
  colE.append(Object.assign(el('label','lbl'),{textContent:'Adicionar Efeito'}));
  const gSel = el('select'); // grupo opcional
  const grupos = Array.from(new Set(EFEITOS.map(e => e.grupo||e.group||'outros'))); 
  gSel.append(option('', '(todos)')); grupos.forEach(g=>gSel.append(option(g,g)));
  const eSel = el('select'); const fill = () => {
    const g = gSel.value;
    eSel.innerHTML='';
    const list = g ? EFEITOS.filter(e => (e.grupo||e.group)===g) : EFEITOS;
    list.forEach(e => eSel.append(option(e.id, `[${e.grupo||e.group||'—'}] ${e.nome||e.name}`)));
  }; fill();
  gSel.addEventListener('change', fill);
  const addE = el('button','btn'); addE.textContent = 'Adicionar';
  addE.addEventListener('click', () => {
    const id = eSel.value; const e = EFEITOS.find(x=>x.id==id); if (!e) return;
    const inst = {...e, params: defaultParamsFromSpec(e.paramsSpec), tecnica:{tipo:t.tipo, grau:t.grau}};
    t.efeitos.push(inst);
    addRemovableTag(listE, inst, { emManifestacao:false, subcatId: state.subcatId }, () => {
      const i = t.efeitos.indexOf(inst); if (i>=0) t.efeitos.splice(i,1); recalcTecnicaCard(t, totals, meter);
    });
    recalcTecnicaCard(t, totals, meter);
  });
  const listE = el('div','tag-list mt6');
  colE.append(gSel,eSel,addE,listE);

  // Restrições
  const colR = el('div');
  colR.append(Object.assign(el('label','lbl'),{textContent:'Adicionar Restrição'}));
  const rSel = el('select'); RESTRICOES.forEach(r=>rSel.append(option(r.id, r.nome||r.name)));
  const addR = el('button','btn'); addR.textContent='Adicionar';
  addR.addEventListener('click', () => {
    const id = rSel.value; const r = RESTRICOES.find(x=>x.id==id); if (!r) return;
    const inst = {...r, params: defaultParamsFromSpec(r.paramsSpec), tecnica:{tipo:t.tipo, grau:t.grau}};
    t.restricoes.push(inst);
    addRemovableTag(listR, inst, { emManifestacao:false, subcatId: state.subcatId }, () => {
      const i = t.restricoes.indexOf(inst); if (i>=0) t.restricoes.splice(i,1); recalcTecnicaCard(t, totals, meter);
    });
    recalcTecnicaCard(t, totals, meter);
  });
  const listR = el('div','tag-list mt6');
  colR.append(rSel,addR,listR);

  // Redutores
  const colD = el('div');
  colD.append(Object.assign(el('label','lbl'),{textContent:'Adicionar Redutor'}));
  const dSel = el('select'); REDUTORES.forEach(r=>dSel.append(option(r.id, r.nome||r.name)));
  const addD = el('button','btn'); addD.textContent='Adicionar';
  addD.addEventListener('click', () => {
    const id = dSel.value; const r = REDUTORES.find(x=>x.id==id); if (!r) return;
    const inst = {...r, params: defaultParamsFromSpec(r.paramsSpec), tecnica:{tipo:t.tipo, grau:t.grau}};
    t.redutores.push(inst);
    addRemovableTag(listD, inst, { emManifestacao:false, subcatId: state.subcatId }, () => {
      const i = t.redutores.indexOf(inst); if (i>=0) t.redutores.splice(i,1); recalcTecnicaCard(t, totals, meter);
    });
    recalcTecnicaCard(t, totals, meter);
  });
  const listD = el('div','tag-list mt6');
  colD.append(dSel,addD,listD);

  cols.append(colE,colR,colD);
  card.append(header, totals, cols);

  function recalcTecnicaCardLocal(){
    recalcTecnicaCard(t, totals, meter);
  }
  // Header controls
  const del = el('button','btn outline'); del.textContent='Remover'; del.style.marginLeft='8px';
  del.addEventListener('click', () => {
    card.remove();
    const idx = state.tecnicas.findIndex(x=>x._id===t._id);
    if (idx>=0) state.tecnicas.splice(idx,1);
    recalcTodasTecnicas();
  });
  header.append(title, del, meter);
  recalcTecnicaCardLocal();
  return card;
}

function recalcTecnicaCard(t, totalsEl, meterEl){
  const res = calcTecnica(t);
  totalsEl.textContent = `Efeitos: ${res.paEfeitos} PA · Reduções: ${res.paReduc} PA · Total: ${res.total} / Máx ${res.paMax}`;
  meterEl.innerHTML = res.ok ? '<span class="ok">OK</span>' : `<span class="bad">Fora do limite (1–${res.paMax})</span>`;
}

function recalcTodasTecnicas(){
  let cComum=0, cAux=0;
  for (const t of state.tecnicas){ if (t.tipo==='aux') cAux++; else cComum++; }
  $('#countComum').textContent = String(cComum);
  $('#countAux').textContent   = String(cAux);
}

function bindTecnicas(){
  $('#addTech').addEventListener('click', () => {
    const tipo = $('#techType').value;
    const grau = clamp(parseInt($('#techGrau').value,10),1,6);
    const nome = $('#techNome').value.trim() || 'Técnica';
    const t = { _id: uid(), tipo, grau, nome, efeitos:[], restricoes:[], redutores:[] };
    state.tecnicas.push(t);
    const card = renderTecnicaCard(t);
    $('#techList').prepend(card);
    recalcTodasTecnicas();
  });
}

// ==== Exportar / Importar ====
function bindExport(){
  $('#exportJson').addEventListener('click', () => {
    const data = {
      categoriaId: state.categoriaId,
      affMode: state.affMode,
      affinities: state.affinities,
      subcatId: state.subcatId,
      activation: state.activation,
      efeitos: state.efeitos.map(stripRuntime),
      redutores: state.redutores.map(stripRuntime),
      restricoes: state.restricoes.map(stripRuntime),
      tecnicas: state.tecnicas.map(t => ({ ...t, efeitos:t.efeitos.map(stripRuntime), restricoes:t.restricoes.map(stripRuntime), redutores:t.redutores.map(stripRuntime) }))
    };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hunter-legacy.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  });

  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try{
      const txt = await file.text();
      const data = JSON.parse(txt);
      // carrega
      Object.assign(state, {
        categoriaId: data.categoriaId ?? state.categoriaId,
        affMode: data.affMode ?? 'auto',
        affinities: data.affinities ?? null,
        subcatId: data.subcatId ?? state.subcatId,
        activation: data.activation ?? state.activation
      });
      state.efeitos = (data.efeitos||[]);
      state.redutores = (data.redutores||[]);
      state.restricoes = (data.restricoes||[]);
      state.tecnicas = (data.tecnicas||[]).map(t => ({...t, _id: uid()}));
      // redesenha MH lists
      $('#efeitosMH').innerHTML=''; state.efeitos.forEach(e => addRemovableTag($('#efeitosMH'), e, { emManifestacao:true, subcatId: state.subcatId }, null));
      $('#restricoesLista').innerHTML=''; state.restricoes.forEach(r => addRemovableTag($('#restricoesLista'), r, { emManifestacao:true, subcatId: state.subcatId }, null));
      $('#redutoresMH').innerHTML=''; state.redutores.forEach(d => addRemovableTag($('#redutoresMH'), d, { emManifestacao:true, subcatId: state.subcatId }, null));
      // redesenha técnicas
      $('#techList').innerHTML='';
      state.tecnicas.forEach(t => $('#techList').append(renderTecnicaCard(t)));
      recalcTodasTecnicas();
      recalcMH();
    }catch(err){
      alert('Falha ao importar: ' + err.message);
    } finally {
      e.target.value = '';
    }
  });
}

function stripRuntime(it){
  const { _id, tecnica, ...rest } = it || {};
  return rest;
}

// Boot
function boot(){
  mountCategorias();
  mountSubcats();
  mountEffectGroup();
  mountResRedPickers();
  bindMH();
  bindTecnicas();
  bindExport();
  recalcMH();
}

document.addEventListener('DOMContentLoaded', boot);
