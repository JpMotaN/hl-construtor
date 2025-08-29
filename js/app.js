// js/app.js — App principal (usar com <script type="module" src="./js/app.js">)

import { CATEGORIAS }      from '../data/categorias.js';
import { SUBCATEGORIAS }   from '../data/subcategorias.js';
import { EFEITOS }         from '../data/efeitos.js';
import { REDUTORES }       from '../data/redutores.js';
import { RESTRICOES }      from '../data/restricoes.js';
import * as E              from './engine.calcs.js';

console.log('app.js carregado', { CATEGORIAS, SUBCATEGORIAS });

// ====================== DOM ======================
const catRadios           = document.getElementById('catRadios');
const affinityEditor      = document.getElementById('affinityEditor');
const affinityGrid        = document.getElementById('affinityGrid');

const mhName              = document.getElementById('mhName');
const subcatSelect        = document.getElementById('subcatSelect');
const limitesTech         = document.getElementById('limitesTech');
const manifestActivation  = document.getElementById('manifestActivation');
const mhSaveBtn           = document.getElementById('mhSaveBtn');

const pvBaseEl            = document.getElementById('pvBase');
const pvAtuaisEl          = document.getElementById('pvAtuais');
const pvLimiteEl          = document.getElementById('pvLimite');
const pvEfeitosMH         = document.getElementById('pvEfeitosMH');
const pvReduzidoMH        = document.getElementById('pvReduzidoMH');
const pvLiquidoMH         = document.getElementById('pvLiquidoMH');
const pvWarn              = document.getElementById('pvWarn');

const restricaoPicker     = document.getElementById('restricaoPicker');
const addRestricaoBtn     = document.getElementById('addRestricao');
const restricoesLista     = document.getElementById('restricoesLista');
const totalStars          = document.getElementById('totalStars');
const affMit              = document.getElementById('affMit');

const efeitoGroup         = document.getElementById('efeitoGroup');
const efeitoPicker        = document.getElementById('efeitoPicker');
const efeitoPreview       = document.getElementById('efeitoPreview');
const addEfeitoBtn        = document.getElementById('addEfeito');
const efeitosMH           = document.getElementById('efeitosMH');

const redutorPicker       = document.getElementById('redutorPicker');
const addRedutorBtn       = document.getElementById('addRedutor');
const redutoresMH         = document.getElementById('redutoresMH');

const mhDesc              = document.getElementById('mhDesc');

// ====================== STATE ======================
const state = {
  affinitiesMode: 'auto',
  categoriaAtual: 'Aprimoramento',
  affinities: E.calcAutoAffinities('Aprimoramento'),
  manifest: {
    nome: '',
    subcatId: SUBCATEGORIAS[0]?.id || '',
    ativacao: 'acao-poder',
    efeitos: [],
    redutores: [],
    restricoes: []
  },
  techs: [],
  mhs: [] // lista para salvar múltiplas MHs (futuro)
};

// ====================== INIT ======================
initCategories();
initAffinityMode();
initSubcats();
initPickers();
renderAll();

function initCategories() {
  catRadios.innerHTML = CATEGORIAS.map(c => `
    <label class="chip">
      <input type="radio" name="mainCat" value="${c.nome}"
        ${c.nome === state.categoriaAtual ? 'checked' : ''} />
      ${c.nome}
    </label>
  `).join('');

  catRadios.addEventListener('change', (e) => {
    if (e.target.name === 'mainCat') {
      state.categoriaAtual = e.target.value;
      if (state.affinitiesMode === 'auto') {
        state.affinities = E.calcAutoAffinities(state.categoriaAtual);
      }
      renderAll();
    }
  });
}

