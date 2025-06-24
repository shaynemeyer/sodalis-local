export class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, { value: V; lastUsed: number }>;
  private timeCounter: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.timeCounter = 0;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastUsed = this.timeCounter++;
      return entry.value;
    }
    return;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      let oldestKey: K | undefined;
      let oldestTime = Infinity;

      for (const [k, v] of this.cache) {
        if (v.lastUsed < oldestTime) {
          oldestTime = v.lastUsed;
          oldestKey = k;
        }
      }

      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { value, lastUsed: this.timeCounter++ });
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.timeCounter = 0;
  }
}
