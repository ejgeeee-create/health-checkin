/* ============================================================
   Daily Check-in — app logic
   Everything is driven by the field arrays below: the form,
   storage, and CSV export all derive from them. To add or
   remove a field, edit ONE array entry here and you're done.
   ============================================================ */

// ---- field config ----
const STATE_FIELDS = [
  { key: 'energy',  label: 'Energy',  opts: ['low', 'mid', 'high'] },
  { key: 'sleep',   label: 'Sleep',   opts: ['solid', 'disturbed', 'insomnia'] },
  { key: 'mood',    label: 'Mood',    opts: ['low', 'neutral', 'high'] },
  { key: 'fueling', label: 'Fueling', opts: ['under', 'ok', 'well'] },
];
const BODY_FIELDS = [
  { key: 'migraine', label: 'Migraine', opts: ['none', 'prodrome', 'full'] },
  { key: 'bleeding', label: 'Bleeding', opts: ['none', 'light', 'heavy'] },
  { key: 'exertion', label: 'Exertion', opts: ['low', 'mid', 'high'] },
];
const STATE_TAGS = ['calm', 'anxious', 'irritable', 'blue', 'foggy', 'tense', 'wired', 'low motivation'];
const EX_TYPES = ['physical', 'cognitive', 'emotional'];
const SUPPLEMENTS = ['Dig Enz', 'Fish Oil', 'LPC-DHA', 'Vit E', 'B Complex', 'Ribo', 'B6', 'Magtein', 'Mag Break', 'D3/K2', 'Zinc/Sel', 'GlyNAC', 'Probiotics', 'Choline', 'Creatine', 'Lithium', 'Curcumin', 'Electrolytes'];
const CHIPS = ['afternoon crash', 'muscle / neck pain', 'bloating', 'diarrhea', 'constipation', 'breast tenderness', 'ovulation pain', 'cramps', 'night sweats', 'high sex drive', 'Nurtec taken', 'alcohol', 'elimination dev', 'med change', 'unusual stress'];

const STORAGE_KEY = 'ht_entries_v1';

// ---- state ----
let entries = {};
let entry = null;       // in-progress entry for today
let elapsed = 0;        // seconds of the last submit
let checkinStart = 0;

// ---- date helpers ----
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayKey = () => keyOf(new Date());