function initAffinityMode() {
  document.querySelectorAll('input[name="affMode"]').forEach(r => {
    r.addEventListener('change', () => {
      state.affinitiesMode = document.querySelector('input[name="affMode"]:checked').value;
      affinityEditor.classList.toggle('hidden', state.affinitiesMode !== 'manual');
      if (state.affinitiesMode === 'auto') {
        state.affinities = E.calcAutoAffinities(state.categoriaAtual);
      }
      renderAll();
    });
  });
}

function renderAffinityEditor() {
  affinityGrid.innerHTML = CATEGORIAS.map(c => {
    return `
      <div>
        <label class="lbl">${c.nome}</label>
        <input type="number" min="0" max="100" step="20" value="${state.affinities[c.nome] || 0}" data-cat="${c.nome}" />
      </div>
    `;
  }).join('');

  affinityGrid.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      const cat = inp.dataset.cat;
      let v = parseInt(inp.value || '0', 10);
      v = Math.max(0, Math.min(100, v));
      state.affinities[cat] = v;
      renderAll();
    });
  });
}

function initSubcats() {
  subcatSelect.innerHTML = SUBCATEGORIAS.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
  if (!state.manifest.subcatId) {
    state.manifest.subcatId = SUBCATEGORIAS[0]?.id || '';
  }
  subcatSelect.value = state.manifest.subcatId;
  subcatSelect.addEventListener('change', () => {
    state.manifest.subcatId = subcatSelect.value;
    renderAll();
  });

  manifestActivation.addEventListener('change', () => {
    state.manifest.ativacao = manifestActivation.value;
    renderAll();
  });

  mhSaveBtn.addEventListener('click', () => {
    const nome = (mhName.value || '').trim();
    if (!nome) {
      alert('Dê um nome para a Manifestação.');
      return;
    }
    const snap = JSON.parse(JSON.stringify({ ...state.manifest, nome }));
    state.mhs.push(snap);
    alert(`Manifestação "${nome}" salva.`);
  });
}

function initPickers() {
  // Restrições
  restricaoPicker.innerHTML = RESTRICOES
    .map(r => `<option value="${r.id}">${r.nome}${r.stars ? ' ' + '★'.repeat(r.stars) : ''}</option>`)
    .join('');
  addRestricaoBtn.addEventListener('click', () => {
    const id = restricaoPicker.value;
    const def = RESTRICOES.find(r => r.id === id);
    const inst = E.materializeRestriction(def, { context: 'manifestacao' });
    state.manifest.restricoes.push(inst);
    renderAll();
  });

  // Grupos de efeitos
  const grupos = Array.from(new Set(EFEITOS.map(e => e.grupo).filter(Boolean))).sort();
  efeitoGroup.innerHTML = `<option value="">(todos)</option>` + grupos.map(g => `<option>${g}</option>`).join('');
  efeitoGroup.addEventListener('change', renderEfeitoOptions);

  // Efeitos
  renderEfeitoOptions();
  efeitoPicker.addEventListener('change', updateEfeitoPreview);
  addEfeitoBtn.addEventListener('click', () => {
    const id = efeitoPicker.value;
    const def = EFEITOS.find(e => e.id === id);
    const inst = E.materializeEffect(def, { context: 'manifestacao' });
    state.manifest.efeitos.push(inst);
    renderAll();
  });

  // Redutores
  redutorPicker.innerHTML = REDUTORES
    .filter(r => !r.aplica || r.aplica.includes('manifestacao'))
    .map(r => `<option value="${r.id}">${r.nome}</option>`)
    .join('');
  addRedutorBtn.addEventListener('click', () => {
    const id = redutorPicker.value;
    const def = REDUTORES.find(r => r.id === id);
    const inst = E.materializeReducer(def, { context: 'manifestacao' });
    state.manifest.redutores.push(inst);
    renderAll();
  });
}

function renderEfeitoOptions() {
  const group = efeitoGroup.value;
  const list = EFEITOS
    .filter(e => !e.aplica || e.aplica.includes('manifestacao'))
    .filter(e => !group || e.grupo === group);

  efeitoPicker.innerHTML = list.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
  updateEfeitoPreview();
}

