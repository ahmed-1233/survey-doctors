// ===== قسم الصيدليات =====
// يستخدم أدوات app.js: $ و norm و esc و clean و toast و initials و store و DATA (الأطباء)

const Pharm = (() => {
  const CLS_ORDER = { "A+": 0, A: 1, B: 2, C: 3, "": 4 };
  let LIST = [], AREAS = [], loaded = false, failed = false, editing = null, P = { area: null, rest: [] }, RES = [];

  const clsClass = c => (c === "A+" ? "AP" : ["A", "B", "C"].includes(c) ? c : "");
  const ICON_PIN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const ICON_PH = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>';
  const ICON_BLD = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M10 21v-4h4v4"/></svg>';

  // كم طبيب مرتبط بهاي الصيدلية (نفس الاسم، ونفس المنطقة إذا المنطقة مشتركة)
  function doctorsOf(p) {
    if (typeof DATA === "undefined") return [];
    const n = norm(p.name);
    const same = DATA.filter(d => norm(d.ph) === n);
    const inArea = same.filter(d => d.area === p.area);
    return inArea.length ? inArea : (DATA.some(d => d.area === p.area) ? [] : same);
  }

  function rebuild() {
    const counts = {};
    LIST.forEach(p => (counts[p.area] = (counts[p.area] || 0) + 1));
    AREAS = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b, "ar"));
    const el = $("pArea"), v = el.value;
    el.innerHTML = `<option value="">جميع المناطق</option>` + AREAS.map(a => `<option>${esc(a)}</option>`).join("");
    el.value = AREAS.includes(v) ? v : "";
    $("dl-parea").innerHTML = AREAS.map(a => `<option value="${esc(a)}">`).join("");
  }

  function parse(q) {
    const words = norm(q).split(" ").filter(Boolean);
    let area = null; const rest = [];
    const areaN = AREAS.map(a => [a, norm(a), norm(a).replace(/^ال/, "")]);
    for (let i = 0; i < words.length; i++) {
      const two = i + 1 < words.length ? words[i] + " " + words[i + 1] : null;
      const hit2 = !area && two && areaN.find(([, n, s]) => n === two || s === two);
      if (hit2) { area = hit2[0]; i++; continue; }
      const hit = !area && areaN.find(([, n, s]) => n === words[i] || s === words[i]);
      if (hit) { area = hit[0]; continue; }
      if (["صيدليه", "صيدليات", "صيدلية", "في", "منطقه"].includes(words[i])) continue;
      rest.push(words[i]);
    }
    return { area, rest };
  }

  function hl(s) {
    s = String(s ?? ""); const n = norm(s);
    if (!P.rest.length || n.length !== s.length) return esc(s);
    for (const w of P.rest) { const i = n.indexOf(w); if (i > -1) return esc(s.slice(0, i)) + "<mark>" + esc(s.slice(i, i + w.length)) + "</mark>" + esc(s.slice(i + w.length)); }
    return esc(s);
  }

  function renderStats() {
    const top = LIST.filter(p => p.cls === "A+" || p.cls === "A").length;
    const linked = LIST.filter(p => doctorsOf(p).length).length;
    $("stats").innerHTML = loaded ? [[LIST.length, "صيدلية"], [top, "الفئة A و A+"], [AREAS.length, "مناطق"], [linked, "مرتبطة بأطباء"]]
      .map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("") : "";
  }

  function render() {
    $("tcPh").textContent = loaded ? LIST.length : "";
    if (window.ACTIVE_TAB !== "ph") return;
    renderStats();
    const parsed = parse($("pq").value);
    const area = $("pArea").value || parsed.area;
    const cls = $("pCls").value;
    P = { area, rest: parsed.rest };
    ["pArea", "pCls"].forEach(id => $(id).classList.toggle("on", !!$(id).value));
    $("pclear").hidden = !$("pq").value && !$("pArea").value && !cls;
    store.set("ph-q", $("pq").value);
    $("addBtn").hidden = !loaded || failed;

    if (failed) {
      $("pcount").innerHTML = ""; $("pcopy").hidden = true;
      $("plist").innerHTML = `<li class="state"><strong>جدول الصيدليات مو موجود بعد</strong><span>شغّل ملف supabase/pharmacies.sql بـ Supabase ← SQL Editor، وبعدين حدّث الصفحة.</span></li>`;
      return;
    }
    if (!loaded) return;
    RES = LIST.filter(p =>
      (!area || p.area === area) &&
      (!cls || (cls === "none" ? !p.cls : p.cls === cls)) &&
      (!P.rest.length || P.rest.every(w => norm([p.name, p.complex, p.address, p.manager, p.phone, p.note].join(" ")).includes(w)))
    ).sort((a, b) => (CLS_ORDER[a.cls] ?? 4) - (CLS_ORDER[b.cls] ?? 4) || AREAS.indexOf(a.area) - AREAS.indexOf(b.area) || a.name.localeCompare(b.name, "ar"));

    $("pcount").innerHTML = `<b>${RES.length}</b>${esc(["صيدلية", area ? "· " + area : "", cls ? "· " + (cls === "none" ? "بدون فئة" : "الفئة " + cls) : ""].join(" "))}`;
    $("pcopy").hidden = !RES.length;
    $("plist").innerHTML = RES.length ? RES.map(p => {
      const docs = doctorsOf(p).length;
      return `<li class="row"><div class="rowbtn" role="button" tabindex="0" data-pid="${esc(p.id)}" aria-label="تعديل صيدلية ${esc(p.name)}">
        <div class="av" aria-hidden="true">${esc(initials(p.name))}</div>
        <div class="name">صيدلية ${hl(p.name)}</div>
        ${p.cls ? `<div class="cls ${clsClass(p.cls)}">الفئة ${esc(p.cls)}</div>` : `<div class="cls none"></div>`}
        <div class="meta">
          ${area ? "" : `<b>${esc(p.area)}</b>`}
          ${p.address ? `<span>${ICON_PIN}${hl(p.address)}</span>` : ""}
          ${p.complex ? `<span>${ICON_BLD}مجمع ${hl(p.complex)}</span>` : ""}
          ${p.manager || p.phone ? `<span>${ICON_PH}${hl(p.manager || "")}${p.phone ? ` <a class="tel" href="tel:${esc(p.phone)}" dir="ltr">${hl(p.phone)}</a>` : ""}</span>` : ""}
          ${docs ? `<button class="docs" type="button" data-docs="${esc(p.name)}">${docs} ${docs > 1 && docs < 11 ? "أطباء" : "طبيب"}</button>` : ""}
          ${p.note ? `<span class="note-txt">${esc(p.note)}</span>` : ""}
        </div></div></li>`;
    }).join("") : `<li class="state"><strong>لا توجد نتائج</strong><span>جرّب منطقة أو اسم ثاني، أو امسح عوامل التصفية.</span><button class="pill ghost" type="button" data-preset>مسح البحث</button></li>`;
  }

  // ---------- الأحداث ----------
  function reset() { $("pq").value = ""; $("pArea").value = ""; $("pCls").value = ""; render(); $("pq").focus(); }
  $("pq").addEventListener("input", () => { $("pArea").value = ""; render(); });
  ["pArea", "pCls"].forEach(id => $(id).addEventListener("change", render));
  $("pclear").onclick = reset;
  $("plist").addEventListener("click", e => {
    if (e.target.closest("[data-preset]")) return reset();
    if (e.target.closest("a.tel")) return; // يخلي الاتصال يشتغل
    const d = e.target.closest("[data-docs]");
    if (d) { e.stopPropagation(); return window.showDoctorsOfPharm(d.dataset.docs); }
    const r = e.target.closest("[data-pid]");
    if (r) openSheet(LIST.find(p => p.id === r.dataset.pid));
  });
  $("plist").addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const r = e.target.closest("[data-pid]"); if (!r || e.target !== r) return;
    e.preventDefault(); openSheet(LIST.find(p => p.id === r.dataset.pid));
  });
  $("pcopy").onclick = async () => {
    const txt = $("pcount").textContent.trim() + "\n\n" + RES.map((p, i) =>
      `${i + 1}. صيدلية ${p.name}${p.cls ? " | " + p.cls : ""} | ${p.area}${p.address ? " - " + p.address : ""}${p.phone ? " | " + p.phone : ""}`).join("\n");
    try { await navigator.clipboard.writeText(txt); } catch (err) { const t = $("copyBuf"); t.value = txt; t.select(); try { document.execCommand("copy"); } catch (e) {} }
    toast("تم نسخ القائمة، يمكنك لصقها في واتساب");
  };

  // ---------- الإضافة والتعديل ----------
  const sheet = $("psheet");
  function setErr(id, m) { const e = $("pe-" + id); e.textContent = m || ""; e.hidden = !m; }
  function openSheet(p) {
    editing = p || null;
    $("psheetT").textContent = p ? "تعديل صيدلية" : "صيدلية جديدة";
    $("p-name").value = p?.name || "";
    $("p-area").value = p?.area || $("pArea").value || P.area || "";
    $("p-address").value = p?.address || "";
    $("p-complex").value = p?.complex || "";
    $("p-manager").value = p?.manager || "";
    $("p-phone").value = p?.phone || "";
    $("p-note").value = p?.note || "";
    const c = p?.cls || "";
    document.querySelectorAll('input[name="pcls"]').forEach(r => (r.checked = r.value === c));
    setErr("name"); setErr("area");
    $("pdelBtn").hidden = !p; $("pdelBtn").classList.remove("arm"); $("pdelBtn").textContent = "حذف";
    $("pstamp").textContent = p?.updatedAt ? "آخر تعديل: " + new Date(p.updatedAt).toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" }) : "";
    sheet.showModal();
    setTimeout(() => $("p-name").focus(), 30);
  }
  function closeSheet() { sheet.close(); editing = null; }
  $("pclose").onclick = closeSheet; $("pcancel").onclick = closeSheet;
  sheet.addEventListener("click", e => { if (e.target === sheet) closeSheet(); });

  $("pform").addEventListener("submit", async e => {
    e.preventDefault();
    const body = {
      name: clean($("p-name").value).replace(/^صيدلي[ةه]\s+/, ""),
      area: clean($("p-area").value),
      address: clean($("p-address").value),
      complex: clean($("p-complex").value),
      cls: document.querySelector('input[name="pcls"]:checked')?.value || "",
      manager: clean($("p-manager").value),
      phone: clean($("p-phone").value).replace(/[^\d+]/g, ""),
      note: clean($("p-note").value),
      updatedAt: new Date().toISOString(),
    };
    body.area = AREAS.find(a => norm(a) === norm(body.area)) || body.area;
    let bad = false;
    if (!body.name) { setErr("name", "يرجى كتابة اسم الصيدلية"); bad = true; } else setErr("name");
    if (!body.area) { setErr("area", "يرجى كتابة المنطقة"); bad = true; } else setErr("area");
    if (!bad && !editing && LIST.some(p => norm(p.name) === norm(body.name) && p.area === body.area)) {
      setErr("name", "هذه الصيدلية مسجّلة مسبقًا في المنطقة نفسها"); bad = true;
    }
    if (bad) return;
    const btn = $("psaveBtn"); btn.disabled = true; btn.textContent = "جاري الحفظ…";
    try {
      const wasEdit = !!editing;
      if (wasEdit) await PharmStore.update(editing.id, body); else await PharmStore.add(body);
      closeSheet(); toast(wasEdit ? "تم حفظ التعديل" : "تمت إضافة صيدلية " + body.name);
    } catch (err) { console.error(err); toast("تعذّر الحفظ، تحقّق من الاتصال بالإنترنت وحاول مرة أخرى"); }
    finally { btn.disabled = false; btn.textContent = "حفظ"; }
  });
  $("pdelBtn").onclick = async function () {
    if (!editing) return;
    if (!this.classList.contains("arm")) { this.classList.add("arm"); this.textContent = "هل أنت متأكد؟ اضغط مرة أخرى"; setTimeout(() => { this.classList.remove("arm"); this.textContent = "حذف"; }, 4000); return; }
    const name = editing.name;
    try { await PharmStore.remove(editing.id); closeSheet(); toast("تم حذف صيدلية " + name); }
    catch (err) { console.error(err); toast("تعذّر الحذف، حاول مرة أخرى"); }
  };

  // ---------- البداية ----------
  $("pq").value = store.get("ph-q") ?? "";
  PharmStore.init(rows => { LIST = rows.filter(p => p.name); loaded = true; failed = false; rebuild(); render(); })
    .catch(err => { console.error(err); failed = true; loaded = true; render(); });

  return { render, openSheet, renderStats };
})();

// ===== التبديل بين الأطباء والصيدليات =====
function setTab(t) {
  window.ACTIVE_TAB = t;
  document.querySelectorAll(".tabs [data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
  $("viewDoc").hidden = t !== "doc";
  $("viewPh").hidden = t !== "ph";
  $("addLbl").textContent = t === "ph" ? "صيدلية جديدة" : "طبيب جديد";
  store.set("tab", t);
  if (t === "ph") Pharm.render(); else render();
}
document.querySelector(".tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });
window.showDoctorsOfPharm = name => { setTab("doc"); $("fArea").value = ""; $("fSpec").value = ""; $("fCls").value = ""; $("q").value = name; render(); window.scrollTo({ top: 0, behavior: "smooth" }); };
setTab(store.get("tab") === "ph" ? "ph" : "doc");
