/**
 * GitHub Design Task Tracker
 * 在 GitHub issue 列表页为每一行追加一个「个人设计状态」列，
 * 支持修改状态、按状态筛选、按状态排序。数据存在 chrome.storage.sync（跨设备同步）。
 */

import {
  DEFAULT_STATUS,
  STATUSES,
  STORAGE_KEY,
  readStore,
  writeStore,
  type Status,
  type StatusMap,
} from './shared';

const COLORS: Record<Status, { bg: string; fg: string; border: string }> = {
  'Todo': { bg: '#eaeef2', fg: '#57606a', border: '#d0d7de' },
  'In progress': { bg: '#ddf4ff', fg: '#0969da', border: '#54aeff' },
  'Done': { bg: '#dafbe1', fg: '#1a7f37', border: '#4ac26b' },
  'Pending': { bg: '#fff8c5', fg: '#9a6700', border: '#d4a72c' },
};

const PILL_CLASS = 'dtt-pill';
const TOOLBAR_ID = 'dtt-toolbar';

let cache: StatusMap = {};
let filter: Status | 'All' = 'All';
let sortMode: 'none' | 'asc' | 'desc' = 'none';
let scheduled = false;
let lastLoggedRowCount = -1;

/* ---------------------------------- storage --------------------------------- */

async function loadCache(): Promise<void> {
  cache = await readStore();
}

function persist(): void {
  void writeStore(cache);
}

function getStatus(key: string): Status {
  return cache[key] || DEFAULT_STATUS;
}

function setStatus(key: string, status: Status): void {
  if (status === DEFAULT_STATUS) {
    delete cache[key];
  } else {
    cache[key] = status;
  }
  persist();
}

/* ----------------------------------- rows ----------------------------------- */

interface Row {
  el: HTMLElement;
  key: string;
}

function issueKeyFromHref(href: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(href, location.origin).pathname;
  } catch {
    return null;
  }
  const m = pathname.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?$/);
  return m ? `${m[1]}/${m[2]}#${m[3]}` : null;
}

function findRowElement(anchor: HTMLElement, key: string): HTMLElement | null {
  let node: HTMLElement | null = anchor;
  for (let depth = 0; depth < 14 && node; depth++) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent || parent === document.body) break;

    let siblingsWithOtherIssues = 0;
    const children = Array.from(parent.children) as HTMLElement[];
    for (const sib of children) {
      if (sib === node) continue;
      const link = sib.querySelector<HTMLAnchorElement>('a[href*="/issues/"]');
      if (!link) continue;
      const k = issueKeyFromHref(link.getAttribute('href') || '');
      if (k && k !== key) siblingsWithOtherIssues++;
    }
    if (siblingsWithOtherIssues >= 1) return node;

    node = parent;
  }
  return null;
}

function findRows(): Row[] {
  const rows: Row[] = [];
  const seen = new Set<HTMLElement>();

  const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href*="/issues/"]');
  anchors.forEach((a) => {
    if (a.closest('#' + TOOLBAR_ID)) return;
    const key = issueKeyFromHref(a.getAttribute('href') || '');
    if (!key) return;
    if (!a.textContent || !a.textContent.trim()) return;

    const el =
      findRowElement(a, key) ||
      (a.closest('li') as HTMLElement | null) ||
      (a.closest('[role="row"]') as HTMLElement | null) ||
      (a.closest('.js-issue-row') as HTMLElement | null);
    if (!el || seen.has(el)) return;

    seen.add(el);
    rows.push({ el, key });
  });

  return rows;
}

/* ----------------------------------- pill ----------------------------------- */

function paintPill(pill: HTMLElement, status: Status): void {
  const c = COLORS[status];
  pill.textContent = status;
  pill.style.background = c.bg;
  pill.style.color = c.fg;
  pill.style.borderColor = c.border;
}

function closeMenus(): void {
  document.querySelectorAll('.dtt-menu').forEach((m) => m.remove());
}