// ---- persistence (clean slate: no seed data, ever) ----
function load() {
  try { entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
  catch (e) { entries = {}; }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch (e) {}
}

function blankEntry() {
  const existing = entries[todayKey()];
  if (existing) return JSON.parse(JSON.stringify(existing));
  return { scales: {}, stateTags: [], exTypes: [], supps: [], chips: [], note: '' };
}

// ---- derived ----
function computeStreak() {
  let n = 0;
  const d = new Date();
  if (!entries[keyOf(d)]) d.setDate(d.getDate() - 1); // today not logged → count back from yesterday
  while (entries[keyOf(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function avgLogSecs() {
  const secs = Object.values(entries).map((e) => e.secs).filter(Boolean);
  if (!secs.length) return null;
  return Math.round(secs.reduce((a, b) => a + b, 0) / secs.length);
}

// ---- DOM helpers ----
const $ = (id) => document.getElementById(id);
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---- navigation ----
const VIEWS = ['home', 'checkin', 'submitted', 'history'];
let view = 'home';

function show(next) {
  view = next;
  VIEWS.forEach((v) => $('view-' + v).classList.toggle('active', v === next));
  if (next === 'home') renderHome();
  if (next === 'checkin') renderCheckin();
  if (next === 'submitted') renderSubmitted();
  if (next === 'history') renderHistory();
}

function goCheckin() {
  checkinStart = Date.now();
  entry = blankEntry();
  show('checkin');
  $('checkin-body').scrollTop = 0;
}

// Deep link: /#checkin opens straight to the form (used by the
// 8:30 PM iOS Shortcuts automation), /#history to history.
function routeFromHash() {
  const h = location.hash.replace('#', '');
  if (h === 'checkin') goCheckin();
  else if (h === 'history') show('history');
  else show('home');
}

// ---- render: home ----
function renderHome() {
  const now = new Date();
  $('home-weekday').textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
  $('home-date').textContent = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  $('stat-streak').textContent = computeStreak();
  const avg = avgLogSecs();
  $('stat-avg').textContent = avg === null ? '–' : avg + 's';

  renderWeekStrip($('home-week'), true);

  const logged = !!entries[todayKey()];
  const dot = $('status-dot');
  dot.className = 'status-dot ' + (logged ? 'done' : 'pending');
  $('status-text').textContent = logged ? "Today's logged — you're done" : "Today isn't logged yet";

  const btn = $('btn-log');
  btn.textContent = logged ? 'Edit today' : 'Log today';
  btn.className = 'btn-primary' + (logged ? ' quiet' : '');
}

function renderWeekStrip(container, withLabels) {
  container.innerHTML = '';
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = keyOf(d) === keyOf(now);
    const isFuture = d > now && !isToday;
    const logged = !!entries[keyOf(d)];
    const cls = logged ? 'logged' : isToday ? 'today' : isFuture ? 'future' : 'gap';
    const dot = el('span', 'dot ' + cls);
    if (withLabels) {
      const day = el('div', 'day');
      day.appendChild(el('span', 'day-label' + (isToday ? ' today' : ''), labels[i]));
      day.appendChild(dot);
      container.appendChild(day);
    } else {
      container.appendChild(dot);
    }
  }
}

// ---- render: check-in ----
function renderCheckin() {
  $('checkin-date').textContent = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  renderScales($('state-scales'), STATE_FIELDS);
  renderScales($('body-scales'), BODY_FIELDS);
  renderPills($('state-tags'), STATE_TAGS, 'stateTags');
  renderPills($('ex-types'), EX_TYPES, 'exTypes');
  renderPills($('supplements'), SUPPLEMENTS, 'supps');
  renderPills($('chips'), CHIPS, 'chips');
  $('note').value = entry.note || '';
  $('btn-submit').textContent = entries[todayKey()] ? 'Update today' : 'Log today';
}

function renderScales(container, fields) {
  container.innerHTML = '';
  fields.forEach((f) => {
    const row = el('div', 'scale-row');
    row.appendChild(el('span', 'scale-label', f.label));
    const group = el('div', 'seg-group');
    f.opts.forEach((o) => {
      const seg = el('button', 'seg' + (entry.scales[f.key] === o ? ' selected' : ''), o);
      seg.type = 'button';
      seg.addEventListener('click', () => {
        entry.scales[f.key] = entry.scales[f.key] === o ? undefined : o;
        renderScales(container, fields);
      });
      group.appendChild(seg);
    });
    row.appendChild(group);
    container.appendChild(row);
  });
}

function renderPills(container, list, prop) {
  container.innerHTML = '';
  list.forEach((label) => {
    const selected = (entry[prop] || []).includes(label);
    const pill = el('button', 'pill' + (selected ? ' selected' : ''), label);
    pill.type = 'button';
    pill.addEventListener('click', () => {
      const cur = entry[prop] || [];
      entry[prop] = selected ? cur.filter((c) => c !== label) : [...cur, label];
      renderPills(container, list, prop);
    });
    container.appendChild(pill);
  });
}

function submit() {
  entry.note = $('note').value;
  const secs = checkinStart ? Math.round((Date.now() - checkinStart) / 1000) : 0;
  entries[todayKey()] = { ...entry, secs };
  persist();
  elapsed = secs;
  show('submitted');
}

// ---- render: submitted ----
function renderSubmitted() {
  const now = new Date();
  $('submitted-title').textContent = 'Logged in ' + elapsed + 's';
  $('submitted-sub').textContent =
    now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) +
    ' saved · streak now ' + computeStreak();
  renderWeekStrip($('submitted-week'), false);
}

// ---- render: history ----
function renderHistory() {
  const now = new Date();
  $('history-month').textContent = now.toLocaleDateString('en-US', { month: 'long' });

  const monthPrefix = now.getFullYear() + '-' + pad(now.getMonth() + 1);
  const loggedInMonth = Object.keys(entries).filter((k) => k.startsWith(monthPrefix)).length;
  $('history-summary').textContent = loggedInMonth + ' of ' + now.getDate() + ' days logged';

  renderCalendar(now);
  renderEnergyBars();
}

function renderCalendar(now) {
  const grid = $('calendar');
  grid.innerHTML = '';
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d) => grid.appendChild(el('span', 'cal-head', d)));
  const y = now.getFullYear(), m = now.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first offset
  const days = new Date(y, m + 1, 0).getDate();
  for (let i = 0; i < lead; i++) grid.appendChild(el('span', 'cell blank'));
  for (let day = 1; day <= days; day++) {
    const logged = !!entries[keyOf(new Date(y, m, day))];
    const cls = logged ? 'logged' : day === now.getDate() ? 'today' : day > now.getDate() ? 'future' : 'gap';
    grid.appendChild(el('span', 'cell ' + cls));
  }
}

function renderEnergyBars() {
  const container = $('energy-bars');
  container.innerHTML = '';
  const keys = Object.keys(entries).sort().slice(-14);
  if (!keys.length) {
    container.appendChild(el('span', 'trend-empty', 'No days logged yet'));
    return;
  }
  const heights = { low: 33, mid: 66, high: 100 };
  keys.forEach((k) => {
    const h = heights[entries[k].scales.energy] || 33;
    const bar = el('span', 'bar' + (h >= 100 ? ' hot' : ''));
    bar.style.height = h + '%';
    container.appendChild(bar);
  });
}

// ---- CSV export ----
function buildCsv() {
  const keys = Object.keys(entries).sort();
  const cols = STATE_FIELDS.concat(BODY_FIELDS).map((f) => f.key);
  const quote = (list) => '"' + (list || []).join('; ') + '"';
  const rows = [['date', ...cols, 'mood_state', 'exertion_type', 'supplements', 'symptoms', 'note'].join(',')];
  keys.forEach((k) => {
    const e = entries[k];
    rows.push([
      k,
      ...cols.map((c) => e.scales[c] || ''),
      quote(e.stateTags), quote(e.exTypes), quote(e.supps), quote(e.chips),
      '"' + (e.note || '').replace(/"/g, '""') + '"',
    ].join(','));
  });
  return rows.join('\n');
}

async function exportData() {
  const keys = Object.keys(entries);
  if (!keys.length) {
    $('export-hint').textContent = 'Nothing to export yet — log your first day';
    return;
  }
  const csv = buildCsv();
  const file = new File([csv], 'symptoms.csv', { type: 'text/csv' });

  // On iOS the share sheet is the reliable path (and drops straight
  // into the Claude app); fall back to a plain download elsewhere.
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      $('export-hint').textContent = keys.length + ' days exported → symptoms.csv';
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled the sheet
    }
  }
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'symptoms.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('export-hint').textContent = keys.length + ' days exported → symptoms.csv';
}

// ---- wire up ----
function init() {
  load();

  $('btn-log').addEventListener('click', goCheckin);
  $('btn-history').addEventListener('click', () => show('history'));
  $('btn-submit').addEventListener('click', submit);
  $('btn-export').addEventListener('click', exportData);
  document.querySelectorAll('[data-nav]').forEach((b) =>
    b.addEventListener('click', () => show(b.dataset.nav))
  );

  window.addEventListener('hashchange', routeFromHash);
  routeFromHash();

  // Re-render when returning to the app on a new day (or after midnight)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && view === 'home') renderHome();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
