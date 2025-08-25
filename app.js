/* ===== Estado ===== */
const S = {
  apps: [],                  // {name, cat, mins}
  triggers: new Set(),       // "mañana","tarde","noche","notifs","aburrimiento","ansiedad"
  profile: {reduce:30, offline:2},
  pro:false,
  kids: [],                  // {id,name,age,dailyMins,bedtime,whitelist,schoolFrom,schoolTo,stars:[...]}
  parentPIN: ""
};
const PRO_UNLOCK_CODE = "DEMO-PRO-2025"; // reemplazar por backend/Stripe webhook real
const CATS = ["Social","Video","Mensajería","Noticias","Juegos","Compras","Trabajo/Estudio","Otros"];

/* ===== Helpers ===== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const toast = (msg, t=2400) => {
  let el = $("#toast"); if(!el){ el = document.createElement("div"); el.id="toast"; document.body.appendChild(el); }
  el.textContent = msg; el.style.display="block"; setTimeout(()=>{el.style.display="none"}, t);
};
function save(){ localStorage.setItem("detoxState", JSON.stringify({
  apps:S.apps, triggers:[...S.triggers], profile:S.profile, pro:S.pro, kids:S.kids, parentPIN:S.parentPIN
})); }
function load(){
  try{
    const d = JSON.parse(localStorage.getItem("detoxState")||"{}");
    if(d.apps) S.apps = d.apps;
    if(d.triggers) S.triggers = new Set(d.triggers);
    if(d.profile) S.profile = d.profile;
    if(d.pro) S.pro = d.pro;
    if(d.kids) S.kids = d.kids;
    if(d.parentPIN) S.parentPIN = d.parentPIN;
  }catch(e){}
}

/* ===== Onboarding ===== */
function initOnboarding(){
  const modal = $("#onboard");
  $("#openOnboard")?.addEventListener("click",()=> modal.style.display="grid");
  $("#closeOnboard")?.addEventListener("click",()=> modal.style.display="none");
}

/* ===== Dark toggle (placeholder visual) ===== */
$("#darkToggle")?.addEventListener("change", e=>{
  document.documentElement.style.setProperty('--bg', e.target.checked ? '#0f172a' : '#f8fafc');
});

/* ===== Diagnóstico ===== */
function calcScore(){
  let sum=0, max=0;
  $$(".q").forEach(r=>{
    const w = Number(r.dataset.weight||1);
    sum += Number(r.value)*w;
    max += 5*w;
  });
  const pct = Math.round((sum/max)*100);
  $("#score").textContent = isNaN(pct)?"–":pct;
  $("#scoreBar").style.width = (pct||0)+"%";
  const t=$("#scoreTag");
  if(pct<35){t.textContent="saludable"; t.className="tag ok";}
  else if(pct<65){t.textContent="riesgo medio"; t.className="tag warn";}
  else {t.textContent="alto riesgo"; t.className="tag bad";}
}
$$(".q").forEach(i=>i.addEventListener("input",calcScore));

/* ===== Triggers & Perfil ===== */
$("#triggers")?.addEventListener("click",e=>{
  if(e.target.classList.contains("chip")){
    const v = e.target.dataset.v;
    if(S.triggers.has(v)){ S.triggers.delete(v); e.target.style.outline=""; }
    else { S.triggers.add(v); e.target.style.outline="2px solid var(--brand)"; }
    save();
  }
});
$("#saveProfile")?.addEventListener("click",()=>{
  let reduce = Number($("#goalReduce").value||30);
  let offline = Number($("#goalOffline").value||2);
  reduce = Math.min(80, Math.max(10, reduce));
  offline = Math.min(8, Math.max(1, offline));
  $("#goalReduce").value = reduce;
  $("#goalOffline").value = offline;
  S.profile.reduce = reduce; S.profile.offline = offline; save();
  toast("Preferencias guardadas.");
});

