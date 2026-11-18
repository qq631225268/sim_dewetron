export class FIFOCache<V> {
  private map = new Map<string, V>();
  constructor(private capacity = 200) {}
  get(k: string) {
    return this.map.get(k);
  }
  set(k: string, v: V) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, v);
    while (this.map.size > this.capacity) {
      const first = this.map.keys().next().value as string;
      this.map.delete(first);
    }
  }
  clear() {
    this.map.clear();
  }
}
