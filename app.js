const tg = window.Telegram?.WebApp;
const inTg = !!tg?.initData;
const $ = s => document.querySelector(s);

/* ---------- данные программы ---------- */
const EX = {
  legpress: {n:'Жим ногами',            g:'Ноги',   img:'Leg_Press', v:['tjLlHGjfvTk','ТВОЙ ТРЕНЕР · 6:37'],              sets:3, r:[10,12], step:5,   note:'В тренажёре (Leg Press). Не нагружает спину, даёт отличную базу ногам.'},
  dbpress:  {n:'Жим гантелей лёжа',     g:'Грудь',  img:'Dumbbell_Bench_Press', v:[null,'Поиск на YouTube'],   sets:3, r:[8,10],  step:2, note:'На горизонтальной скамье. Работают грудь и трицепс.'},
  pulldown: {n:'Тяга верхнего блока',   g:'Спина',  img:'Wide-Grip_Lat_Pulldown', v:['GTs3xqB_ZgQ','Ilya Generalov · 1:16'], sets:3, r:[10,12], step:2.5, note:'К груди (Lat Pulldown). Формирует широкую спину.'},
  shoulder: {n:'Жим гантелей сидя',     g:'Плечи',  img:'Dumbbell_Shoulder_Press', v:['gVoVKUmyXVQ','Geography Fitness · 1:27'],sets:3, r:[10,10], step:2,   note:'Вверх (Shoulder Press). Качает плечи.'},
  abs:      {n:'Скручивания',           g:'Пресс',  img:'Crunches', v:['H8xSHCAjM-I','Олександр Попенко · 0:57'],               sets:3, r:[15,15], step:1,   note:'Любые скручивания на пресс. Вес — только если добавляешь отягощение.'},
  legcurl:  {n:'Румынская тяга с гантелями', g:'Ноги', img:'Stiff-Legged_Dumbbell_Deadlift', v:[null,'Поиск на YouTube'], sets:3, r:[8,10], step:2, note:'Спина прямая, гантели скользят вдоль ног, таз уходит назад. Задняя поверхность бедра и ягодицы.'},
  incline:  {n:'Жим гантелей на наклонной', g:'Грудь', img:'Incline_Dumbbell_Press', v:[null,'Поиск на YouTube'], sets:3, r:[8,10],  step:2, note:'Скамья под небольшим углом (Incline Press). Верхняя часть груди.'},
  row:      {n:'Тяга гантели одной рукой', g:'Спина', img:'One-Arm_Dumbbell_Row', v:['mXh-Ogf3V4Y','IRON & WATER · 1:47'], sets:3, r:[10,12], step:2, note:'В наклоне с упором на скамью. Толщина спины и осанка. Подход = обе руки по очереди с одним весом.'},
  lateral:  {n:'Махи гантелями в стороны', g:'Плечи', img:'Side_Lateral_Raise', v:['Q3j7XYxrJtk','Ilya Generalov · 0:45'],   sets:3, r:[12,15], step:1,   note:'Стоя (Lateral Raises). Делает плечи визуально шире.'},
  biceps:   {n:'Подъём на бицепс',      g:'Бицепс', img:'Dumbbell_Bicep_Curl', v:['gi3lslo1hoI','Make Fitness · 1:20'],    sets:2, r:[10,12], step:1,   note:'Гантели.'},
  hammer:   {n:'Молотки',               g:'Бицепс', img:'Hammer_Curls', v:['Pd4WUV-boGA','Техника и нюансы'],         sets:2, r:[10,12], step:1,   note:'Гантели нейтральным хватом (ладони смотрят друг на друга), локти прижаты. Бицепс, брахиалис и предплечье.'},
  french:   {n:'Французский жим',       g:'Трицепс', img:'EZ-Bar_Skullcrusher', v:['PxSg9Iy98q0','Geography Fitness · 1:28'], sets:3, r:[10,12], step:2.5, note:'Лёжа, EZ-гриф или гантели. Локти смотрят в потолок и не разъезжаются. Работает трицепс.'},
};
const DAYS = {
  A: {title:'Понедельник', ex:['legcurl','dbpress','pulldown','shoulder','row','french','hammer','abs']},
  B: {title:'Пятница', ex:['legpress','incline','row','lateral','french','biceps','abs']},
};
const RESTS = [120,150,180];

