export async function streamTransform(u8, format, mode) {
  const Ctor = mode === 'compress' ? CompressionStream : DecompressionStream;
  if (typeof Ctor === 'undefined') throw new Error(`${Ctor === CompressionStream ? 'CompressionStream' : 'DecompressionStream'} isn't supported in this browser`);
  const stream = new Ctor(format);
  const writer = stream.writable.getWriter();
  const pending = writer.write(u8).then(() => writer.close()).catch(() => {});
  const chunks = [];
  const reader = stream.readable.getReader();
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}