function updateEfeitoPreview() {
  const id = efeitoPicker.value;
  const def = EFEITOS.find(e => e.id === id);
  if (!def) { efeitoPreview.textContent = '—'; return; }
  const inst = E.materializeEffect(def, { context: 'manifestacao' });
  const pv = Number(inst._pv || 0);
  efeitoPreview.textContent = (pv >= 0 ? '+' : '') + pv + ' PV';
}

// ====================== RENDERERS ======================
function renderPV() {
  state.manifest.nome = (mhName.value || '').trim();
  const calc = E.validatePV(state.manifest);

  pvBaseEl.textContent   = calc.base;
  pvAtuaisEl.textContent = calc.disponiveis;
  pvLimiteEl.textContent = calc.limite;

  pvEfeitosMH.textContent  = calc.pvDetalhe.efeitos;
  pvReduzidoMH.textContent = calc.pvDetalhe.reduzido;
  pvLiquidoMH.textContent  = calc.pvDetalhe.liquido;

  pvWarn.className = 'muted ' + (calc.errs.length ? 'bad' : '');
  pvWarn.textContent = calc.errs.join(' ');
}

function renderSubcatInfo() {
  const lim = E.subcatTechniqueLimits(state.manifest);
  limitesTech.textContent =
    `Comuns: até ${lim.comumMax}` +
    (lim.comumExtraTreinavel ? ` (treináveis +${lim.comumExtraTreinavel})` : '') +
    ` · Auxiliares: até ${lim.auxMax}` +
    (lim.auxExtraTreinavel ? ` (treináveis +${lim.auxExtraTreinavel})` : '');
}

function renderRestricoes() {
  const stars = (state.manifest.restricoes || []).reduce((a, r) => a + (r.stars || 0), 0);
  totalStars.textContent = stars;
  affMit.textContent = `${stars} PA`;

  restricoesLista.innerHTML = (state.manifest.restricoes || []).map((r, i) => `
    <div class="tag">
      <div><b>${r.nome}</b> ${r.stars ? '· ' + '★'.repeat(r.stars) : ''}</div>
      ${typeof r._pv === 'number' ? `<div class="ok">${r._pv} PV</div>` : ''}
      <div class="x" data-k="restricoes" data-i="${i}">×</div>
    </div>
  `).join('');

  restricoesLista.querySelectorAll('.x').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.i;
      state.manifest.restricoes.splice(i, 1);
      renderAll();
    });
  });
}

function renderEffRedLists() {
  efeitosMH.innerHTML = (state.manifest.efeitos || []).map((e, i) => `
    <div class="tag">
      <div><b>${e.nome}</b></div>
      ${typeof e._pv === 'number' ? `<div class="warn">+${e._pv} PV</div>` : ''}
      <div class="x" data-k="efeitos" data-i="${i}">×</div>
    </div>
  `).join('');

  redutoresMH.innerHTML = (state.manifest.redutores || []).map((r, i) => `
    <div class="tag">
      <div><b>${r.nome}</b></div>
      ${typeof r._pv === 'number' ? `<div class="ok">${r._pv} PV</div>` : ''}
      <div class="x" data-k="redutores" data-i="${i}">×</div>
    </div>
  `).join('');

  [...efeitosMH.querySelectorAll('.x'), ...redutoresMH.querySelectorAll('.x')].forEach(btn => {
    btn.addEventListener('click', () => {
      const arr = btn.dataset.k === 'efeitos' ? state.manifest.efeitos : state.manifest.redutores;
      const i = +btn.dataset.i;
      arr.splice(i, 1);
      renderAll();
    });
  });
}

function renderAll() {
  if (state.affinitiesMode === 'manual') renderAffinityEditor();
  renderSubcatInfo();
  renderRestricoes();
  renderEffRedLists();
  renderPV();
}