/* ---------- хранилище: Telegram CloudStorage + localStorage-кэш ---------- */
const cloud = inTg && tg.isVersionAtLeast('6.9') ? tg.CloudStorage : null;
const call = (m, ...a) => new Promise((ok, no) => cloud[m](...a, (e, v) => e ? no(e) : ok(v)));
const lsGet = k => { try { return localStorage.getItem('wt:' + k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem('wt:' + k) : localStorage.setItem('wt:' + k, v); } catch {} };

const db = {s: {}, w: {}, prefs: {rest: 150}};

// CloudStorage принимает ключи только [A-Za-z0-9_-] до 16 символов, поэтому "s:2026-10-05:A" туда не пишется
const toCloud = k => k.startsWith('s:') ? 's' + k.slice(2).replace(/-/g, '').replace(':', '')
  : k.startsWith('weight:') ? 'w' + k.slice(7).replace(/-/g, '') : k;
const fromCloud = k => {
  let m;
  if ((m = /^s(\d{4})(\d{2})(\d{2})([A-Z])$/.exec(k))) return `s:${m[1]}-${m[2]}-${m[3]}:${m[4]}`;
  if ((m = /^w(\d{4})(\d{2})(\d{2})$/.exec(k))) return `weight:${m[1]}-${m[2]}-${m[3]}`;
  return k === 'prefs' ? k : null;
};

async function load() {
  const local = {}, remote = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('wt:')) local[k.slice(3)] = localStorage.getItem(k);
    }
  } catch {}
  try {
    if (cloud) {
      const keys = await call('getKeys'), raw = {};
      for (let i = 0; i < keys.length; i += 40) Object.assign(raw, await call('getItems', keys.slice(i, i + 40)));
      for (const [k, v] of Object.entries(raw)) { const lk = fromCloud(k); if (lk && v) remote[lk] = v; }
    }
  } catch {}
  const all = {...local, ...remote};
  for (const [k, v] of Object.entries(all)) {
    if (k === 'rest') continue;
    if (cloud && remote[k] == null) call('setItem', toCloud(k), v).catch(() => {}); // дозаливаем локальное в облако
    if (local[k] !== v) lsSet(k, v);
    try {
      if (k === 'prefs') Object.assign(db.prefs, JSON.parse(v));
      else if (k.startsWith('s:')) db.s[k] = JSON.parse(v);
      else if (k.startsWith('weight:')) db.w[k.slice(7)] = JSON.parse(v);
    } catch {}
  }
}

function save(k, v) {
  const s = v == null ? null : JSON.stringify(v);
  lsSet(k, s);
  if (cloud) (s == null ? call('removeItem', toCloud(k)) : call('setItem', toCloud(k), s)).catch(() => {});
}

/* ---------- утилиты ---------- */
const iso = d => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const today = () => iso(new Date());
const fmtDate = s => new Date(s + 'T12:00').toLocaleDateString('ru-RU', {weekday: 'short', day: 'numeric', month: 'short'});
const fmt = n => String(Math.round(n * 100) / 100);
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const rng = e => e.r[0] === e.r[1] ? e.r[0] : `${e.r[0]}–${e.r[1]}`;
const setTxt = ([w, r]) => w ? `${fmt(w)}×${r}` : `${r}`;
const hap = t => tg?.HapticFeedback?.impactOccurred(t);

