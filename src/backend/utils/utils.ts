export function stringsToArray(str: string): string[] {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

export function isObjectAvailable(key: string, obj: any): boolean {
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
}

export function getNewId(): string {
  const prefix = "todo-TD";
  const num = Math.floor(Math.random() * 1000000);
  return `${prefix}${num.toString().padStart(6, '0')}`;
}

export function formatDateTime(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}
