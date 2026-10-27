/**
 * Almacenamiento clave/valor asíncrono. Tiene la misma forma que AsyncStorage de React Native,
 * así que en móvil basta con pasar `AsyncStorage` en lugar de `webStorageDriver`.
 */
export interface StorageDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const webStorageDriver: StorageDriver = {
  async getItem(key) {
    return localStorage.getItem(key);
  },
  async setItem(key, value) {
    localStorage.setItem(key, value);
  },
  async removeItem(key) {
    localStorage.removeItem(key);
  },
};

export async function readJson<T>(driver: StorageDriver, key: string, fallback: T): Promise<T> {
  try {
    const raw = await driver.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
