const KEYS = ['skin', 'foundations', 'stories', 'annotations'];
const root = document.documentElement;

function attr(key) {
  return 'data-' + key;
}

function read(key) {
  return localStorage.getItem('em:' + key);
}

for (const key of KEYS) {
  const saved = read(key);
  if (saved !== null) root.setAttribute(attr(key), saved);
}

for (const el of document.querySelectorAll('[data-ctl]')) {
  const key = el.dataset.ctl;
  const isCheck = el.type === 'checkbox';
  const current = root.getAttribute(attr(key));

  if (isCheck) el.checked = current === 'on';
  else el.value = current;

  el.addEventListener('change', () => {
    const value = isCheck ? (el.checked ? 'on' : 'off') : el.value;
    root.setAttribute(attr(key), value);
    localStorage.setItem('em:' + key, value);
  });
}