const svg = p => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ic = {
  left: svg('<path d="m15 18-6-6 6-6"/>'),
  right: svg('<path d="m9 18 6-6-6-6"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  dumb: svg('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>'),
  play: svg('<path d="m8 5 11 7-11 7z"/>'),
  timer: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>'),
  chart: svg('<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  scale: svg('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 15.5v-3.5l3-2"/><circle cx="12" cy="15.5" r=".5" fill="currentColor"/>'),
};

/* ---------- сессии и прогрессия ---------- */
const allSess = () => Object.values(db.s).sort((a, b) => b.date.localeCompare(a.date));
const sessKey = (date, day) => `s:${date}:${day}`;
const todaySets = (day, id) => db.s[sessKey(today(), day)]?.ex[id] || [];
const lastFor = id => allSess().find(s => s.date < today() && s.ex[id]?.length)?.ex[id];

// план на подход i по прошлой тренировке: все подходы на максимуме повторений → +вес
function plan(id, i) {
  const e = EX[id], last = lastFor(id);
  if (!last) return {last: null, w: 0, r: e.r[0]};
  const w = last[last.length - 1][0];
  if (last.length >= e.sets && last.every(x => x[1] >= e.r[1])) return {last, up: true, w: w + e.step, r: e.r[0]};
  return {last, w, r: Math.min(e.r[1], (last[i] || last[last.length - 1])[1] + 1)};
}
function suggest(day, id) {
  const cur = todaySets(day, id);
  if (cur.length) return {w: cur.at(-1)[0], r: cur.at(-1)[1]};
  const p = plan(id, 0);
  return {w: p.w, r: p.r};
}
function best(sets) {
  const w = Math.max(...sets.map(x => x[0]));
  return {w, reps: sets.filter(x => x[0] === w).reduce((a, x) => a + x[1], 0)};
}
function delta(date, id, sets) {
  const prev = allSess().find(s => s.date < date && s.ex[id]);
  if (!prev) return '';
  const a = best(sets), b = best(prev.ex[id]);
  if (a.w !== b.w) return `<span class="d ${a.w > b.w ? 'up' : ''}">${a.w > b.w ? '+' : '−'}${fmt(Math.abs(a.w - b.w))} кг</span>`;
  if (a.reps !== b.reps) return `<span class="d ${a.reps > b.reps ? 'up' : ''}">${a.reps > b.reps ? '+' : '−'}${Math.abs(a.reps - b.reps)} повт.</span>`;
  return '<span class="d">=</span>';
}

/* ---------- лестница до повышения веса ---------- */
function ladder(id, sets) {
  const e = EX[id], sum = sets.reduce((a, x) => a + x[1], 0), lo = e.sets * e.r[0], hi = e.sets * e.r[1];
  const up = sets.length >= e.sets && sets.every(x => x[1] >= e.r[1]);
  const pct = up ? 1 : hi > lo ? Math.max(0, Math.min(1, (sum - lo) / (hi - lo))) : Math.min(1, sum / hi);
  return {up, pct, left: Math.max(0, hi - sum)};
}
const ladderHtml = (id, sets) => {
  const l = ladder(id, sets);
  return `<div class="bar2"><i style="width:${Math.round(l.pct * 100)}%"></i></div>
    <div class="sub">${l.up ? 'Все подходы на максимуме — пора добавить вес' : `Ещё ${l.left} повт. до повышения веса`}</div>`;
};
function spark(vals, W = 72, H = 28, label = 'Динамика нагрузки') {
  if (vals.length < 2) return '';
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const y = v => mx === mn ? H / 2 : H - 2 - (v - mn) / (mx - mn) * (H - 4);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1) * (W - 4) + 2).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${label}"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const weekStart = d => { const m = new Date(d); m.setDate(m.getDate() - (m.getDay() + 6) % 7); return iso(m); };
const ago = n => iso(new Date(Date.now() - n * 864e5));
const wDiff = (a, b) => a != null && b != null ? Math.round((a - b) * 10) / 10 : null;
const wDiffTxt = v => v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v))} кг`;

/* ---------- таймер отдыха ---------- */
let rest = null, ac = null;
try { rest = JSON.parse(lsGet('rest')); } catch {}
if (rest && Date.now() - rest.end > 600000) rest = null;
const saveRest = () => lsSet('rest', rest && JSON.stringify(rest));

function startRest(sec = db.prefs.rest, label = 'Отдых') {
  const t = sec * 1000;
  rest = {end: Date.now() + t, total: t, done: false, label};
  saveRest();
}
function ding() {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    [0, .25, .5].forEach(t => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = 880; g.gain.value = .15;
      o.connect(g); g.connect(ac.destination);
      o.start(ac.currentTime + t); o.stop(ac.currentTime + t + .15);
    });
  } catch {}
  tg?.HapticFeedback?.notificationOccurred('success');
  navigator.vibrate?.([200, 100, 200]);
}
function tick() {
  if (!rest) return;
  const left = Math.max(0, Math.ceil((rest.end - Date.now()) / 1000));
  if (left === 0 && !rest.done) { rest.done = true; saveRest(); ding(); }
  $('#rtime') && ($('#rtime').textContent = mmss(left));
  $('#rl') && ($('#rl').textContent = rest.done ? (rest.label === 'Разминка' ? 'Разминка готова' : 'Пора работать') : rest.label);
  $('#rest')?.classList.toggle('done', rest.done);
  $('#rbar') && ($('#rbar').style.transform = `scaleX(${Math.min(1, 1 - (rest.end - Date.now()) / rest.total)})`);
}
const timerHtml = () => !rest ? '' : `
  <div class="rest" id="rest" role="timer">
    <div class="rt">
      <div><div class="sub" id="rl">${rest.label || 'Отдых'}</div><div class="time" id="rtime">0:00</div></div>
      <div class="rbtns">
        <button data-a="rest" data-d="-15" aria-label="Минус 15 секунд">−15</button>
        <button data-a="rest" data-d="15" aria-label="Плюс 15 секунд">+15</button>
        <button data-a="skip" aria-label="Закрыть таймер">${ic.x}</button>
      </div>
    </div>
    <div class="prog"><i id="rbar"></i></div>
  </div>`;

/* ---------- навигация ---------- */
let nav = [{v: 'home'}];
const here = () => nav[nav.length - 1];
const ui = {cur: {w: 0, r: 0}, cal: new Date(new Date().getFullYear(), new Date().getMonth(), 1)};
const go = (v, p = {}) => { nav.push({v, ...p}); render(); };
const back = () => { if (nav.length > 1) { nav.pop(); render(); } };
const tab = v => { nav = [{v}]; render(); };
function openEx(day, id, replace) {
  ui.cur = suggest(day, id);
  if (replace) { nav[nav.length - 1] = {v: 'ex', day, id}; render(); } else go('ex', {day, id});
}

/* ---------- экраны ---------- */
const tabsHtml = cur => `<nav class="tabs">
  <button data-a="tab" data-v="home" ${cur === 'home' ? 'aria-current="page"' : ''}>${ic.dumb}<span>Тренировки</span></button>
  <button data-a="tab" data-v="progress" ${cur === 'progress' ? 'aria-current="page"' : ''}>${ic.chart}<span>Прогресс</span></button>
  <button data-a="tab" data-v="weight" ${cur === 'weight' ? 'aria-current="page"' : ''}>${ic.scale}<span>Вес</span></button>
