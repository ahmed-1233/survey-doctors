// ===== أدوات =====
const $ = id => document.getElementById(id);
const norm = s => (s||"").replace(/[أإآٱ]/g,"ا").replace(/[ىئ]/g,"ي").replace(/ؤ/g,"و").replace(/ة/g,"ه").replace(/[ً-ْـ]/g,"").replace(/\s+/g," ").toLowerCase().trim();
const esc = s => String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clean = s => String(s??"").replace(/\s+/g," ").trim();
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const BASE_SPECS=["اطفال","باطنية","نسائية","جراحة عامة","جراحة كلى","كسور","انف واذن وحنجرة","جملة عصبية"];
const BASE_AREAS=["شارع الاطباء","الهورة","النعمانية","الحي"];
let toastT; function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2200)}

// ===== الحالة =====
let canWrite=false;
let DATA=[], AREAS=[], SPECS=[], PHARMS=[], loaded=false, unavailable=false;
let AREA_WORDS={}, SPEC_WORDS={};
const FILLER=new Set(["دكتور","دكتوره","دكاتره","دكاتير","د","طبيب","اطباء","في","ب","منطقه","اختصاص","كل","اريد","ابي"]);

function rebuild(){
  const by=(arr,base)=>[...base.filter(b=>arr.includes(b)),...[...new Set(arr)].filter(x=>!base.includes(x)).sort((a,b)=>a.localeCompare(b,"ar"))];
  AREAS=by(DATA.map(d=>d.area).filter(Boolean),BASE_AREAS);
  // التخصصات الأساسية تظهر دائماً حتى لو ما بيها أطباء بعد
  SPECS=[...BASE_SPECS,...[...new Set(DATA.map(d=>d.spec).filter(Boolean))].filter(x=>!BASE_SPECS.includes(x)).sort((a,b)=>a.localeCompare(b,"ar"))];
  PHARMS=[...new Set(DATA.map(d=>d.ph).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ar"));
  AREA_WORDS={};
  AREAS.forEach(a=>{const n=norm(a);AREA_WORDS[n]=a;AREA_WORDS[n.replace(/^ال/,"")]=a;});
  if(AREAS.includes("شارع الاطباء")) Object.assign(AREA_WORDS,{"الاطباء":"شارع الاطباء","شارع":"شارع الاطباء"});
  SPEC_WORDS={};
  const add=(ws,ss)=>{ss=ss.filter(s=>SPECS.includes(s));if(ss.length)ws.forEach(w=>SPEC_WORDS[norm(w)]=ss)};
  SPECS.forEach(s=>add([s],[s]));
  add(["طفل","الاطفال"],["اطفال"]);
  add(["باطني","باطنيه","الباطنيه"],["باطنية"]);
  add(["نسائيه","نسايه","نساييه","نسائي","نسا","نساء","النسائيه","توليد"],["نسائية"]);
  add(["جراحه","جراح","جراحين"],SPECS.filter(s=>norm(s).startsWith("جراحه")));
  add(["عامه","جراحه عامه"],["جراحة عامة"]);
  add(["كلي","كليه","كلى","مسالك","بوليه","جراحه كلي"],["جراحة كلى"]);
  add(["عظام","عظم","كسر","مفاصل"],["كسور"]);
  add(["انف","اذن","اذان","حنجره","انف واذن","انف واذن وحنجره","ent"],["انف واذن وحنجرة"]);
  add(["عصبيه","عصبي","اعصاب","جمله عصبيه","دماغ","مخ واعصاب"],["جملة عصبية"]);
  // القوائم
  const keep=(id,all,label)=>{const el=$(id),v=el.value;el.innerHTML=`<option value="">${label}</option>`+all.map(x=>`<option>${esc(x)}</option>`).join("");el.value=all.includes(v)?v:"";};
  keep("fArea",AREAS,"جميع المناطق"); keep("fSpec",SPECS,"جميع التخصصات");
  $("dl-spec").innerHTML=SPECS.map(s=>`<option value="${esc(s)}">`).join("");
  $("dl-area").innerHTML=AREAS.map(s=>`<option value="${esc(s)}">`).join("");
  $("dl-ph").innerHTML=PHARMS.map(s=>`<option value="${esc(s)}">`).join("");
  $("c-spec").innerHTML=SPECS.map(s=>`<button type="button">${esc(s)}</button>`).join("");
}

function parse(q){
  const w=norm(q).split(" ").filter(Boolean);let area=null,specs=null;const rest=[];
  for(let i=0;i<w.length;i++){
    const two=i+1<w.length?w[i]+" "+w[i+1]:null;
    if(two&&!area&&AREA_WORDS[two]){area=AREA_WORDS[two];i++;continue}
    if(two&&SPEC_WORDS[two]&&(!specs||specs.length>1)){specs=SPEC_WORDS[two];i++;continue}
    if(!area&&AREA_WORDS[w[i]]){area=AREA_WORDS[w[i]];continue}
    const s=SPEC_WORDS[w[i]];
    if(s&&(!specs||(specs.length>1&&s.length===1&&specs.includes(s[0])))){specs=s;continue}
    if(FILLER.has(w[i]))continue;
    rest.push(w[i]);
  }
  return{area,specs,rest};
}

// ===== العرض =====
const initials=n=>{const p=String(n).replace(/^(عبد|ال)\s*/,"").split(" ").filter(Boolean);return (p[0]?.[0]||"")+"‌"+(p[1]?.[0]||"");};
const ICON_PIN='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const ICON_RX='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M12 10.5v6M9 13.5h6M8 7V4h8v3"/></svg>';
let P={area:null,specs:null,rest:[]},RES=[];
const clsKey=c=>({A:0,B:1,C:2}[c]??3);
function hl(s){
  s=String(s??"");const n=norm(s);if(!P.rest.length||n.length!==s.length)return esc(s);
  for(const w of P.rest){const i=n.indexOf(w);if(i>-1)return esc(s.slice(0,i))+"<mark>"+esc(s.slice(i,i+w.length))+"</mark>"+esc(s.slice(i+w.length));}
  return esc(s);
}
function render(){
  const parsed=parse($("q").value);
  const area=$("fArea").value||parsed.area;
  const specs=$("fSpec").value?[$("fSpec").value]:parsed.specs;
  const cls=$("fCls").value;
  P={area,specs,rest:parsed.rest};
  ["fArea","fSpec","fCls"].forEach(id=>$(id).classList.toggle("on",!!$(id).value));
  $("clear").hidden=!$("q").value&&!$("fArea").value&&!$("fSpec").value&&!cls;
  store.set("dr-q",$("q").value);

  const total=DATA.length,a=DATA.filter(d=>d.cls==="A").length;
  $("stats").innerHTML=loaded?[[total,"طبيب"],[a,"الفئة A"],[SPECS.length,"تخصصات"],[AREAS.length,"مناطق"]].map(([n,l])=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`).join(""):"";
  $("addBtn").hidden=!(loaded&&canWrite);
  $("hint").textContent=loaded&&canWrite?"اضغط على أي طبيب لتعديل بياناته":"";

  if(unavailable){
    $("count").innerHTML="";$("copy").hidden=true;
    $("list").innerHTML=`<li class="state"><strong>تعذّر فتح الدليل</strong><span>تعذّر الاتصال بقاعدة البيانات. تحقّق من مفاتيح Supabase في ملف js/config.js ومن اتصالك بالإنترنت، ثم أعد تحميل الصفحة.</span></li>`;
    return;
  }
  if(!loaded) return;
  if(!total){
    $("count").innerHTML="";$("copy").hidden=true;
    $("list").innerHTML=`<li class="state"><strong>الدليل فارغ</strong><span>${canWrite?"أضف أول طبيب لبدء الدليل.":"لا يوجد أطباء بعد."}</span>${canWrite?`<button class="pill solid" type="button" data-add>طبيب جديد</button>`:""}</li>`;
    return;
  }
  RES=DATA.filter(d=>(!area||d.area===area)&&(!specs||specs.includes(d.spec))&&(!cls||d.cls===cls)&&(!P.rest.length||P.rest.every(w=>norm(d.name+" "+d.ph+" "+d.note).includes(w))))
    .sort((x,y)=>clsKey(x.cls)-clsKey(y.cls)||SPECS.indexOf(x.spec)-SPECS.indexOf(y.spec)||x.name.localeCompare(y.name,"ar"));
  const sl=specs?(specs.length>1?"جراحة":specs[0]):null;
  $("count").innerHTML=`<b>${RES.length}</b>${esc([sl?"طبيب "+sl:"طبيب",area?"· "+area:"",cls?"· الفئة "+cls:""].join(" "))}`;
  $("copy").hidden=!RES.length;
  const tag=canWrite?"button":"div";
  $("list").innerHTML=RES.length?RES.map(d=>`<li class="row"><${tag} ${canWrite?`type="button" data-id="${esc(d.id)}" aria-label="تعديل د. ${esc(d.name)}"`:""}>
      <div class="av" aria-hidden="true">${esc(initials(d.name))}</div>
      <div class="name">د. ${hl(d.name)}</div>
      <div class="cls ${["A","B","C"].includes(d.cls)?d.cls:"C"}" aria-label="الفئة ${esc(d.cls)}">الفئة ${esc(d.cls||"–")}</div>
      <div class="meta">${specs&&specs.length===1?"":`<b>${esc(d.spec)}</b>`}${area?"":`<span>${ICON_PIN}${esc(d.area)}</span>`}<span>${ICON_RX}${d.ph?hl(d.ph):"بدون صيدلية"}</span>${d.note?`<span>${esc(d.note)}</span>`:""}</div>
    </${tag}></li>`).join("")
    :`<li class="state"><strong>لا توجد نتائج</strong><span>جرّب تخصصًا أو منطقة أخرى، أو امسح عوامل التصفية.</span><button class="pill ghost" type="button" data-reset>مسح البحث</button></li>`;
}

// ===== الأحداث: البحث =====
$("q").addEventListener("input",()=>{ // الكتابة تمسح عوامل التصفية المختارة لتجنّب التعارض
  $("fArea").value="";$("fSpec").value="";render();
});
["fArea","fSpec","fCls"].forEach(id=>$(id).addEventListener("change",render));
function resetAll(){$("q").value="";$("fArea").value="";$("fSpec").value="";$("fCls").value="";render();$("q").focus();}
$("clear").onclick=resetAll;
document.addEventListener("keydown",e=>{if(e.key==="/"&&document.activeElement===document.body){e.preventDefault();$("q").focus();$("q").select();}});
$("list").addEventListener("click",e=>{
  if(e.target.closest("[data-reset]"))return resetAll();
  if(e.target.closest("[data-add]"))return openSheet(null);
  const b=e.target.closest("[data-id]");if(b)openSheet(DATA.find(d=>d.id===b.dataset.id));
});
$("copy").onclick=async function(){
  const txt=$("count").textContent.trim()+"\n\n"+RES.map((d,i)=>`${i+1}. د. ${d.name} | ${d.cls} | ${d.spec} | ${d.area}${d.ph?" | صيدلية "+d.ph:""}`).join("\n");
  try{await navigator.clipboard.writeText(txt)}catch(err){const t=$("copyBuf");t.value=txt;t.select();try{document.execCommand("copy")}catch(e){}}
  toast("تم نسخ القائمة، يمكنك لصقها في واتساب");
};

// ===== الإضافة والتعديل =====
let editing=null;
const sheet=$("sheet");
function setErr(id,m){const e=$("e-"+id);e.textContent=m||"";e.hidden=!m;}
function openSheet(d){
  editing=d||null;
  $("sheetT").textContent=d?"تعديل بيانات طبيب":"طبيب جديد";
  $("f-name").value=d?.name||"";
  $("f-spec").value=d?.spec||($("fSpec").value||P.specs?.[0]||"");
  $("f-area").value=d?.area||($("fArea").value||P.area||"");
  $("f-ph").value=d?.ph||"";
  $("f-note").value=d?.note||"";
  const c=d?.cls||"B";($("f-cls"+c)||$("f-clsB")).checked=true;
  ["name","spec","area"].forEach(k=>setErr(k));
  $("delBtn").hidden=!d;$("delBtn").classList.remove("arm");$("delBtn").textContent="حذف";
  $("stamp").textContent=d?.updatedAt?"آخر تعديل: "+new Date(d.updatedAt).toLocaleString("ar-IQ",{dateStyle:"medium",timeStyle:"short"}):"";
  sheet.showModal();
  setTimeout(()=>$("f-name").focus(),30);
}
function closeSheet(){sheet.close();editing=null;}
$("addBtn").onclick=()=>openSheet(null);
$("close").onclick=closeSheet;$("cancel").onclick=closeSheet;
sheet.addEventListener("click",e=>{if(e.target===sheet)closeSheet();});
$("c-spec").addEventListener("click",e=>{const b=e.target.closest("button");if(b){$("f-spec").value=b.textContent;setErr("spec");}});

$("form").addEventListener("submit",async e=>{
  e.preventDefault();
  const body={
    name:clean($("f-name").value).replace(/^د\.?\s*/,""),
    spec:clean($("f-spec").value),
    cls:document.querySelector('input[name="cls"]:checked')?.value||"B",
    ph:clean($("f-ph").value),
    area:clean($("f-area").value),
    note:clean($("f-note").value),
    updatedAt:new Date().toISOString()
  };
  // توحيد الكتابة مع الموجود (نسائيه = نسائية …)
  const match=(v,list)=>list.find(x=>norm(x)===norm(v))||v;
  body.spec=match(SPEC_WORDS[norm(body.spec)]?.length===1?SPEC_WORDS[norm(body.spec)][0]:body.spec,SPECS);
  body.area=match(AREA_WORDS[norm(body.area)]||body.area,AREAS);
  body.ph=match(body.ph,PHARMS);
  let bad=false;
  if(!body.name){setErr("name","يرجى كتابة اسم الطبيب");bad=true}else setErr("name");
  if(!body.spec){setErr("spec","يرجى اختيار التخصص");bad=true}else setErr("spec");
  if(!body.area){setErr("area","يرجى كتابة المنطقة");bad=true}else setErr("area");
  if(!bad&&!editing){
    const dup=DATA.find(d=>norm(d.name)===norm(body.name)&&d.area===body.area&&d.spec===body.spec);
    if(dup){setErr("name","هذا الطبيب مسجّل مسبقًا بالمنطقة والتخصص نفسيهما");bad=true}
  }
  if(bad)return;
  const btn=$("saveBtn");btn.disabled=true;btn.textContent="جاري الحفظ…";
  try{
    const wasEdit=!!editing;
    if(wasEdit) await Store.update(editing.id,body);
    else await Store.add(body);
    closeSheet();toast(wasEdit?"تم حفظ التعديل":"تمت إضافة د. "+body.name);
  }catch(err){
    console.error(err);toast("تعذّر الحفظ، تحقّق من الاتصال بالإنترنت وحاول مرة أخرى");
  }finally{btn.disabled=false;btn.textContent="حفظ";}
});
$("delBtn").onclick=async function(){
  if(!editing)return;
  if(!this.classList.contains("arm")){this.classList.add("arm");this.textContent="هل أنت متأكد؟ اضغط مرة أخرى";setTimeout(()=>{this.classList.remove("arm");this.textContent="حذف"},4000);return;}
  const name=editing.name;
  try{await Store.remove(editing.id);closeSheet();toast("تم حذف د. "+name);}
  catch(err){console.error(err);toast("تعذّر الحذف، حاول مرة أخرى");}
};

// ===== البداية =====
$("q").value=store.get("dr-q")??"";
rebuild();render();
canWrite=true;
Store.init(rows=>{
  DATA=rows.filter(d=>d.name);
  loaded=true;rebuild();render();
}).then(mode=>{
  if(mode==="local") console.info("البيانات محفوظة على هذا المتصفح فقط. أضف مفاتيح Supabase في js/config.js لمشاركتها.");
}).catch(err=>{
  console.error(err);unavailable=true;render();
});
