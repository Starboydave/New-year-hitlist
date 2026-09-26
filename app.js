(() => {
  'use strict';

  // How long you can sit idle with active targets before the nag fires.
  const NAG_DELAY_MS = 30000;
  const STORAGE_KEY = 'hitlist.targets';

  const $ = (id) => document.getElementById(id);
  const els = {
    year: $('year'),
    status: $('status'),
    rate: $('rate'),
    progress: document.querySelector('.progress'),
    progressFill: $('progress-fill'),
    form: $('add-form'),
    input: $('target-input'),
    list: $('targets'),
    empty: $('empty'),
    countActive: $('count-active'),
    countDone: $('count-done'),
    nag: $('nag'),
    nagDismiss: $('nag-dismiss'),
    template: $('target-template'),
  };

  // --- PERSISTENCE ---
  const defaultTargets = () => [
    { id: 1, text: 'Learn Rust', completed: false },
    { id: 2, text: 'Fix Sleep Schedule', completed: true },
  ];

  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(saved)) return saved;
    } catch (_) { /* storage unavailable or corrupt */ }
    return defaultTargets();
  };

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(targets)); } catch (_) { /* ignore */ }
  };

  let targets = load();
  let justAddedId = null;

  // --- RENDERING ---
  const render = () => {
    els.list.replaceChildren(...targets.map(renderTarget));
    els.empty.hidden = targets.length > 0;

    const done = targets.filter((t) => t.completed).length;
    const rate = targets.length ? Math.round((done / targets.length) * 100) : 0;
    els.rate.textContent = `${rate}%`;
    els.progressFill.style.width = `${rate}%`;
    els.progress.setAttribute('aria-valuenow', rate);
    els.countActive.textContent = targets.length - done;
    els.countDone.textContent = done;

    tickCountdowns();
  };

  const renderTarget = (target) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.classList.toggle('completed', target.completed);
    node.classList.toggle('entering', target.id === justAddedId);
    node.querySelector('.target-text').textContent = target.text;
    node.querySelector('.badge').textContent = target.completed ? 'TERMINATED' : 'ACTIVE BOUNTY';

    const toggle = node.querySelector('.toggle');
    toggle.setAttribute('aria-label', `${target.completed ? 'Reactivate' : 'Complete'} ${target.text}`);
    toggle.setAttribute('aria-pressed', target.completed);
    toggle.addEventListener('click', () => toggleTarget(target.id));

    const del = node.querySelector('.delete');
    del.setAttribute('aria-label', `Delete ${target.text}`);
    del.addEventListener('click', () => deleteTarget(target.id));

    return node;
  };

  // --- TARGET MANAGEMENT ---
  const update = (next) => {
    targets = next;
    save();
    render();
    resetIdleTimer();
  };

  const addTarget = (text) => {
    justAddedId = Date.now();
    update([...targets, { id: justAddedId, text, completed: false }]);
    justAddedId = null;
  };
  const toggleTarget = (id) => update(targets.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const deleteTarget = (id) => update(targets.filter((t) => t.id !== id));

  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = els.input.value.trim();
    if (!text) return;
    addTarget(text);
    els.input.value = '';
  });

  // --- COUNTDOWN TO MIDNIGHT ---
  const pad = (n) => String(n).padStart(2, '0');

  const tickCountdowns = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;
    const time = `${pad(Math.floor(diff / 3600000) % 24)}:${pad(Math.floor(diff / 60000) % 60)}:${pad(Math.floor(diff / 1000) % 60)}`;
    els.list.querySelectorAll('.countdown-time').forEach((el) => { el.textContent = time; });
  };

  setInterval(tickCountdowns, 1000);

  // --- THE NAG LOGIC ---
  let idleTimer = null;
  let nagging = false;

  const setNagging = (on) => {
    nagging = on;
    els.nag.hidden = !on;
    document.body.classList.toggle('shake', on);
    els.status.textContent = on ? 'CRITICAL' : 'ONLINE';
    els.status.className = on ? 'status-critical' : 'status-online';
    if (on) els.nagDismiss.focus();
  };

  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    if (nagging) setNagging(false);
    if (targets.some((t) => !t.completed)) {
      idleTimer = setTimeout(() => setNagging(true), NAG_DELAY_MS);
    }
  };

  els.nagDismiss.addEventListener('click', () => {
    resetIdleTimer();
    els.input.focus();
  });

  // Any real activity on the page counts as "working on it" — except while
  // the nag is up, where only the button will make it go away.
  ['keydown', 'pointerdown', 'input'].forEach((type) => {
    document.addEventListener(type, () => { if (!nagging) resetIdleTimer(); }, { passive: true });
  });

  // --- INIT ---
  els.year.textContent = new Date().getFullYear();
  render();
  resetIdleTimer();
})();
