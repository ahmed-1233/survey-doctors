// ===== طبقة البيانات =====
// الواجهة (app.js) ما تعرف وين تنحفظ البيانات، تتعامل بس ويا هاي الدوال:
//   Store.init(onChange)   يحمّل الأطباء ويستدعي onChange كل ما تتغير البيانات
//   Store.add(body)        يضيف طبيب
//   Store.update(id, body) يعدّل طبيب
//   Store.remove(id)       يحذف طبيب
// وضعين: "supabase" إذا المفاتيح موجودة بـ config.js، و "local" إذا فارغة.

const Store = (() => {
  const TABLE = "doctors";
  const LOCAL_KEY = "survey-doctors-v1";
  let mode = "local";
  let client = null;
  let notify = () => {};

  // تحويل صف قاعدة البيانات لشكل الواجهة (updated_at ← updatedAt)
  const fromRow = r => ({
    id: String(r.id), name: r.name || "", spec: r.spec || "", cls: r.cls || "",
    ph: r.ph || "", area: r.area || "", note: r.note || "", updatedAt: r.updated_at || "",
  });
  const toRow = b => ({
    name: b.name, spec: b.spec, cls: b.cls, ph: b.ph || null,
    area: b.area, note: b.note || null, updated_at: b.updatedAt || new Date().toISOString(),
  });

  // ---------- Supabase ----------
  async function loadRemote() {
    const { data, error } = await client.from(TABLE).select("*").order("name").limit(5000);
    if (error) throw error;
    notify(data.map(fromRow));
  }

  // ---------- محلي (localStorage) ----------
  function readLocal() {
    try {
      const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
      if (Array.isArray(saved)) return saved;
    } catch (e) {}
    // أول مرة: نبدي من بيانات السيرفي
    const rows = (typeof SEED !== "undefined" ? SEED : []).map((r, i) => ({
      id: "s" + (i + 1), name: r[0], spec: r[1], cls: r[2], ph: r[3], area: r[4], note: r[5] || "", updatedAt: "",
    }));
    writeLocal(rows);
    return rows;
  }
  function writeLocal(rows) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(rows)); } catch (e) {}
  }

  return {
    get mode() { return mode; },

    async init(onChange) {
      notify = onChange;
      const ready = CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase;
      if (!ready) {
        mode = "local";
        notify(readLocal());
        return mode;
      }
      mode = "supabase";
      client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      await loadRemote();
      // Realtime: أي تعديل من جهاز ثاني يحدّث القائمة هنا
      client.channel("doctors-live")
        .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => loadRemote().catch(console.error))
        .subscribe();
      return mode;
    },

    async add(body) {
      if (mode === "supabase") {
        const { error } = await client.from(TABLE).insert(toRow(body));
        if (error) throw error;
        return loadRemote();
      }
      const rows = readLocal();
      rows.push({ ...body, id: "l" + Date.now().toString(36) });
      writeLocal(rows); notify(rows);
    },

    async update(id, body) {
      if (mode === "supabase") {
        const { error } = await client.from(TABLE).update(toRow(body)).eq("id", id);
        if (error) throw error;
        return loadRemote();
      }
      const rows = readLocal().map(r => (r.id === id ? { ...body, id } : r));
      writeLocal(rows); notify(rows);
    },

    async remove(id) {
      if (mode === "supabase") {
        const { error } = await client.from(TABLE).delete().eq("id", id);
        if (error) throw error;
        return loadRemote();
      }
      const rows = readLocal().filter(r => r.id !== id);
      writeLocal(rows); notify(rows);
    },
  };
})();