function openMenu(pill: HTMLElement, key: string): void {
  closeMenus();

  const menu = document.createElement('div');
  menu.className = 'dtt-menu';
  menu.style.cssText = [
    'position:fixed',
    'z-index:2147483647',
    'background:#fff',
    'border:1px solid #d0d7de',
    'border-radius:6px',
    'box-shadow:0 8px 24px rgba(140,149,159,0.2)',
    'padding:4px',
    'min-width:150px',
    'font-size:12px',
  ].join(';');

  const current = getStatus(key);

  STATUSES.forEach((s) => {
    const item = document.createElement('div');
    const c = COLORS[s];
    item.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:8px',
      'padding:6px 8px',
      'border-radius:4px',
      'cursor:pointer',
      'white-space:nowrap',
      'color:#24292f',
    ].join(';');

    const dot = document.createElement('span');
    dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${c.border};flex:0 0 auto`;
    item.appendChild(dot);

    const label = document.createElement('span');
    label.textContent = s;
    label.style.flex = '1';
    item.appendChild(label);

    if (s === current) {
      const check = document.createElement('span');
      check.textContent = '✓';
      check.style.color = '#1a7f37';
      item.appendChild(check);
    }

    item.addEventListener('mouseenter', () => (item.style.background = '#f6f8fa'));
    item.addEventListener('mouseleave', () => (item.style.background = 'transparent'));
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setStatus(key, s);
      paintPill(pill, s);
      closeMenus();
      withoutObserver(() => {
        applyFilterAndSort();
        renderToolbarCounts();
      });
    });

    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  const rect = pill.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  let top = rect.bottom + 4;
  if (top + menuRect.height > window.innerHeight) top = rect.top - menuRect.height - 4;
  let left = rect.left;
  if (left + menuRect.width > window.innerWidth) left = window.innerWidth - menuRect.width - 8;
  menu.style.top = `${Math.max(4, top)}px`;
  menu.style.left = `${Math.max(4, left)}px`;
}

function createPill(key: string): HTMLElement {
  const pill = document.createElement('button');
  pill.className = PILL_CLASS;
  pill.type = 'button';
  pill.dataset.dttKey = key;
  pill.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    'height:22px',
    'padding:0 10px',
    'border:1px solid',
    'border-radius:999px',
    'font-size:11px',
    'font-weight:600',
    'line-height:1',
    'cursor:pointer',
    'white-space:nowrap',
    'font-family:inherit',
    'flex:0 0 auto',
  ].join(';');

  paintPill(pill, getStatus(key));

  pill.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openMenu(pill, key);
  });

  return pill;
}

/* --------------------------------- decorate --------------------------------- */

function decorateRow(row: Row): void {
  const existing = row.el.querySelector<HTMLElement>(`.${PILL_CLASS}`);
  if (existing) {
    paintPill(existing, getStatus(row.key));
    return;
  }

  const host = document.createElement('div');
  host.className = 'dtt-host';
  host.style.cssText = [
    'position:absolute',
    'right:12px',
    'top:50%',
    'transform:translateY(-50%)',
    'z-index:5',
    'display:flex',
    'align-items:center',
  ].join(';');
  host.appendChild(createPill(row.key));

  if (getComputedStyle(row.el).position === 'static') {
    row.el.style.position = 'relative';
  }
  row.el.style.paddingRight = '132px';
  row.el.appendChild(host);
}

/* ------------------------------ filter & sort ------------------------------- */

function applyFilterAndSort(): void {
  const rows = findRows();

  rows.forEach(({ el, key }) => {
    const visible = filter === 'All' || getStatus(key) === filter;
    const next = visible ? '' : 'none';
    if (el.style.display !== next) el.style.display = next;
  });

  if (sortMode === 'none') return;

  const groups = new Map<HTMLElement, Row[]>();
  rows.forEach((r) => {
    const parent = r.el.parentElement;
    if (!parent) return;
    const list = groups.get(parent) || [];
    list.push(r);
    groups.set(parent, list);
  });

  groups.forEach((list, parent) => {
    const sorted = [...list].sort((a, b) => {
      const ia = STATUSES.indexOf(getStatus(a.key));
      const ib = STATUSES.indexOf(getStatus(b.key));
      if (ia !== ib) return sortMode === 'asc' ? ia - ib : ib - ia;
      return list.indexOf(a) - list.indexOf(b);
    });

    const alreadyOrdered = sorted.every((r, i) => r.el === list[i].el);
    if (alreadyOrdered) return;

    sorted.forEach((r) => parent.appendChild(r.el));
  });
}

/* --------------------------------- toolbar ---------------------------------- */

function findHeaderAnchor(): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>('button, [role="button"], summary')
  );
  for (const el of candidates) {
    const text = (el.textContent || '').trim();
    if (/^(Last updated|Newest|Oldest|Best match|Most commented)\b/.test(text)) {
      return el.parentElement;
    }
  }
  return null;
}

function renderToolbarCounts(): void {
  const toolbar = document.getElementById(TOOLBAR_ID);
  if (!toolbar) return;
  const select = toolbar.querySelector<HTMLSelectElement>('select');
  if (!select) return;

  const rows = findRows();
  const counts: Record<string, number> = { All: rows.length };
  STATUSES.forEach((s) => (counts[s] = 0));
  rows.forEach((r) => counts[getStatus(r.key)]++);

  Array.from(select.options).forEach((opt) => {
    const base = opt.value === 'All' ? 'All' : opt.value;
    opt.textContent = `${base} (${counts[opt.value] ?? 0})`;
  });
}

function ensureToolbar(): void {
  if (document.getElementById(TOOLBAR_ID)) return;

  const anchor = findHeaderAnchor();
  if (!anchor) return;

  const wrap = document.createElement('div');
  wrap.id = TOOLBAR_ID;
  wrap.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'gap:6px',
    'margin-right:12px',
    'font-size:12px',
    'color:#57606a',
  ].join(';');

  const sortBtn = document.createElement('button');
  sortBtn.type = 'button';
  sortBtn.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'gap:4px',
    'background:transparent',
    'border:0',
    'padding:2px 4px',
    'cursor:pointer',
    'color:inherit',
    'font:inherit',
    'font-weight:600',
  ].join(';');
  const sortLabel = document.createElement('span');
  const sortIcon = document.createElement('span');
  sortBtn.appendChild(sortLabel);
  sortBtn.appendChild(sortIcon);

  const paintSort = () => {
    sortLabel.textContent = 'Status';
    sortIcon.textContent = sortMode === 'none' ? '↕' : sortMode === 'asc' ? '↓' : '↑';
    sortBtn.title =
      sortMode === 'none'
        ? '点击按状态排序（Todo → Pending）'
        : sortMode === 'asc'
          ? '当前：Todo → Pending，点击反向'
          : '当前：Pending → Todo，点击取消排序';
  };
  paintSort();

  sortBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    sortMode = sortMode === 'none' ? 'asc' : sortMode === 'asc' ? 'desc' : 'none';
    paintSort();
    withoutObserver(applyFilterAndSort);
  });

  const select = document.createElement('select');
  select.style.cssText = [
    'font:inherit',
    'padding:2px 6px',
    'border:1px solid #d0d7de',
    'border-radius:6px',
    'background:#f6f8fa',
    'color:#24292f',
    'cursor:pointer',
  ].join(';');
  ['All', ...STATUSES].forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });
  select.value = filter;
  select.addEventListener('change', () => {
    filter = select.value as Status | 'All';
    withoutObserver(applyFilterAndSort);
  });

  wrap.appendChild(sortBtn);
  wrap.appendChild(select);
  anchor.insertBefore(wrap, anchor.firstChild);
  renderToolbarCounts();
}

/* ----------------------------------- main ----------------------------------- */

let observer: MutationObserver | null = null;

/** 执行会修改 DOM 的操作，期间暂停 observer，避免自触发导致的无限循环。 */
function withoutObserver(fn: () => void): void {
  if (!observer) {
    fn();
    return;
  }
  observer.disconnect();
  try {
    fn();
  } finally {
    observer.takeRecords();
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

function run(): void {
  try {
    const rows = findRows();
    if (!rows.length) {
      const anchors = document.querySelectorAll('a[href*="/issues/"]').length;
      console.warn(`[DesignTaskTracker] 未匹配到任何行（页面上 /issues/ 链接数: ${anchors}）`);
      return;
    }
    withoutObserver(() => {
      rows.forEach(decorateRow);
      ensureToolbar();
      applyFilterAndSort();
      renderToolbarCounts();
    });
    if (rows.length !== lastLoggedRowCount) {
      lastLoggedRowCount = rows.length;
      console.log(
        `[DesignTaskTracker] 已标注 ${rows.length} 行；工具栏: ${
          document.getElementById(TOOLBAR_ID) ? '已插入' : '未找到表头（仅行内胶囊可用）'
        }`
      );
    }
  } catch (err) {
    console.error('[DesignTaskTracker] run failed:', err);
  }
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    run();
  }, 150);
}

async function init(): Promise<void> {
  await loadCache();
  observer = new MutationObserver(schedule);
  run();
  observer.observe(document.body, { childList: true, subtree: true });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[STORAGE_KEY]) return;
    cache = (changes[STORAGE_KEY].newValue || {}) as StatusMap;
    withoutObserver(() => {
      document.querySelectorAll<HTMLElement>(`.${PILL_CLASS}`).forEach((pill) => {
        const key = pill.dataset.dttKey;
        if (key) paintPill(pill, getStatus(key));
      });
      applyFilterAndSort();
      renderToolbarCounts();
    });
  });

  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement)?.closest('.dtt-menu')) closeMenus();
  });
  window.addEventListener('scroll', closeMenus, true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  void init();
}
