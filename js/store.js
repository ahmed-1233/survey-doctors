// ===== طبقة البيانات =====
// كل جدول إله Store خاص بيه، بنفس الدوال:
//   init(onChange)   يحمّل البيانات ويستدعي onChange كل ما تتغير
//   add(body)        يضيف سجل
//   update(id, body) يعدّل سجل
//   remove(id)       يحذف سجل
// وضعين: "supabase" إذا المفاتيح موجودة بـ config.js، و "local" إذا فارغة.

let _sbClient = null;
function sbClient() {
  if (!_sbClient && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase) {
    _sbClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return _sbClient;
}

function makeStore({ table, localKey, fields, seed }) {
  let mode = "local";
  let notify = () => {};

  // صف قاعدة البيانات ← شكل الواجهة (updated_at ← updatedAt)
  const fromRow = r => {
    const o = { id: String(r.id), updatedAt: r.updated_at || "" };
    fields.forEach(f => (o[f] = r[f] ?? ""));
    return o;
  };
  // شكل الواجهة ← صف قاعدة البيانات (النص الفارغ يصير null)
  const toRow = b => {
    const o = { updated_at: b.updatedAt || new Date().toISOString() };
    fields.forEach(f => (o[f] = b[f] === "" || b[f] == null ? null : b[f]));
    return o;
  };

  async function loadRemote() {
    const { data, error } = await sbClient().from(table).select("*").order("name").limit(5000);
    if (error) throw error;
    notify(data.map(fromRow));
  }
  function readLocal() {
    try {
      const saved = JSON.parse(localStorage.getItem(localKey) || "null");
      if (Array.isArray(saved)) return saved;
    } catch (e) {}
    const rows = seed ? seed() : [];
    writeLocal(rows);
    return rows;
  }
  function writeLocal(rows) {
    try { localStorage.setItem(localKey, JSON.stringify(rows)); } catch (e) {}
  }

  return {
    get mode() { return mode; },

    async init(onChange) {
      notify = onChange;
      if (!sbClient()) { mode = "local"; notify(readLocal()); return mode; }
      mode = "supabase";
      await loadRemote();
      // Realtime: أي تعديل من جهاز ثاني يحدّث القائمة هنا
      sbClient().channel(table + "-live")
        .on("postgres_changes", { event: "*", schema: "public", table }, () => loadRemote().catch(console.error))
        .subscribe();
      return mode;
    },
    async add(body) {
      if (mode === "supabase") {
        const { error } = await sbClient().from(table).insert(toRow(body));
        if (error) throw error;
        return loadRemote();
      }
      const rows = readLocal();
      rows.push({ ...body, id: "l" + Date.now().toString(36) });
      writeLocal(rows); notify(rows);
    },
    async update(id, body) {
      if (mode === "supabase") {
        const { error } = await sbClient().from(table).update(toRow(body)).eq("id", id);
        if (error) throw error;
        return loadRemote();
      }
      const rows = readLocal().map(r => (r.id === id ? { ...body, id } : r));
      writeLocal(rows); notify(rows);
    },
    async remove(id) {
      if (mode === "supabase") {
        const { error } = await sbClient().from(table).delete().eq("id", id);
        if (error) throw error;
        return loadRemote();
      }
      const rows = readLocal().filter(r => r.id !== id);
      writeLocal(rows); notify(rows);
    },
  };
}

// الأطباء
const Store = makeStore({
  table: "doctors",
  localKey: "survey-doctors-v1",
  fields: ["name", "spec", "cls", "ph", "area", "note"],
  seed: () => (typeof SEED !== "undefined" ? SEED : []).map((r, i) => ({
    id: "s" + (i + 1), name: r[0], spec: r[1], cls: r[2], ph: r[3], area: r[4], note: r[5] || "", updatedAt: "",
  })),
});

// الصيدليات
const PharmStore = makeStore({
  table: "pharmacies",
  localKey: "survey-pharmacies-v1",
  fields: ["name", "complex", "cls", "address", "area", "manager", "phone", "note"],
});