</nav>`;
const backBtn = () => inTg ? '' : `<button class="icon back" data-a="back" aria-label="Назад">${ic.left}</button>`;

const V = {};

function calendarHtml() {
  const days = new Set(allSess().map(s => s.date)), t = today();
  const y = ui.cal.getFullYear(), m = ui.cal.getMonth(), n = new Date(y, m + 1, 0).getDate(), off = (new Date(y, m, 1).getDay() + 6) % 7;
  const cells = '<i></i>'.repeat(off) + Array.from({length: n}, (_, i) => {
    const d = iso(new Date(y, m, i + 1));
    return `<span class="cd ${days.has(d) ? 'on' : ''} ${d === t ? 'now' : ''}">${days.has(d) ? ic.check : i + 1}</span>`;
  }).join('');
  const cnt = [...days].filter(d => d.startsWith(iso(ui.cal).slice(0, 7))).length;
  return `<div class="cal"><div class="ch">
      <button class="icon" data-a="cal" data-d="-1" aria-label="Предыдущий месяц">${ic.left}</button>
      <div class="grow"><b>${ui.cal.toLocaleDateString('ru-RU', {month: 'long', year: 'numeric'})}</b><span class="sub">Тренировок: ${cnt}</span></div>
      <button class="icon" data-a="cal" data-d="1" aria-label="Следующий месяц">${ic.right}</button></div>
    <div class="cg">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(x => `<span class="cw">${x}</span>`).join('')}${cells}</div></div>`;
}

V.home = () => {
  const dow = new Date().getDay(), sug = dow === 1 ? 'A' : dow === 5 ? 'B' : null;
  const cards = Object.entries(DAYS).map(([k, d]) => {
    const last = allSess().find(s => s.day === k);
    return `<button class="wcard" data-a="day" data-day="${k}">
      <span class="grow"><span class="wt">${d.title}${k === sug ? '<span class="chip">Сегодня</span>' : ''}</span>
        <span class="sub">Разминка + ${d.ex.length} упражнений</span>
        <span class="sub">${last ? 'Последняя: ' + fmtDate(last.date) : 'Ещё не было'}</span></span>
      ${ic.right}</button>`;
  }).join('');
  return [`<div class="head"><div class="eyebrow">${fmtDate(today())}</div><h1>Тренировки</h1></div>${cards}${calendarHtml()}`, tabsHtml('home')];
};

V.done = ({day}) => {
  const s = db.s[sessKey(today(), day)], sets = s ? Object.values(s.ex).flat() : [];
  const vol = sets.reduce((a, [w, r]) => a + w * r, 0);
  return [`<div class="donev"><div class="big">${ic.check}</div><h1>Готово!</h1>
    <p class="sub" style="margin:4px 0 24px">${DAYS[day].title} · тренировка завершена</p>
    <div class="stats"><div class="stat"><b>${Object.keys(s?.ex || {}).length}</b><span class="sub">упражнений</span></div>
      <div class="stat"><b>${sets.length}</b><span class="sub">подходов</span></div>
      <div class="stat"><b>${vol ? Math.round(vol) : '—'}</b><span class="sub">кг тоннаж</span></div></div>
    <p class="sub">Отдыхай и ешь. Следующая тренировка — по плану.</p></div>`,
    `<div class="bar"><button class="btn" data-a="tab" data-v="home">На главную</button></div>`];
};

V.workout = ({day}) => {
  const d = DAYS[day];
  const rows = d.ex.map(id => {
    const e = EX[id], n = todaySets(day, id).length, ok = n >= e.sets;
    return `<button class="ex" data-a="ex" data-day="${day}" data-id="${id}">
      <span class="thumb"><img src="img/${e.img}-0.jpg" alt="" loading="lazy"></span>
      <span class="grow"><span class="nm">${e.n}</span><span class="sub">${e.sets} × ${rng(e)} · ${e.g}</span></span>
      <span class="cnt ${ok ? 'ok' : ''}">${ok ? ic.check : n + '/' + e.sets}</span></button>`;
  }).join('');
  const warm = `<button class="ex" data-a="warm" data-day="${day}">
      <span class="thumb warm">${ic.timer}</span>
      <span class="grow"><span class="nm">Разминка</span><span class="sub">5 минут · суставная гимнастика</span></span>${ic.right}</button>`;
  return [`${backBtn()}<div class="head"><h1>${d.title}</h1></div>${warm}${rows}`, ''];
};

V.warmup = ({day}) => [`${backBtn()}
  <div class="head"><div class="eyebrow">${DAYS[day].title}</div><h1>Разминка</h1></div>
  <p>5 минут суставной гимнастики:</p>
  <ul class="wlist"><li>Покрути руками и плечами</li><li>Покрути коленями и тазом</li><li>Наклоны и повороты корпуса</li></ul>
  <p class="sub" style="margin:12px 0 20px">Перед первым упражнением сделай 1–2 разминочных подхода с очень лёгким весом.</p>
  <button class="btn" style="width:100%" data-a="startwarm">${ic.timer}Запустить таймер 5:00</button>`,
  `<div class="bar"><button class="btn" data-a="next">К упражнениям${ic.right}</button></div>`];

V.ex = ({day, id}) => {
  const e = EX[id], list = DAYS[day].ex, idx = list.indexOf(id), cur = todaySets(day, id);
  const p = plan(id, cur.length);
  const hint = !p.last
    ? `Первый раз: начни с лёгкого веса — после ${e.r[0]} повторов должно остаться 2–3 в запасе. Если легко, добавь вес в следующем подходе.`
    : `Прошлый раз: ${p.last.map(setTxt).join(' · ')}<br>${p.up
        ? `<b>Пора добавить вес: ${fmt(p.w)} кг × ${p.r}</b>`
        : `Цель: <b>${p.w ? fmt(p.w) + ' кг × ' : ''}${p.r} повт.</b>`}${ladderHtml(id, p.last)}`;
  let sets = '';
  for (let i = 0; i < Math.max(e.sets, cur.length); i++) {
    sets += cur[i]
      ? `<div class="set done"><span class="ck">${ic.check}</span><span class="grow">${cur[i][0] ? fmt(cur[i][0]) + ' кг × ' + cur[i][1] : cur[i][1] + ' повт.'}</span>
         <button class="icon" data-a="del" data-i="${i}" aria-label="Удалить подход ${i + 1}">${ic.x}</button></div>`
      : `<div class="set ${i === cur.length ? 'now' : ''}"><span class="n">${i + 1}</span><span class="grow">${i === cur.length ? 'Текущий подход' : '—'}</span></div>`;
  }
  const reached = cur.length >= e.sets, last = idx === list.length - 1;
  const stepper = (k, label, v) => `<div class="field"><label for="in-${k}">${label}</label><div class="stepper">
    <button data-a="step" data-k="${k}" data-d="-1" aria-label="Меньше: ${label}">${ic.minus}</button>
    <input id="in-${k}" data-in="${k}" inputmode="decimal" value="${fmt(v || 0)}">
    <button data-a="step" data-k="${k}" data-d="1" aria-label="Больше: ${label}">${ic.plus}</button></div></div>`;
  const bar = reached
    ? `<div class="bar"><button class="btn ghost" data-a="log">Ещё подход</button>
       <button class="btn" data-a="next">${last ? 'Завершить' : 'Дальше'}${ic.right}</button></div>`
    : `<div class="bar"><button class="btn" data-a="log">Записать подход ${cur.length + 1} из ${e.sets}</button></div>`;
  return [`${backBtn()}
    <div class="frames"><img src="img/${e.img}-0.jpg" alt="${e.n}: начало движения"><img src="img/${e.img}-1.jpg" alt="${e.n}: конец движения"></div>
    <div class="th"><h1 class="grow">${e.n}</h1><button class="vbtn" data-a="video" data-id="${id}" aria-label="Видео: правильная техника">${ic.play}</button></div>
    <div class="sub">${e.sets} × ${rng(e)} повторений · ${e.g}</div>
    <p class="sub" style="margin-top:4px">${e.note}</p>
    <div class="hint">${hint}</div>
    <div class="sets">${sets}</div>
    <div class="steps">${stepper('w', e.g === 'Пресс' ? 'Доп. вес, кг' : 'Вес, кг', ui.cur.w)}${stepper('r', 'Повторы', ui.cur.r)}</div>
    <div class="seglabel">Отдых между подходами</div>
    <div class="seg">${RESTS.map(s => `<button data-a="pref" data-s="${s}" aria-pressed="${db.prefs.rest === s}">${mmss(s)}</button>`).join('')}</div>`, bar];
};

V.progress = () => {
  const ss = allSess(), wk = weekStart(new Date());
  const weeks = new Set(ss.map(s => weekStart(s.date + 'T12:00')));
  let streak = 0;
  const w = new Date(wk + 'T12:00');
  if (!weeks.has(wk)) w.setDate(w.getDate() - 7);
  while (weeks.has(iso(w))) { streak++; w.setDate(w.getDate() - 7); }
  const pills = Object.entries(DAYS).map(([k, d]) => {
    const ok = ss.some(s => s.day === k && s.date >= wk);
    return `<div class="pill ${ok ? 'ok' : ''}"><span class="pk">${ok ? ic.check : ''}</span>${d.title}</div>`;
  }).join('');
  const cards = Object.keys(EX).map(id => {
    const e = EX[id], hist = ss.filter(s => s.ex[id]).reverse();
    if (!hist.length) return `<div class="pc"><div class="nm">${e.n}</div><div class="sub">Ещё нет данных</div></div>`;
    const sets = (hist.filter(s => s.ex[id].length >= e.sets).at(-1) || hist.at(-1)).ex[id];
    const l = ladder(id, sets), wt = sets.at(-1)[0];
    const load = hist.map(s => s.ex[id].reduce((a, [x, r]) => a + (x || 1) * r, 0));
    return `<div class="pc ${l.up ? 'up' : ''}">
      <div class="pl"><div class="grow"><div class="nm">${e.n}</div>
        <div class="sub">${wt ? fmt(wt) + ' кг · ' : ''}${sets.map(x => x[1]).join(' / ')} повт.</div></div>
        <span class="sp">${spark(load.slice(-8))}</span></div>
      ${ladderHtml(id, sets)}
      ${l.up ? `<span class="tag">Пора добавить вес → ${fmt(wt + e.step)} кг</span>` : ''}</div>`;
  }).join('');
  const days = ss.map(s => {
    const rows = Object.keys(s.ex).map(id => `<div class="dr">
      <div class="l"><span>${EX[id].n}</span>${delta(s.date, id, s.ex[id])}</div>
      <div class="s">${s.ex[id].map(setTxt).join(' · ')}</div></div>`).join('');
    return `<article class="day"><div class="dh"><b>${fmtDate(s.date)}</b><span class="sub">${DAYS[s.day].title}</span></div>${rows}</article>`;
  }).join('');
  const nSets = ss.reduce((a, s) => a + Object.values(s.ex).reduce((b, x) => b + x.length, 0), 0);
  return [`<div class="head"><h1>Прогресс</h1></div>
    <div class="stats">
      <div class="stat"><b>${streak}</b><span class="sub">нед. подряд</span></div>
      <div class="stat"><b>${ss.length}</b><span class="sub">тренировок</span></div>
      <div class="stat"><b>${nSets}</b><span class="sub">подходов</span></div>
    </div>
    <div class="note"><b>Как расти.</b> Возьми вес, с которым выходит 3×8. Каждую неделю добавляй по повторению. Когда все три подхода на максимуме — увеличь вес и начни заново.</div>
    <h2>Эта неделя</h2><div class="pills">${pills}</div>
    ${ss.length ? `<h2>Когда добавлять вес</h2>${cards}<h2>По дням</h2>${days}` : '<div class="empty">Пока пусто. Запиши первый подход — и он появится здесь.</div>'}`, tabsHtml('progress')];
};

V.weight = () => {
  const entries = Object.entries(db.w).sort((a, b) => b[0].localeCompare(a[0])), t = today();
  ui.wtVal ??= db.w[t] ?? entries[0]?.[1] ?? 70;
  const last = entries[0]?.[1], w7 = entries.find(e => e[0] <= ago(7))?.[1], w30 = entries.find(e => e[0] <= ago(30))?.[1];
  const chart = spark(entries.slice(0, 30).map(e => e[1]).reverse(), 300, 100, 'Динамика веса тела');
  const rows = entries.map(([d, kg], i) => `<div class="wrow"><span class="wd">${fmtDate(d)}</span>
      <span class="grow d ${wDiff(kg, entries[i + 1]?.[1]) > 0 ? 'up' : ''}">${entries[i + 1] ? wDiffTxt(wDiff(kg, entries[i + 1][1])) : ''}</span>
      <span class="wv">${fmt(kg)} кг</span>
      <button class="icon" data-a="delw" data-d="${d}" aria-label="Удалить запись за ${fmtDate(d)}">${ic.x}</button></div>`).join('');
  return [`<div class="head"><h1>Вес тела</h1></div>
    <div class="stats">
      <div class="stat"><b>${last != null ? fmt(last) : '—'}</b><span class="sub">кг сейчас</span></div>
      <div class="stat"><b>${wDiffTxt(wDiff(last, w7))}</b><span class="sub">за 7 дней</span></div>
      <div class="stat"><b>${wDiffTxt(wDiff(last, w30))}</b><span class="sub">за 30 дней</span></div>
    </div>
    ${chart ? `<div class="wchart">${chart}</div>` : ''}
    <div class="field"><label for="in-wt">${db.w[t] != null ? 'Обновить вес сегодня, кг' : 'Вес сегодня, кг'}</label><div class="stepper">
      <button data-a="stepw" data-d="-0.2" aria-label="Меньше на 0.2 кг">${ic.minus}</button>
      <input id="in-wt" data-in="wt" inputmode="decimal" value="${fmt(ui.wtVal)}">
      <button data-a="stepw" data-d="0.2" aria-label="Больше на 0.2 кг">${ic.plus}</button></div></div>
    <button class="btn" style="width:100%;margin-top:12px" data-a="logw">${db.w[t] != null ? 'Обновить' : 'Записать'}</button>
    ${rows ? `<h2>История</h2>${rows}` : '<div class="empty">Пока пусто. Взвешивайся раз в неделю в одно и то же время, лучше утром натощак.</div>'}`, tabsHtml('weight')];
};

let lastKey = '';
function render(keep) {
  const t = here(), key = JSON.stringify(t), view = $('#view');
  const [html, dock] = V[t.v](t);
  const y = view.scrollTop;
  view.innerHTML = html;
  $('#dock').innerHTML = timerHtml() + dock;
  if (keep && key === lastKey) view.scrollTop = y;
  else { view.scrollTop = 0; view.classList.remove('in'); void view.offsetWidth; view.classList.add('in'); }
  lastKey = key;
  if (inTg) nav.length > 1 ? tg.BackButton.show() : tg.BackButton.hide();
  tick();
}

/* ---------- действия ---------- */
const ACT = {
  tab: d => tab(d.v),
  cal: d => { ui.cal = new Date(ui.cal.getFullYear(), ui.cal.getMonth() + +d.d, 1); render(true); },
  back,
  day: d => go('workout', {day: d.day}),
  ex: d => openEx(d.day, d.id),
  video: d => {
    const e = EX[d.id];
    const url = e.v[0] ? 'https://www.youtube.com/watch?v=' + e.v[0] : 'https://www.youtube.com/results?search_query=' + encodeURIComponent(e.n + ' техника');
    tg?.openLink ? tg.openLink(url) : window.open(url, '_blank', 'noopener');
  },
  warm: d => go('warmup', {day: d.day}),
  startwarm: () => { startRest(300, 'Разминка'); render(true); },
  pref: d => { db.prefs.rest = +d.s; save('prefs', db.prefs); render(true); },
  step: d => {
    const e = EX[here().id], k = d.k, st = k === 'w' ? e.step : 1;
    const v = (Number.isFinite(ui.cur[k]) ? ui.cur[k] : 0) + d.d * st;
    ui.cur[k] = Math.max(k === 'r' ? 1 : 0, Math.round(v * 100) / 100);
    $('#in-' + k).value = fmt(ui.cur[k]);
    hap('light');
  },
  log: () => {
    const {day, id} = here(), e = EX[id], reps = Math.round(ui.cur.r), w = Number.isFinite(ui.cur.w) ? ui.cur.w : 0;
    if (!(reps > 0)) { $('#in-r').focus(); tg?.HapticFeedback?.notificationOccurred('error'); return; }
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    ac.resume?.();
    const key = sessKey(today(), day), s = db.s[key] ||= {date: today(), day, ex: {}};
    (s.ex[id] ||= []).push([w, reps]);
    save(key, s);
    const done = DAYS[day].ex.every(x => (s.ex[x]?.length || 0) >= EX[x].sets);
    done ? (rest = null, saveRest()) : startRest();
    ui.cur = suggest(day, id);
    hap('medium');
    render(true);
  },
  del: d => {
    const {day, id} = here(), key = sessKey(today(), day), s = db.s[key];
    s.ex[id].splice(+d.i, 1);
    if (!s.ex[id].length) delete s.ex[id];
    if (Object.keys(s.ex).length) save(key, s); else { delete db.s[key]; save(key, null); }
    ui.cur = suggest(day, id);
    render(true);
  },
  next: () => {
    const {day, id} = here(), list = DAYS[day].ex, i = list.indexOf(id);
    if (!id) return openEx(day, list[0], true);
    i < list.length - 1 ? openEx(day, list[i + 1], true) : (nav = [{v: 'home'}, {v: 'done', day}], render());
  },
  rest: d => {
    if (!rest) return;
    rest.end = Math.max(Date.now(), rest.end + d.d * 1000);
    rest.total = Math.max(1000, rest.total + d.d * 1000);
    rest.done = rest.end <= Date.now();
    saveRest(); tick();
  },
  skip: () => { rest = null; saveRest(); render(true); },
  stepw: d => {
    ui.wtVal = Math.max(20, Math.round(((ui.wtVal ?? 70) + +d.d) * 10) / 10);
    $('#in-wt').value = fmt(ui.wtVal);
    hap('light');
  },
  logw: () => {
    if (!(ui.wtVal > 0)) return;
    const d = today();
    db.w[d] = ui.wtVal;
    save('weight:' + d, ui.wtVal);
    hap('medium');
    render(true);
  },
  delw: d => {
    delete db.w[d.d];
    save('weight:' + d.d, null);
    render(true);
  },
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (b) ACT[b.dataset.a](b.dataset);
});
document.addEventListener('input', e => {
  const k = e.target.dataset.in;
  if (!k) return;
  const v = parseFloat(e.target.value.replace(',', '.'));
  if (k === 'wt') ui.wtVal = v; else ui.cur[k] = v;
});
document.addEventListener('visibilitychange', tick);

/* ---------- старт ---------- */
function applyTheme() {
  if (inTg) document.documentElement.dataset.theme = tg.colorScheme;
  try {
    const [r, g, b] = getComputedStyle(document.body).backgroundColor.match(/\d+/g);
    const hex = '#' + [r, g, b].map(n => (+n).toString(16).padStart(2, '0')).join('');
    tg?.setHeaderColor(hex); tg?.setBackgroundColor(hex); tg?.setBottomBarColor?.(hex);
  } catch {}
}
if (tg) {
  tg.ready(); tg.expand();
  tg.disableVerticalSwipes?.();
  tg.BackButton.onClick(back);
  tg.onEvent('themeChanged', applyTheme);
}
applyTheme();
load().then(() => { render(); setInterval(tick, 250); });
