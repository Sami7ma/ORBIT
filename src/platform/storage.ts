export type StorageWriter = Pick<Storage, "getItem" | "setItem">;

/** Keep earlier repairs too; repeated saves of the same value do not add more copies. */
export function preserveBackup(storage: StorageWriter, baseKey: string, raw: string): void {
  let key = baseKey, suffix = 0;
  while (storage.getItem(key) !== null && storage.getItem(key) !== raw) key = `${baseKey}.${++suffix}`;
  if (storage.getItem(key) === null) storage.setItem(key, raw);
}

export function resetOrbitStorage(storage: Pick<Storage, "length" | "key" | "removeItem">): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith("orbit.")) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}
