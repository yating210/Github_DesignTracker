/** 扩展弹窗：查看统计、导出 / 导入备份。 */

import { STATUSES, isStatus, readStore, writeStore, type Status, type StatusMap } from './shared';

const BACKUP_FORMAT = 'github-design-task-tracker';

interface Backup {
  format: string;
  version: number;
  exportedAt: string;
  statuses: StatusMap;
}

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function say(message: string, isError = false): void {
  const el = $('status');
  el.textContent = message;
  el.className = isError ? 'err' : '';
}

async function renderCounts(): Promise<void> {
  const store = await readStore();
  const counts: Record<Status, number> = {
    'Todo': 0,
    'In progress': 0,
    'Done': 0,
    'Pending': 0,
  };
  Object.values(store).forEach((s) => {
    if (isStatus(s)) counts[s]++;
  });

  const container = $('counts');
  container.textContent = '';

  const addRow = (label: string, value: number) => {
    const name = document.createElement('span');
    name.textContent = label;
    const num = document.createElement('b');
    num.textContent = String(value);
    container.appendChild(name);
    container.appendChild(num);
  };

  STATUSES.forEach((s) => addRow(s, counts[s]));
  addRow('已记录条目', Object.keys(store).length);
}

async function exportBackup(): Promise<void> {
  try {
    const statuses = await readStore();
    const backup: Backup = {
      format: BACKUP_FORMAT,
      version: 1,
      exportedAt: new Date().toISOString(),
      statuses,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);

    const a = document.createElement('a');
    a.href = url;
    a.download = `design-task-tracker-backup-${stamp}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 2000);

    say(`已导出 ${Object.keys(statuses).length} 条记录`);
  } catch (err) {
    say(`导出失败：${(err as Error).message}`, true);
  }
}

function parseBackup(text: string): StatusMap {
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== 'object') throw new Error('文件内容不是合法对象');

  const raw = (parsed as Partial<Backup>).statuses;
  if (!raw || typeof raw !== 'object') throw new Error('缺少 statuses 字段');

  const clean: StatusMap = {};
  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    if (isStatus(value)) clean[key] = value;
  });

  if (!Object.keys(clean).length) throw new Error('备份中没有有效记录');
  return clean;
}

async function importBackup(file: File): Promise<void> {
  try {
    const incoming = parseBackup(await file.text());
    const merged = { ...(await readStore()), ...incoming };
    await writeStore(merged);
    await renderCounts();
    say(`已导入 ${Object.keys(incoming).length} 条，当前共 ${Object.keys(merged).length} 条`);
  } catch (err) {
    say(`导入失败：${(err as Error).message}`, true);
  }
}

$('export').addEventListener('click', () => void exportBackup());
$('import').addEventListener('click', () => $<HTMLInputElement>('file').click());
$('file').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) void importBackup(file);
  input.value = '';
});

void renderCounts();
