// Minimal data container used by _magic_lib.mjs.
export default class Dish {
  set(value) { this.value = value; }
  async get() {
    const v = this.value;
    if (v instanceof ArrayBuffer) return v;
    if (ArrayBuffer.isView(v)) return v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength);
    return new TextEncoder().encode(String(v ?? '')).buffer;
  }
}
Dish.ARRAY_BUFFER = 4;