/* ===== Apps ===== */
function drawApps(){
  const tb = $("#appsTable tbody"); if(!tb) return;
  tb.innerHTML="";
  S.apps.forEach((a,i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input class="input appName" value="${a.name}"></td>
      <td>
        <select class="input appCat">
          ${CATS.map(c=>`<option ${c===a.cat?"selected":""}>${c}</option>`).join("")}
        </select>
      </td>
      <td><input class="input appMins" type="number" min="0" max="600" value="${a.mins}"></td>
      <td><button class="btn alt del" title="Eliminar">✖</button></td>`;
    tr.querySelector(".del").onclick=()=>{ if(confirm("¿Eliminar esta app?")){ S.apps.splice(i,1); save(); drawApps(); calcTotals(); } };
    tr.querySelector(".appName").onchange=e=>{a.name=e.target.value; save()};
    tr.querySelector(".appCat").onchange=e=>{a.cat=e.target.value; save()};
    tr.querySelector(".appMins").onchange=e=>{
      let v = Number(e.target.value||0);
      v = Math.max(0, Math.min(600, v));
      e.target.value = v; a.mins=v; save(); calcTotals();
    };
    tb.appendChild(tr);
  });
}
function addApp(name){
  name = (name||"").trim(); if(!name){ toast("Ingresá un nombre de app"); return; }
  S.apps.push({name,cat:guessCat(name),mins:30});
  save(); drawApps(); calcTotals();
}
function guessCat(n){
  const s=n.toLowerCase();
  if(/insta|tiktok|facebook|x |twitter/.test(s)) return "Social";
  if(/youtube|netflix|prime|hbo|twitch/.test(s)) return "Video";
  if(/whatsapp|telegram|signal|messages/.test(s)) return "Mensajería";
  if(/news|notic|diario|feed/.test(s)) return "Noticias";
  if(/game|juego|roblox|fortnite|pubg|mobile/.test(s)) return "Juegos";
  if(/amazon|mercado|shopping|aliexpress/.test(s)) return "Compras";
  if(/meet|teams|zoom|docs|notion|drive|slack/.test(s)) return "Trabajo/Estudio";
  return "Otros";
}
function calcTotals(){
  const tot = S.apps.reduce((a,b)=>a + (Number(b.mins)||0),0);
  $("#totalMins").textContent = tot;
  const tag = $("#riskTag");
  if(tot<=120){ tag.textContent="bajo"; tag.className="tag ok"; }
  else if(tot<=240){ tag.textContent="medio"; tag.className="tag warn"; }
  else { tag.textContent="alto"; tag.className="tag bad"; }
}
$("#addApp")?.addEventListener("click",()=>{ addApp($("#newApp").value); $("#newApp").value=""; });
$("#clearAll")?.addEventListener("click",()=>{
  if(!S.apps.length) return;
  if(confirm("¿Limpiar todas las apps cargadas?")){ S.apps=[]; save(); drawApps(); calcTotals(); }
});
$$(".preset").forEach(b=>b.onclick=()=>addApp(b.textContent));

/* ===== Recomendaciones y Plan ===== */
function blockCat(cat,horario,tool,swap){
  return {
    title:`🚫 ${cat}`, badge:"bloqueo", severity:"warn",
    body:`Bloquear ${cat} en <b>${horario}</b>. Herramienta: <b>${tool}</b>. ${swap||""}`,
    actions:["Definir lista blanca (banco, mapas)","Sacar la app de la pantalla principal","Modo oscuro + brillo bajo nocturno"]
  }
}
function tactica(t,desc,benef){
  return { title:`✅ ${t}`, body:`${desc}. <i>${benef}</i>`, actions:null };
}
function generateRecs(){
  const recs = [];
  const byCat = {};
  S.apps.forEach(a => byCat[a.cat]=(byCat[a.cat]||0)+(Number(a.mins)||0));
  const tot = S.apps.reduce((a,b)=>a+Number(b.mins||0),0);
  const targetTot = Math.max(0, Math.round(tot*(1 - (S.profile.reduce/100))));

  if((byCat["Social"]||0) > 60) recs.push(blockCat("Social","09:00–12:00 y 14:00–18:00","Freedom / BlockSite","Reemplazo: leer 10 páginas o paseo 10’"));
  if((byCat["Video"]||0) > 60) recs.push(blockCat("Video","Todo el día excepto 20:30–21:30","Screen Time / Digital Wellbeing","Reemplazo: Lo-Fi + Pomodoro"));
  if((byCat["Mensajería"]||0) > 45) recs.push(blockCat("Mensajería","tandas 12:30 y 18:30","Focus mode (iOS/Android)","Reemplazo: notas offline"));
  if((byCat["Juegos"]||0) > 30) recs.push(blockCat("Juegos","Solo fines de semana 17:00–19:00","App limits","Reemplazo: caminata/ejercicio"));

  if(S.triggers.has("noche")) recs.push(tactica("Corte nocturno 90’","Cargar fuera del dormitorio + luz cálida + libro físico","Mejor sueño y enfoque"));
  if(S.triggers.has("mañana")) recs.push(tactica("Ventana OFF 60’ post-despertar","Hidratación + journaling 5’","Evita dopamina temprana"));
  if(S.triggers.has("notifs")) recs.push(tactica("Resumen de notificaciones","Programar resúmenes 12:00 y 19:00; solo VIP en tiempo real","Menos micro-interrupciones"));
  if(S.triggers.has("ansiedad")) recs.push(tactica("Protocolo Calma 3-3-3","Respirar 3x3; mirar 3 objetos; tocar 3 superficies","Corta el impulso de checkeo"));

  recs.push({
    title:"📉 Objetivo semanal",
    body:`Reducir de <b>${tot}→${targetTot} min/día</b> (${S.profile.reduce}%). Crear <b>${S.profile.offline} h</b> de “modo avión” diarios.`,
    actions:["Activar ‘Focus’ lun-vie","Revisar mensajería en 2 tandas","Bloquear Social/Video en horario laboral"]
  });

  const box = $("#recs"); box.innerHTML="";
  recs.forEach(r=>{
    const c = document.createElement("div");
    c.className="card";
    c.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:center">
        <div class="h2">${r.title}</div>
        <span class="tag ${r.severity||'ok'}">${r.badge||'recomendado'}</span>
      </div>
      <div class="small" style="margin:6px 0 12px">${r.body}</div>
      ${r.actions?`<ul class="small" style="line-height:1.9">${r.actions.map(a=>`<li>• ${a}</li>`).join("")}</ul>`:""}
    `;
    box.appendChild(c);
  });

  buildPlan(byCat, tot, targetTot);
  toast("Recomendaciones generadas.");
}
$("#genPlan")?.addEventListener("click", generateRecs);

