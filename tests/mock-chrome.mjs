// In-memory chrome.* mock for Node tests.
export function installChromeMock() {
  const mem = { local: {}, session: {} };
  const area = (name) => ({
    async get(key) {
      if (key == null) return structuredClone(mem[name]);
      const keys = Array.isArray(key) ? key : [key];
      const out = {};
      for (const k of keys) if (k in mem[name]) out[k] = structuredClone(mem[name][k]);
      return out;
    },
    async set(obj) { Object.assign(mem[name], structuredClone(obj)); },
    async remove(key) { delete mem[name][key]; }
  });
  globalThis.chrome = {
    storage: { local: area("local"), session: area("session") },
    runtime: { getURL: (p) => "chrome-extension://abc/" + p }
  };
  return mem;
}
