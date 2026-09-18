window.YanDB = (() => {
  const DB_NAME = "yan-calligraphy-practice";
  const DB_VERSION = 1;
  const STORES = {
    settings: "settings",
    practice: "practice",
    charState: "charState"
  };

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORES.settings)) db.createObjectStore(STORES.settings, { keyPath: "key" });
        if (!db.objectStoreNames.contains(STORES.practice)) {
          const store = db.createObjectStore(STORES.practice, { keyPath: "id", autoIncrement: true });
          store.createIndex("charId", "charId", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.charState)) db.createObjectStore(STORES.charState, { keyPath: "charId" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function tx(storeName, mode, fn) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeName, mode);
      const store = t.objectStore(storeName);
      let result;
      try { result = fn(store); } catch (err) { reject(err); return; }
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error("IndexedDB transaction aborted"));
    }).finally(() => db.close());
  }

  function requestToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getSetting(key, fallback = null) {
    const db = await openDB();
    try {
      const t = db.transaction(STORES.settings, "readonly");
      const row = await requestToPromise(t.objectStore(STORES.settings).get(key));
      return row ? row.value : fallback;
    } finally { db.close(); }
  }

  async function setSetting(key, value) {
    return tx(STORES.settings, "readwrite", store => store.put({ key, value }));
  }

  async function addPractice(charId) {
    const db = await openDB();
    try {
      const t = db.transaction(STORES.practice, "readwrite");
      const record = { charId, createdAt: new Date().toISOString() };
      await requestToPromise(t.objectStore(STORES.practice).add(record));
      return record;
    } finally { db.close(); }
  }

  async function listPractice(limit = 1000) {
    const db = await openDB();
    try {
      const t = db.transaction(STORES.practice, "readonly");
      const store = t.objectStore(STORES.practice);
      const all = await requestToPromise(store.getAll());
      return all.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
    } finally { db.close(); }
  }

  async function getPracticeForChar(charId) {
    const db = await openDB();
    try {
      const t = db.transaction(STORES.practice, "readonly");
      const idx = t.objectStore(STORES.practice).index("charId");
      const rows = await requestToPromise(idx.getAll(charId));
      return rows.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    } finally { db.close(); }
  }

  async function getCharState(charId) {
    const db = await openDB();
    try {
      const t = db.transaction(STORES.charState, "readonly");
      return (await requestToPromise(t.objectStore(STORES.charState).get(charId))) || { charId, note: "", reinforce: false };
    } finally { db.close(); }
  }

  async function setCharState(charId, patch) {
    const current = await getCharState(charId);
    const next = { ...current, ...patch, charId };
    await tx(STORES.charState, "readwrite", store => store.put(next));
    return next;
  }

  async function getAll(storeName) {
    const db = await openDB();
    try {
      const t = db.transaction(storeName, "readonly");
      return await requestToPromise(t.objectStore(storeName).getAll());
    } finally { db.close(); }
  }

  async function exportAll() {
    const [settings, practice, charState] = await Promise.all([
      getAll(STORES.settings), getAll(STORES.practice), getAll(STORES.charState)
    ]);
    return {
      schemaVersion: 1,
      app: "顏真卿原帖習字",
      exportedAt: new Date().toISOString(),
      data: { settings, practice, charState }
    };
  }

  async function replaceStore(storeName, rows) {
    const db = await openDB();
    try {
      await new Promise((resolve, reject) => {
        const t = db.transaction(storeName, "readwrite");
        const store = t.objectStore(storeName);
        store.clear();
        for (const row of rows || []) store.put(row);
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error || new Error("Import aborted"));
      });
    } finally { db.close(); }
  }

  async function importAll(payload) {
    if (!payload || payload.schemaVersion !== 1 || !payload.data) throw new Error("不支援的備份格式");
    const { settings, practice, charState } = payload.data;
    if (!Array.isArray(settings) || !Array.isArray(practice) || !Array.isArray(charState)) throw new Error("備份內容不完整");
    await replaceStore(STORES.settings, settings);
    await replaceStore(STORES.practice, practice);
    await replaceStore(STORES.charState, charState);
  }

  return { getSetting, setSetting, addPractice, listPractice, getPracticeForChar, getCharState, setCharState, exportAll, importAll };
})();