function buildPlan(byCat, tot, targetTot){
  const plan = $("#plan"); plan.innerHTML="";
  const offlineH = S.profile.offline;

  const blocks = [
    {title:"Lun–Vie trabajo profundo", body:"Bloques 09:00–12:00 y 14:00–18:00 con Social/Video bloqueado."},
    {title:"Resumen notificaciones", body:"Solo 12:00 y 19:00. Mensajería fuera de esos bloques."},
    {title:"Ventana sin pantallas", body:`${offlineH} horas/día (ideal noche o mañana).`},
    {title:"Uso recreativo controlado", body:"Video solo 20:30–21:30. Juegos fin de semana 17:00–19:00."}
  ];
  blocks.forEach(b=>{
    const c=document.createElement("div"); c.className="card";
    c.innerHTML=`<div class="h2">🗓️ ${b.title}</div><div class="small">${b.body}</div>`;
    plan.appendChild(c);
  });

  $("#printPlan")?.addEventListener("click",()=>window.print());
  $("#exportIcs")?.addEventListener("click",()=>exportICS());
}

/* ===== Export .ICS ===== */
function exportICS(){
  const pad = n=>String(n).padStart(2,"0");
  const now = new Date();
  function dtstamp(d){return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;}

  const nextMonday = new Date();
  const day = nextMonday.getDay(); // 0=Dom
  const diff = (1 + 7 - day) % 7; // 1=Lun
  nextMonday.setDate(nextMonday.getDate()+diff);

  function vevent(dayOffset, sh, sm, eh, em, sum, desc, loc=""){
    const d1 = new Date(nextMonday); d1.setDate(d1.getDate()+dayOffset); d1.setHours(sh,sm,0,0);
    const d2 = new Date(nextMonday); d2.setDate(d2.getDate()+dayOffset); d2.setHours(eh,em,0,0);
    return [
      "BEGIN:VEVENT",
      `DTSTAMP:${dtstamp(now)}`,
      `DTSTART:${dtstamp(d1)}`,
      `DTEND:${dtstamp(d2)}`,
      `SUMMARY:${sum}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:${loc}`,
      "RRULE:FREQ=WEEKLY;COUNT=12",
      "END:VEVENT"
    ].join("\r\n");
  }

  const events = [];
  // Deep Work lun–vie 9–12 y 14–18
  for(let d=0; d<5; d++){
    events.push(vevent(d,9,0,12,0,"Deep Work (sin social/video)","Bloque foco"));
    events.push(vevent(d,14,0,18,0,"Deep Work (sin social/video)","Bloque foco"));
    events.push(vevent(d,12,0,12,15,"Resumen notificaciones","Revisar solo VIP"));
    events.push(vevent(d,19,0,19,15,"Resumen notificaciones","Revisar solo VIP"));
  }
  // Ventana sin pantallas diaria (ej. 21:00–23:00)
  for(let d=0; d<7; d++){
    events.push(vevent(d,21,0,23,0,"Ventana sin pantallas","Higiene del sueño"));
  }
  // Recreativo video 20:30–21:30
  for(let d=0; d<7; d++){
    events.push(vevent(d,20,30,21,30,"Video recreativo controlado","Evitar binge"));
  }
  // Juegos fin de semana 17–19
  events.push(vevent(5,17,0,19,0,"Juegos (permitido)","Límite sano"));
  events.push(vevent(6,17,0,19,0,"Juegos (permitido)","Límite sano"));

  const ics = [
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//DetoxDigital//Plan//ES",
    ...events,
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([ics], {type:"text/calendar;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "plan-desintoxicacion.ics";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast("Archivo .ics exportado.");
}

/* ===== Temporizador Pomodoro + Gráfico ===== */
let pomoTimer=null, pomoPhase="work", cyclesLeft=0, workMs=0, breakMs=0, phaseEnd=0;
const trendData = JSON.parse(localStorage.getItem("detoxTrend")||"[]"); // [{date:'YYYY-MM-DD', minutes: N}]

function beep(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type="sine"; o.frequency.setValueAtTime(880, ctx.currentTime);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime+0.02);
    o.connect(g); g.connect(ctx.destination); o.start();
    setTimeout(()=>{o.stop(); ctx.close()}, 300);
  }catch(e){}
}
function startPomodoro(){
  const w = Math.min(90, Math.max(10, Number($("#pomoWork").value||25)));
  const b = Math.min(30, Math.max(3, Number($("#pomoBreak").value||5)));
  const c = Math.min(8, Math.max(1, Number($("#pomoCycles").value||4)));
  $("#pomoWork").value=w; $("#pomoBreak").value=b; $("#pomoCycles").value=c;

  workMs = w*60*1000; breakMs = b*60*1000; cyclesLeft = c;
  pomoPhase="work"; phaseEnd = Date.now()+workMs;
  $("#pomoStatus").textContent = `Trabajando ${w} min…`;
  clearInterval(pomoTimer);
  pomoTimer = setInterval(tickPomodoro, 500);
  toast("Pomodoro iniciado.");
}
function stopPomodoro(){
  clearInterval(pomoTimer); pomoTimer=null;
  $("#pomoStatus").textContent = "Listo.";
}
function tickPomodoro(){
  const left = Math.max(0, phaseEnd - Date.now());
  const mm = Math.floor(left/60000), ss = Math.floor((left%60000)/1000);
  $("#pomoStatus").textContent = `${pomoPhase==="work"?"Trabajando":"Descanso"} — ${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  if(left<=0){
    beep();
    if(pomoPhase==="work"){
      // sumar minutos al día
      addTrendMinutes(Math.round(workMs/60000));
      pomoPhase="break"; phaseEnd = Date.now()+breakMs;
      $("#pomoStatus").textContent = `Descanso ${Math.round(breakMs/60000)} min…`;
    }else{
      cyclesLeft--;
      if(cyclesLeft<=0){ stopPomodoro(); toast("Ciclos completados 🎉"); return; }
      pomoPhase="work"; phaseEnd = Date.now()+workMs;
      $("#pomoStatus").textContent = `Trabajando ${Math.round(workMs/60000)} min…`;
    }
    drawChart();
  }
}
$("#pomoStart")?.addEventListener("click", startPomodoro);
$("#pomoStop")?.addEventListener("click", stopPomodoro);

function addTrendMinutes(mins){
  const today = new Date().toISOString().slice(0,10);
  const idx = trendData.findIndex(d=>d.date===today);
  if(idx>-1) trendData[idx].minutes += mins;
  else trendData.push({date:today, minutes:mins});
  while(trendData.length>7) trendData.shift();
  localStorage.setItem("detoxTrend", JSON.stringify(trendData));
}

/* ===== Chart.js ===== */
let chart;
function drawChart(){
  if(!$("#trend")) return;
  const labels = trendData.map(d=>d.date);
  const data = trendData.map(d=>d.minutes);
  if(chart){ chart.destroy(); }
  chart = new Chart($("#trend"), {
    type:'line',
    data:{ labels, datasets:[{ label:"Minutos de trabajo profundo", data, tension:.35 }]},
    options:{
      plugins:{ legend:{labels:{color:"#cbd5e1"}}},
      scales:{
        x:{ ticks:{color:"#93a3b8"}, grid:{color:"#1f2536"} },
        y:{ ticks:{color:"#93a3b8"}, grid:{color:"#1f2536"} }
      }
    }
  });
}

/* ===== Paywall / Multipagos (placeholders) ===== */
$("#btnStripe")?.addEventListener("click",()=> window.open("https://buy.stripe.com/test_XXXX", "_blank"));
$("#btnPayPal")?.addEventListener("click",()=> window.open("https://www.paypal.com/checkoutnow?token=XXXX", "_blank"));
$("#btnMP")?.addEventListener("click",()=> window.open("https://www.mercadopago.com/checkout/v1/redirect?pref_id=XXXX", "_blank"));
$("#btnPaddle")?.addEventListener("click",()=> window.open("https://checkout.paddle.com/checkout/XXXX", "_blank"));
$("#unlockBtn")?.addEventListener("click",()=>{
  const code = ($("#unlockCode").value||"").trim();
  const msg = $("#unlockMsg");
  if(!code) { msg.textContent="Ingresá tu código"; return; }
  if(code===PRO_UNLOCK_CODE){ S.pro=true; save(); msg.textContent="✅ PRO habilitado"; toast("PRO activado"); }
  else { msg.textContent="❌ Código inválido"; }
});

/* ===== Familia / Niños ===== */
function drawKids(){
  const box=$("#kidsList"); if(!box) return; box.innerHTML="";
  S.kids.forEach((k,i)=>{
    const c=document.createElement("div"); c.className="card";
    c.innerHTML = `
      <div class="h2">👧 ${k.name} (${k.age})</div>
      <div class="small">Límite: ${k.dailyMins} min/día • Dormir: ${k.bedtime}</div>
      <div class="small">Lista blanca: ${k.whitelist||"-"}</div>
      <div class="small">Escuela: ${k.schoolFrom||"-"}–${k.schoolTo||"-"}</div>
      <div class="row" style="margin-top:8px">
        <button class="btn alt" data-i="${i}" data-act="stars">⭐ +1</button>
        <button class="btn alt" data-i="${i}" data-act="del">🗑️ Eliminar</button>
      </div>
    `;
    box.appendChild(c);
  });
  box.querySelectorAll("button").forEach(b=>{
    const i = Number(b.dataset.i), act=b.dataset.act;
    b.onclick=()=>{
      if(act==="del"){
        if(!pinCheck()) return;
        if(confirm("¿Eliminar perfil?")){ S.kids.splice(i,1); save(); drawKids(); }
      }else if(act==="stars"){
        S.kids[i].stars = (S.kids[i].stars||0)+1; save(); toast(`⭐ ${S.kids[i].name}: ${S.kids[i].stars} estrellas`);
      }
    }
  });
}
function pinCheck(){
  const pin = prompt("Ingresá tu PIN parental para continuar:");
  if(!S.parentPIN){ toast("Definí un PIN primero."); return false; }
  if(pin===S.parentPIN) return true;
  toast("PIN incorrecto."); return false;
}
$("#savePIN")?.addEventListener("click",()=>{
  const p = ($("#parentPIN").value||"").trim();
  if(p.length<4 || p.length>6) { toast("El PIN debe tener 4–6 dígitos"); return; }
  S.parentPIN=p; save(); toast("PIN guardado");
});
$("#addKid")?.addEventListener("click",()=>{
  if(!S.parentPIN){ toast("Definí un PIN antes de crear perfiles."); return; }
  if(!pinCheck()) return;
  const name = ($("#kidName").value||"").trim(); if(!name){ toast("Nombre requerido"); return; }
  let age = Number($("#kidAge").value||10); age = Math.max(4, Math.min(17, age));
  let mins = Number($("#kidDailyMins").value||60); mins = Math.max(15, Math.min(240, mins));
  const bedtime = $("#kidBedtime").value||"21:00";
  const whitelist = ($("#kidWhitelist").value||"").trim();
  const schoolFrom = $("#kidSchoolFrom").value||"08:00";
  const schoolTo = $("#kidSchoolTo").value||"13:00";
  S.kids.push({id:crypto.randomUUID(), name, age, dailyMins:mins, bedtime, whitelist, schoolFrom, schoolTo, stars:0});
  save(); drawKids(); toast("Perfil creado");
});
$("#kidGenPlan")?.addEventListener("click",()=>{
  if(!S.kids.length){ toast("Crea al menos un perfil"); return; }
  const box=$("#kidPlanBox"); box.innerHTML="";
  S.kids.forEach(k=>{
    const c=document.createElement("div"); c.className="card";
    const rec = [
      `Máx ${k.dailyMins} min/día`,
      `Dormir ${k.bedtime} (sin pantallas 90’ antes)`,
      `Escuela ${k.schoolFrom}–${k.schoolTo} (bloqueo total)`,
      `Apps permitidas: ${k.whitelist||"definir"}`
    ];
    c.innerHTML=`<div class="h2">📋 Reglas — ${k.name}</div><ul class="small" style="line-height:1.9">${rec.map(r=>`<li>• ${r}</li>`).join("")}</ul>`;
    box.appendChild(c);
  });
  toast("Plan infantil generado");
});
$("#kidExportIcs")?.addEventListener("click",()=>{
  if(!S.kids.length){ toast("Crea al menos un perfil"); return; }
  if(!pinCheck()) return;
  const pad=n=>String(n).padStart(2,"0");
  const now=new Date();
  const nextMonday=new Date(); const day=nextMonday.getDay(); nextMonday.setDate(nextMonday.getDate()+((1+7-day)%7));
  function dtstamp(d){return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;}
  functio
