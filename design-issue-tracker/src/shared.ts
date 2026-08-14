/** 列表页脚本与弹窗共用的类型、常量与存储访问。 */

export type Status = 'Todo' | 'In progress' | 'Done' | 'Pending';

export const STATUSES: Status[] = ['Todo', 'In progress', 'Done', 'Pending'];
export const DEFAULT_STATUS: Status = 'Todo';
export const STORAGE_KEY = 'design_task_statuses';

export type StatusMap = Record<string, Status>;

export function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && (STATUSES as string[]).includes(value);
}

export function readStore(): Promise<StatusMap> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve(((result && result[STORAGE_KEY]) || {}) as StatusMap);
    });
  });
}

export function writeStore(data: StatusMap): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: data }, () => resolve());
  });
}
