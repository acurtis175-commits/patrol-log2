import { useState, useEffect, useRef, useCallback } from "react";

const TABS = ["Log", "History", "Patrol", "Shift"];
const INACTIVITY_MS = 60 * 60 * 1000;
const ADMIN_EMAIL = "acurtis175@yahoo.com";
const ADMIN_PASSWORD = "marlborough1";

const incidentTypes = ["Theft","Assault","Disturbance","Vandalism","Suspicious Activity","Welfare Check","Domestic","Court","Administrative Duties","Other"];
const stopReasons   = ["Moving Violation","Equipment Violation","Expired Tags","Reckless Driving","DUI Suspicion","BOLO","Other"];
const dispositions  = ["Warning","Citation","Arrest","No Action","Referred"];

const DEFAULT_LOCATIONS = [
  { id:1,  name:"Sumneytown Hotel",                 address:"3188 Main St, Sumneytown, PA 18054",            type:"business", notes:"Restaurant & bar, est. 1762" },
  { id:2,  name:"Wetlands Bar & Restaurant",        address:"5275 McLean Station Rd, Green Lane, PA 18054",  type:"business", notes:"Bar/grill at Macoby Run Golf Course" },
  { id:3,  name:"SLM Facility Solutions",           address:"5000 Commerce Dr, Green Lane, PA 18054",        type:"business", notes:"Commercial office, Mon–Fri" },
  { id:4,  name:"SLM Waste & Recycling",            address:"5000 Commerce Dr, Green Lane, PA 18054",        type:"business", notes:"Commercial, Mon–Fri" },
  { id:5,  name:"Wood Products and Services",       address:"4099 Commerce Dr, Green Lane, PA 18054",        type:"business", notes:"Manufacturing, Thu–Sat" },
  { id:6,  name:"Eastern Environmental Contractor", address:"6304 Fifth St, Green Lane, PA 18054",           type:"business", notes:"Contractor, Mon–Fri" },
  { id:7,  name:"1037 Crusher Road",                address:"1037 Crusher Rd, Marlborough Township, PA",     type:"business", notes:"" },
  { id:8,  name:"Macoby Run Golf Course",           address:"5275 McLean Station Rd, Green Lane, PA 18054",  type:"area",     notes:"Golf course, busy on weekends" },
  { id:9,  name:"Commerce Drive Business Park",     address:"Commerce Dr, Green Lane, PA 18054",             type:"area",     notes:"Industrial/commercial cluster" },
  { id:10, name:"Geryville Pike Corridor",          address:"Geryville Pike, Green Lane, PA 18054",          type:"area",     notes:"Township road, residential & rural" },
  { id:11, name:"Sumneytown Village Area",          address:"Main St, Sumneytown, PA 18054",                 type:"area",     notes:"Historic village, township jurisdiction" },
  { id:12, name:"McLean Station Rd Area",           address:"McLean Station Rd, Green Lane, PA 18054",       type:"area",     notes:"Rural road, northern township" },
  { id:13, name:"Unami Park",                       address:"Marlborough Township, PA 18054",                type:"area",     notes:"Township park" },
  { id:14, name:"Finland Road Park",                address:"Finland Rd, Marlborough Township, PA 18054",    type:"area",     notes:"Township park" },
  { id:15, name:"Skymount Lake Parking Area",       address:"Skymount Lake, Marlborough Township, PA 18054", type:"area",     notes:"Fishing permit area — monitor for unauthorized access" },
];

// ── Theme ─────────────────────────────────────────────────────────────────────
function T(dark) {
  return dark ? {
    bg:"#080c14", bgCard:"#0d1424", bgInput:"#111827", bgHeader:"#0a0f1e",
    border:"#1e2d47", borderMid:"#243352", text:"#e8edf5", textSub:"#7a90b0",
    textMuted:"#3d5070", accent:"#3b82f6", accentGlow:"#3b82f633",
    tabBg:"#0a0f1e", tabActive:"#3b82f6",
    incAcc:"#60a5fa", incBg:"#0d1e3a", incBdr:"#1a3560",
    stopAcc:"#34d399", stopBg:"#0a2218", stopBdr:"#0e3322",
    noteAcc:"#a78bfa", noteBg:"#160d30", noteBdr:"#271650",
  } : {
    bg:"#f0f4f8", bgCard:"#ffffff", bgInput:"#f8fafc", bgHeader:"#0f1f3d",
    border:"#dde4ef", borderMid:"#c8d4e8", text:"#0d1b2e", textSub:"#4a607a",
    textMuted:"#8fa0b5", accent:"#1d4ed8", accentGlow:"#1d4ed822",
    tabBg:"#ffffff", tabActive:"#1d4ed8",
    incAcc:"#1d4ed8", incBg:"#eef3ff", incBdr:"#c7d7fa",
    stopAcc:"#059669", stopBg:"#ecfdf5", stopBdr:"#a7f3d0",
    noteAcc:"#7c3aed", noteBg:"#f5f3ff", noteBdr:"#ddd6fe",
  };
}

function fTime(d){ return d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}); }
function fDate(d){ return d.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric",year:"numeric"}); }
function fDateS(d){ return d.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"}); }
function ago(d){
  const m=Math.floor((new Date()-d)/60000);
  if(m<1) return "just now"; if(m<60) return `${m}m ago`;
  return `${Math.floor(m/60)}h ${m%60}m ago`;
}
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }

function buildReport({shiftStart,shiftEnd,entries,completedSuggestions,serviceLog,shiftNotes}){
  const L="─".repeat(44), D="═".repeat(44);
  const inc=entries.filter(e=>e.kind==="incident"), stp=entries.filter(e=>e.kind==="stop");
  const dur=Math.floor((shiftEnd-shiftStart)/60000);
  let r=`${D}\n  MARLBOROUGH TOWNSHIP POLICE DEPARTMENT\n  END-OF-SHIFT REPORT\n${D}\n\n`;
  r+=`Date:         ${fDate(shiftStart)}\nShift Start:  ${fTime(shiftStart)}\nShift End:    ${fTime(shiftEnd)}\nDuration:     ${Math.floor(dur/60)}h ${dur%60}m\n\n`;
  r+=`${L}\nSUMMARY\n${L}\nIncidents:      ${inc.length}\nTraffic Stops:  ${stp.length}\nArrests:        ${inc.filter(e=>e.arrested).length}\nPatrols Done:   ${completedSuggestions.length}\n\n`;
  r+=`${L}\nSERVICE STATUS LOG\n${L}\n`;
  if(!serviceLog.length) r+="No status changes recorded.\n";
  else [...serviceLog].reverse().forEach(s=>{ r+=`[${fTime(s.time)}]  ${s.status}\n`; });
  r+=`\n${L}\nINCIDENTS (${inc.length})\n${L}\n`;
  if(!inc.length) r+="None.\n";
  else inc.forEach((e,i)=>{ r+=`\n#${i+1} [${fTime(e.time)}] ${e.type.toUpperCase()}\nLocation:  ${e.location}\n`; if(e.caseNum) r+=`Case #:    ${e.caseNum}\n`; if(e.description) r+=`Notes:     ${e.description}\n`; if(e.arrested) r+="** ARREST MADE **\n"; });
  r+=`\n${L}\nTRAFFIC STOPS (${stp.length})\n${L}\n`;
  if(!stp.length) r+="None.\n";
  else stp.forEach((e,i)=>{ r+=`\n#${i+1} [${fTime(e.time)}] TRAFFIC STOP\nReason:      ${e.reason}\n`; if(e.disposition) r+=`Disposition: ${e.disposition}\n`; if(e.notes) r+=`Notes:       ${e.notes}\n`; });
  r+=`\n${L}\nPATROL LOCATIONS (${completedSuggestions.length})\n${L}\n`;
  if(!completedSuggestions.length) r+="None.\n";
  else completedSuggestions.forEach((c,i)=>{ r+=`#${i+1} [${fTime(c.time)}] ${c.name}\n`; if(c.address) r+=`     ${c.address}\n`; });
  r+=`\n${L}\nSHIFT NOTES\n${L}\n${shiftNotes.trim()||"None."}\n\n${D}\n  END OF REPORT — Marlborough Township, Montgomery County, PA\n${D}\n`;
  return r;
}

// ── Admin Modal ───────────────────────────────────────────────────────────────
function AdminModal({onSuccess,onCancel,dark}){
  const th=T(dark);
  const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [show,setShow]=useState(false);
  function go(){ if(email.trim().toLowerCase()===ADMIN_EMAIL&&pw===ADMIN_PASSWORD) onSuccess(); else setErr("Invalid credentials."); }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(5,10,20,0.8)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(4px)"}}>
      <div style={{background:th.bgCard,borderRadius:16,padding:28,width:"100%",maxWidth:360,border:`1px solid ${th.border}`,boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{width:52,height:52,background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 12px"}}>🔒</div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:20,fontWeight:700,color:th.text,letterSpacing:1}}>ADMIN ACCESS</div>
          <div style={{fontSize:12,color:th.textSub,marginTop:4,fontFamily:"'IBM Plex Mono',monospace"}}>Restricted — Authorized Personnel Only</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <FieldLabel th={th}>Email Address</FieldLabel>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Enter admin email"
              style={{width:"100%",background:th.bgInput,border:`1px solid ${th.border}`,borderRadius:8,padding:"11px 14px",color:th.text,fontSize:13,fontFamily:"'IBM Plex Mono',monospace",outline:"none",boxSizing:"border-box",marginTop:4}}/>
          </div>
          <div>
            <FieldLabel th={th}>Password</FieldLabel>
            <div style={{position:"relative",marginTop:4}}>
              <input value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} type={show?"text":"password"} placeholder="Enter password"
                style={{width:"100%",background:th.bgInput,border:`1px solid ${th.border}`,borderRadius:8,padding:"11px 42px 11px 14px",color:th.text,fontSize:13,fontFamily:"'IBM Plex Mono',monospace",outline:"none",boxSizing:"border-box"}}/>
              <button onClick={()=>setShow(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,padding:0,color:th.textSub}}>{show?"🙈":"👁️"}</button>
            </div>
          </div>
          {err&&<div style={{fontSize:12,color:"#f87171",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:6,padding:"8px 12px",fontFamily:"'IBM Plex Mono',monospace"}}>{err}</div>}
          <button onClick={go} style={{marginTop:4,width:"100%",padding:"13px",background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",cursor:"pointer",letterSpacing:2,textTransform:"uppercase",boxShadow:"0 4px 16px rgba(59,130,246,0.4)"}}>AUTHENTICATE</button>
          <button onClick={onCancel} style={{width:"100%",padding:"10px",background:"none",border:`1px solid ${th.border}`,borderRadius:10,color:th.textSub,fontSize:12,fontWeight:600,fontFamily:"'Rajdhani',sans-serif",cursor:"pointer",letterSpacing:1}}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

// ── Storage helpers ───────────────────────────────────────────────────────────
const SK = {
  dark:       "pl_dark",
  inService:  "pl_inService",
  serviceLog: "pl_serviceLog",
  entries:    "pl_entries",
  shiftStart: "pl_shiftStart",
  shiftNotes: "pl_shiftNotes",
  completed:  "pl_completed",
  locations:  "pl_locations",
};

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const parsed = JSON.parse(v);
    // Revive Date objects in arrays
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        if (item && item.time) return { ...item, time: new Date(item.time) };
        return item;
      });
    }
    return parsed;
  } catch { return fallback; }
}

function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function PatrolLog(){
  const [dark,setDark]=useState(()=>load(SK.dark, true));
  const th=T(dark);

  const [isAdmin,setIsAdmin]=useState(false);
  const [showAdminLogin,setShowAdminLogin]=useState(false);
  const [showEndShiftConfirm,setShowEndShiftConfirm]=useState(false);
  const [inService,setInService]=useState(()=>load(SK.inService, false));
  const [serviceLog,setServiceLog]=useState(()=>load(SK.serviceLog, []));
  const [tab,setTab]=useState("Log");
  const [logType,setLogType]=useState("incident");
  const [entries,setEntries]=useState(()=>load(SK.entries, []));
  const [shiftStart,setShiftStart]=useState(()=>{ const s=localStorage.getItem(SK.shiftStart); return s?new Date(JSON.parse(s)):new Date(); });
  const [shiftNotes,setShiftNotes]=useState(()=>load(SK.shiftNotes, ""));
  const [saved,setSaved]=useState(false);
  const [now,setNow]=useState(new Date());
  const [shareStatus,setShareStatus]=useState(null);

  const [locations,setLocations]=useState(()=>load(SK.locations, DEFAULT_LOCATIONS));
  const [filterType,setFilterType]=useState("all");
  const [searchQ,setSearchQ]=useState("");
  const [suggestion,setSuggestion]=useState(null);
  const [lastActivity,setLastActivity]=useState(new Date());
  const [newLocName,setNewLocName]=useState("");
  const [newLocType,setNewLocType]=useState("business");
  const [newLocNotes,setNewLocNotes]=useState("");
  const [newLocAddr,setNewLocAddr]=useState("");
  const [showAddForm,setShowAddForm]=useState(false);
  const [completed,setCompleted]=useState(()=>load(SK.completed, []));
  const timer=useRef(null);

  const [iF,setIF]=useState({caseNum:"",type:"",location:"",description:"",arrested:false});
  const [tF,setTF]=useState({reason:"",disposition:"",notes:""});
  const [nF,setNF]=useState({note:""});

  // ── Persist to localStorage on every change ──
  useEffect(()=>save(SK.dark, dark), [dark]);
  useEffect(()=>save(SK.inService, inService), [inService]);
  useEffect(()=>save(SK.serviceLog, serviceLog), [serviceLog]);
  useEffect(()=>save(SK.entries, entries), [entries]);
  useEffect(()=>save(SK.shiftStart, shiftStart.toISOString()), [shiftStart]);
  useEffect(()=>save(SK.shiftNotes, shiftNotes), [shiftNotes]);
  useEffect(()=>save(SK.completed, completed), [completed]);
  useEffect(()=>save(SK.locations, locations), [locations]);

  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),30000); return ()=>clearInterval(t); },[]);

  const triggerSug=useCallback(()=>{ if(!locations.length) return; setSuggestion(pick(locations)); if(navigator.vibrate) navigator.vibrate([200,100,200,100,400]); },[locations]);
  const resetTimer=useCallback(()=>{ setLastActivity(new Date()); if(timer.current) clearTimeout(timer.current); if(inService) timer.current=setTimeout(triggerSug,INACTIVITY_MS); },[triggerSug,inService]);

  useEffect(()=>{ if(timer.current) clearTimeout(timer.current); if(inService){ setLastActivity(new Date()); timer.current=setTimeout(triggerSug,INACTIVITY_MS); } else setSuggestion(null); return ()=>clearTimeout(timer.current); },[inService,triggerSug]);

  function toggleService(){
    const next=!inService;
    setInService(next);
    setServiceLog(l=>[{status:next?"IN SERVICE":"OUT OF SERVICE",time:new Date()},...l]);
    setEntries(e=>[{kind:"note",note:next?"🟢 Officer went IN SERVICE":"🔴 Officer went OUT OF SERVICE",time:new Date(),id:Date.now()},...e]);
  }
  function flash(){ setSaved(true); setTimeout(()=>setSaved(false),1800); }
  function logEntry(entry){ setEntries(e=>[{...entry,time:new Date(),id:Date.now()},...e]); resetTimer(); flash(); setTab("History"); }
  function submitInc(){ if(!iF.type||!iF.location) return; logEntry({kind:"incident",...iF}); setIF({caseNum:"",type:"",location:"",description:"",arrested:false}); }
  function submitStop(){ if(!tF.reason) return; logEntry({kind:"stop",...tF}); setTF({reason:"",disposition:"",notes:""}); }
  function submitNote(){ if(!nF.note.trim()) return; logEntry({kind:"note",...nF}); setNF({note:""}); }
  function markPatrolled(loc){ setCompleted(c=>[{...loc,time:new Date()},...c]); logEntry({kind:"note",note:`✓ Patrolled: ${loc.name}`}); setSuggestion(null); }
  function dismissSug(){ setSuggestion(null); resetTimer(); }
  function newSug(){ if(!locations.length||!inService) return; setSuggestion(pick(locations)); if(navigator.vibrate) navigator.vibrate([100,50,100]); }
  function addLoc(){ if(!newLocName.trim()||!isAdmin) return; setLocations(l=>[...l,{id:Date.now(),name:newLocName.trim(),type:newLocType,notes:newLocNotes.trim(),address:newLocAddr.trim()}]); setNewLocName("");setNewLocType("business");setNewLocNotes("");setNewLocAddr("");setShowAddForm(false); }
  function removeLoc(id){ if(!isAdmin) return; setLocations(l=>l.filter(x=>x.id!==id)); }

  async function shareReport(){
    setShareStatus("sharing");
    const txt=buildReport({shiftStart,shiftEnd:new Date(),entries,completedSuggestions:completed,serviceLog,shiftNotes});
    const subj=`Shift Report — Marlborough Twp PD — ${fDateS(shiftStart)}`;
    try{
      if(navigator.share){ await navigator.share({title:subj,text:txt}); setShareStatus("done"); }
      else{ window.open(`mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(txt)}`,"_blank"); setShareStatus("done"); }
    } catch(e){ if(e.name!=="AbortError") setShareStatus("error"); else setShareStatus(null); }
    setTimeout(()=>setShareStatus(null),3000);
  }

  function endShift(){
    // Share report first, then clear shift data
    shareReport().finally(()=>{
      const next=new Date();
      setEntries([]);
      setServiceLog([]);
      setCompleted([]);
      setShiftNotes("");
      setInService(false);
      setShiftStart(next);
      setSuggestion(null);
      setShowEndShiftConfirm(false);
      setTab("Log");
    });
  }

  const minSince=Math.floor((now-lastActivity)/60000);
  const pct=inService?Math.min(100,(minSince/60)*100):0;
  const timerColor=pct>85?"#ef4444":pct>60?"#f59e0b":"#10b981";
  const durStr=()=>{ const d=Math.floor((now-shiftStart)/60000); return `${Math.floor(d/60)}h ${d%60}m`; };
  const filteredLocs=locations.filter(l=>(filterType==="all"||l.type===filterType)&&(!searchQ||l.name.toLowerCase().includes(searchQ.toLowerCase())||(l.address||"").toLowerCase().includes(searchQ.toLowerCase())));
  const suggVis=suggestion&&inService;

  const typeIcon=(t)=>t==="business"?"🏪":t==="traffic"?"🚦":"📍";
  const tagCfg=(k)=>k==="incident"?{a:th.incAcc,bg:th.incBg,bd:th.incBdr,label:"INCIDENT"}:k==="stop"?{a:th.stopAcc,bg:th.stopBg,bd:th.stopBdr,label:"TRAFFIC STOP"}:{a:th.noteAcc,bg:th.noteBg,bd:th.noteBdr,label:"SHIFT NOTE"};

  const IS=dark ? {background:th.bgInput,border:`1px solid ${th.border}`,borderRadius:8,padding:"11px 14px",color:th.text,fontSize:14,fontFamily:"'IBM Plex Mono',monospace",outline:"none",width:"100%",transition:"border-color 0.2s"} : {background:th.bgInput,border:`1px solid ${th.border}`,borderRadius:8,padding:"11px 14px",color:th.text,fontSize:14,fontFamily:"'IBM Plex Mono',monospace",outline:"none",width:"100%"};
  const TS={...IS,resize:"vertical",lineHeight:1.6};
  const SS={...IS,appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center"};

  const canUseTab = (t) => {
    if(t==="Shift") return true;
    if(t==="Patrol") return inService||isAdmin;
    return inService;
  };

  return (
    <div style={{minHeight:"100vh",background:th.bg,color:th.text,fontFamily:"'IBM Plex Mono','Courier New',monospace",maxWidth:480,margin:"0 auto",transition:"background 0.3s,color 0.3s"}}>

      {showAdminLogin && <AdminModal dark={dark} onSuccess={()=>{setIsAdmin(true);setShowAdminLogin(false);}} onCancel={()=>setShowAdminLogin(false)}/>}

      {/* ── End Shift Confirmation ── */}
      {showEndShiftConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(5,10,20,0.85)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(4px)"}}>
          <div style={{background:th.bgCard,borderRadius:16,padding:28,width:"100%",maxWidth:360,border:"1px solid rgba(239,68,68,0.3)",boxShadow:"0 24px 64px rgba(239,68,68,0.2)"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{width:52,height:52,background:"rgba(239,68,68,0.15)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 12px",border:"1px solid rgba(239,68,68,0.3)"}}>⚠️</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:20,fontWeight:700,color:"#ef4444",letterSpacing:1}}>END SHIFT</div>
              <div style={{fontSize:12,color:th.textSub,marginTop:6,fontFamily:"'IBM Plex Mono',monospace",lineHeight:1.6}}>This will share your end-of-shift report then clear all shift data. Your patrol location list will be preserved. This cannot be undone.</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <button onClick={endShift} style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#dc2626,#ef4444)",border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",cursor:"pointer",letterSpacing:2,textTransform:"uppercase",boxShadow:"0 4px 16px rgba(239,68,68,0.4)"}}>
                SHARE REPORT & END SHIFT
              </button>
              <button onClick={()=>setShowEndShiftConfirm(false)} style={{width:"100%",padding:"11px",background:"none",border:`1px solid ${th.border}`,borderRadius:10,color:th.textSub,fontSize:12,fontWeight:600,fontFamily:"'Rajdhani',sans-serif",cursor:"pointer",letterSpacing:1}}>
                CANCEL — CONTINUE SHIFT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Suggestion Banner ── */}
      {suggVis&&(
        <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:300,background:"linear-gradient(135deg,#d97706,#f59e0b)",padding:"12px 16px",boxShadow:"0 4px 32px rgba(245,158,11,0.5)",animation:"slideDown 0.3s cubic-bezier(.22,1,.36,1)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:3,color:"#78350f",marginBottom:3,fontFamily:"'Rajdhani',sans-serif"}}>⏱ PATROL SUGGESTION</div>
              <div style={{fontSize:16,fontWeight:700,color:"#1c1917",fontFamily:"'Rajdhani',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{suggestion.name}</div>
              <div style={{fontSize:11,color:"#44403c",marginTop:1,fontFamily:"'IBM Plex Mono',monospace"}}>{suggestion.address}</div>
            </div>
            <div style={{display:"flex",gap:6,marginLeft:12,flexShrink:0}}>
              <button onClick={()=>markPatrolled(suggestion)} style={{background:"rgba(0,0,0,0.25)",color:"#fde68a",border:"none",borderRadius:6,padding:"6px 11px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>✓ DONE</button>
              <button onClick={newSug} style={{background:"rgba(255,255,255,0.25)",color:"#78350f",border:"none",borderRadius:6,padding:"6px 10px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif"}}>↻</button>
              <button onClick={dismissSug} style={{background:"transparent",color:"#78350f",border:"none",padding:"6px 8px",fontSize:14,cursor:"pointer"}}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{background:dark?"linear-gradient(160deg,#0a1628 0%,#0f1f3d 100%)":"linear-gradient(160deg,#0f1f3d 0%,#1a3464 100%)",padding:suggVis?"106px 20px 0":"18px 20px 0",position:"sticky",top:0,zIndex:100,transition:"padding 0.3s",boxShadow:dark?"0 1px 0 rgba(59,130,246,0.15)":"0 2px 20px rgba(15,31,61,0.3)"}}>

        {/* Top row */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",paddingBottom:14}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:inService?"#10b981":"#ef4444",boxShadow:inService?"0 0 8px #10b981":"0 0 8px #ef4444",animation:inService?"pulse 2s infinite":"none"}}/>
              <span style={{fontSize:9,fontFamily:"'Rajdhani',sans-serif",letterSpacing:4,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",fontWeight:600}}>MARLBOROUGH TWP PD</span>
            </div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:26,fontWeight:700,color:"#ffffff",letterSpacing:1,lineHeight:1}}>PATROL LOG</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:3,fontFamily:"'IBM Plex Mono',monospace"}}>Montgomery County, PA</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:22,fontWeight:700,color:"#ffffff",letterSpacing:1}}>{fTime(now)}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontFamily:"'IBM Plex Mono',monospace"}}>{fDateS(now)}</div>
            <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:6,alignItems:"center"}}>
              {isAdmin&&<span style={{fontSize:9,background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#1c1917",borderRadius:4,padding:"2px 7px",fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>★ ADMIN</span>}
              <button onClick={()=>setDark(d=>!d)} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,padding:"4px 9px",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:600,letterSpacing:0.5,display:"flex",alignItems:"center",gap:4}}>
                {dark?"☀️":"🌙"} {dark?"LIGHT":"DARK"}
              </button>
            </div>
          </div>
        </div>

        {/* Service toggle */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,paddingBottom:14}}>
          {[{key:true,label:"IN SERVICE",icon:"●",activeColor:"#10b981",glowColor:"rgba(16,185,129,0.35)"},{key:false,label:"OUT OF SERVICE",icon:"■",activeColor:"#ef4444",glowColor:"rgba(239,68,68,0.35)"}].map(({key,label,icon,activeColor,glowColor})=>{
            const active=(key===true&&inService)||(key===false&&!inService);
            return (
              <button key={String(key)} onClick={()=>{ if(key!==inService) toggleService(); }}
                style={{padding:"11px 8px",borderRadius:10,border:`1px solid ${active?activeColor:"rgba(255,255,255,0.08)"}`,cursor:"pointer",background:active?`rgba(${key?'16,185,129':'239,68,68'},0.15)`:"rgba(255,255,255,0.04)",color:active?activeColor:"rgba(255,255,255,0.25)",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:12,letterSpacing:1.5,display:"flex",alignItems:"center",justifyContent:"center",gap:7,transition:"all 0.2s",boxShadow:active?`0 0 20px ${glowColor}`:  "none"}}>
                <span style={{fontSize:8,animation:active&&key?"pulse 2s infinite":"none"}}>{icon}</span>
                {label}
              </button>
            );
          })}
        </div>

        {/* Patrol timer */}
        {inService&&(
          <div style={{paddingBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:2,fontFamily:"'Rajdhani',sans-serif",fontWeight:600}}>PATROL TIMER</span>
              <span style={{fontSize:9,color:pct>75?"#f59e0b":"rgba(255,255,255,0.3)",fontFamily:"'IBM Plex Mono',monospace",fontWeight:pct>75?700:400}}>{minSince<60?`${minSince}m / 60m`:"⚠ OVERDUE"}</span>
            </div>
            <div style={{height:3,background:"rgba(255,255,255,0.07)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:timerColor,borderRadius:2,transition:"width 1s linear,background 0.5s",boxShadow:`0 0 6px ${timerColor}`}}/>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,0.06)",marginLeft:-20,marginRight:-20,paddingLeft:20,paddingRight:20}}>
          {TABS.map(t=>{
            const active=tab===t;
            const accessible=canUseTab(t);
            return (
              <button key={t} onClick={()=>accessible&&setTab(t)}
                style={{flex:1,padding:"11px 0",border:"none",background:"none",color:active?"#ffffff":accessible?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.12)",fontFamily:"'Rajdhani',sans-serif",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",borderBottom:active?"2px solid #3b82f6":"2px solid transparent",cursor:accessible?"pointer":"not-allowed",transition:"color 0.15s",marginBottom:-1,position:"relative"}}>
                {t}
                {!accessible&&<span style={{position:"absolute",top:8,right:8,fontSize:7}}>🔒</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Out of Service notice ── */}
      {!inService&&tab!=="Shift"&&!(tab==="Patrol"&&isAdmin)&&(
        <div style={{margin:"16px 16px 0",background:dark?"rgba(239,68,68,0.06)":"#fff5f5",border:`1px solid ${dark?"rgba(239,68,68,0.2)":"#fecaca"}`,borderRadius:12,padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(239,68,68,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16}}>🔴</div>
          <div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:14,fontWeight:700,color:"#ef4444",letterSpacing:0.5}}>OUT OF SERVICE</div>
            <div style={{fontSize:11,color:th.textSub,marginTop:2,lineHeight:1.5}}>Go <strong style={{color:th.text}}>In Service</strong> to enable logging & patrol suggestions.</div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div style={{padding:"16px 16px 100px",opacity:!inService&&tab!=="Shift"&&!(tab==="Patrol"&&isAdmin)?0.3:1,pointerEvents:!inService&&tab!=="Shift"&&!(tab==="Patrol"&&isAdmin)?"none":"auto",transition:"opacity 0.3s"}}>

        {/* LOG TAB */}
        {tab==="Log"&&(
          <div>
            {/* Type selector */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
              {[["incident","🚨","Incident",th.incAcc,th.incBg,th.incBdr],["stop","🚗","Traffic",th.stopAcc,th.stopBg,th.stopBdr],["note","📝","Note",th.noteAcc,th.noteBg,th.noteBdr]].map(([k,icon,label,acc,bg,bd])=>(
                <button key={k} onClick={()=>setLogType(k)}
                  style={{padding:"13px 4px",border:`1px solid ${logType===k?acc:th.border}`,borderRadius:10,background:logType===k?bg:th.bgCard,color:logType===k?acc:th.textMuted,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",boxShadow:logType===k?`0 0 16px ${acc}22`:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <span style={{fontSize:22}}>{icon}</span>
                  <span style={{fontSize:10,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,letterSpacing:1}}>{label}</span>
                </button>
              ))}
            </div>

            {logType==="incident"&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <Field label="CASE NUMBER" th={th}><input value={iF.caseNum} onChange={e=>setIF(f=>({...f,caseNum:e.target.value}))} placeholder="e.g. 2024-08341" style={IS}/></Field>
                <Field label="INCIDENT TYPE *" th={th}><select value={iF.type} onChange={e=>setIF(f=>({...f,type:e.target.value}))} style={{...SS,color:iF.type?th.text:th.textMuted}}><option value="">Select type…</option>{incidentTypes.map(o=><option key={o}>{o}</option>)}</select></Field>
                <Field label="LOCATION *" th={th}><input value={iF.location} onChange={e=>setIF(f=>({...f,location:e.target.value}))} placeholder="Address or landmark" style={IS}/></Field>
                <Field label="DESCRIPTION" th={th}><textarea value={iF.description} onChange={e=>setIF(f=>({...f,description:e.target.value}))} placeholder="Briefly describe the incident…" rows={3} style={TS}/></Field>
                <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"10px 14px",background:th.bgCard,border:`1px solid ${th.border}`,borderRadius:8}}>
                  <input type="checkbox" checked={iF.arrested} onChange={e=>setIF(f=>({...f,arrested:e.target.checked}))} style={{width:18,height:18,accentColor:"#ef4444"}}/>
                  <span style={{fontSize:12,fontFamily:"'Rajdhani',sans-serif",fontWeight:600,letterSpacing:1,color:iF.arrested?"#ef4444":th.textSub}}>ARREST MADE</span>
                </label>
                <ActionBtn color={th.incAcc} onClick={submitInc}>LOG INCIDENT</ActionBtn>
              </div>
            )}
            {logType==="stop"&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <Field label="REASON FOR STOP *" th={th}><select value={tF.reason} onChange={e=>setTF(f=>({...f,reason:e.target.value}))} style={{...SS,color:tF.reason?th.text:th.textMuted}}><option value="">Select reason…</option>{stopReasons.map(o=><option key={o}>{o}</option>)}</select></Field>
                <Field label="DISPOSITION" th={th}><select value={tF.disposition} onChange={e=>setTF(f=>({...f,disposition:e.target.value}))} style={{...SS,color:tF.disposition?th.text:th.textMuted}}><option value="">Select outcome…</option>{dispositions.map(o=><option key={o}>{o}</option>)}</select></Field>
                <Field label="NOTES" th={th}><textarea value={tF.notes} onChange={e=>setTF(f=>({...f,notes:e.target.value}))} placeholder="Additional details…" rows={3} style={TS}/></Field>
                <ActionBtn color={th.stopAcc} onClick={submitStop}>LOG TRAFFIC STOP</ActionBtn>
              </div>
            )}
            {logType==="note"&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <Field label="SHIFT NOTE *" th={th}><textarea value={nF.note} onChange={e=>setNF({note:e.target.value})} placeholder="Log observations, handoff notes, roll call info…" rows={7} style={TS}/></Field>
                <ActionBtn color={th.noteAcc} onClick={submitNote}>SAVE NOTE</ActionBtn>
              </div>
            )}
            {saved&&(
              <div style={{marginTop:16,padding:"12px 16px",background:dark?"rgba(16,185,129,0.1)":"#ecfdf5",border:`1px solid ${dark?"rgba(16,185,129,0.3)":"#6ee7b7"}`,borderRadius:8,color:"#10b981",fontSize:12,fontWeight:700,textAlign:"center",fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>
                ✓ ENTRY LOGGED SUCCESSFULLY
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab==="History"&&(
          <div>
            <div style={{fontSize:10,color:th.textMuted,letterSpacing:2,marginBottom:14,fontFamily:"'Rajdhani',sans-serif",fontWeight:600}}>{entries.length} {entries.length===1?"ENTRY":"ENTRIES"} THIS SHIFT</div>
            {!entries.length?(
              <div style={{textAlign:"center",padding:"60px 20px",color:th.textMuted}}>
                <div style={{fontSize:48,marginBottom:12,opacity:0.4}}>📋</div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:14,letterSpacing:1}}>NO ENTRIES YET</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {entries.map(e=>{
                  const c=tagCfg(e.kind);
                  return (
                    <div key={e.id} style={{background:th.bgCard,border:`1px solid ${c.bd}`,borderLeft:`3px solid ${c.a}`,borderRadius:10,padding:"13px 15px",boxShadow:dark?`0 2px 12px rgba(0,0,0,0.3)`:"0 1px 4px rgba(0,0,0,0.06)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <span style={{fontSize:9,fontWeight:700,color:c.a,letterSpacing:2,background:c.bg,padding:"3px 8px",borderRadius:4,fontFamily:"'Rajdhani',sans-serif",border:`1px solid ${c.bd}`}}>{c.label}</span>
                        <span style={{fontSize:10,color:th.textMuted,fontFamily:"'IBM Plex Mono',monospace"}}>{fTime(e.time)}</span>
                      </div>
                      {e.kind==="incident"&&<><div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:th.text,fontSize:16,letterSpacing:0.5}}>{e.type}</div><div style={{color:th.textSub,fontSize:12,marginTop:3,fontFamily:"'IBM Plex Mono',monospace"}}>📍 {e.location}</div>{e.caseNum&&<div style={{color:th.textMuted,fontSize:11,marginTop:2,fontFamily:"'IBM Plex Mono',monospace"}}>CASE #{e.caseNum}</div>}{e.description&&<div style={{color:th.textSub,fontSize:12,marginTop:6,lineHeight:1.5}}>{e.description}</div>}{e.arrested&&<div style={{marginTop:8,fontSize:10,color:"#ef4444",fontWeight:700,background:dark?"rgba(239,68,68,0.1)":"#fef2f2",padding:"4px 10px",borderRadius:4,display:"inline-block",fontFamily:"'Rajdhani',sans-serif",letterSpacing:1,border:"1px solid rgba(239,68,68,0.3)"}}>⚠ ARREST MADE</div>}</>}
                      {e.kind==="stop"&&<><div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:th.text,fontSize:16,letterSpacing:0.5}}>{e.reason}</div>{e.disposition&&<div style={{marginTop:6,fontSize:10,color:th.stopAcc,fontWeight:700,background:th.stopBg,padding:"3px 8px",borderRadius:4,display:"inline-block",fontFamily:"'Rajdhani',sans-serif",letterSpacing:1,border:`1px solid ${th.stopBdr}`}}>{e.disposition}</div>}{e.notes&&<div style={{color:th.textSub,fontSize:12,marginTop:6}}>{e.notes}</div>}</>}
                      {e.kind==="note"&&<div style={{color:th.textSub,fontSize:13,lineHeight:1.6}}>{e.note}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PATROL TAB */}
        {tab==="Patrol"&&(
          <div>
            {/* Suggestion engine card */}
            <div style={{background:dark?"rgba(245,158,11,0.06)":"#fffbeb",border:`1px solid ${dark?"rgba(245,158,11,0.2)":"#fde68a"}`,borderRadius:12,padding:16,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,fontWeight:700,letterSpacing:2,color:"#d97706"}}>⚡ SUGGESTION ENGINE</span>
                <span style={{fontSize:10,color:th.textMuted,fontFamily:"'IBM Plex Mono',monospace"}}>{inService?"ACTIVE":"INACTIVE"}</span>
              </div>
              <div style={{fontSize:12,color:th.textSub,marginBottom:14,lineHeight:1.6}}>After 1 hour without activity, the app vibrates and picks a random location. Must be In Service.</div>
              <button onClick={newSug} disabled={!inService} style={{width:"100%",padding:"12px",background:inService?"linear-gradient(135deg,#d97706,#f59e0b)":th.bgCard,border:`1px solid ${inService?"transparent":th.border}`,borderRadius:8,color:inService?"#fff":th.textMuted,fontSize:12,fontWeight:700,cursor:inService?"pointer":"not-allowed",fontFamily:"'Rajdhani',sans-serif",letterSpacing:2,boxShadow:inService?"0 4px 16px rgba(245,158,11,0.3)":"none",transition:"all 0.2s"}}>
                GET PATROL SUGGESTION NOW
              </button>
            </div>

            {/* Recently patrolled */}
            {completed.length>0&&(
              <div style={{marginBottom:16}}>
                <SectionHead th={th}>Recently Patrolled</SectionHead>
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {completed.slice(0,4).map((c,i)=>(
                    <div key={i} style={{background:th.bgCard,border:`1px solid ${th.stopBdr}`,borderLeft:`3px solid ${th.stopAcc}`,borderRadius:9,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:th.text,fontSize:14}}>{c.name}</div><div style={{fontSize:10,color:th.textMuted,marginTop:1,fontFamily:"'IBM Plex Mono',monospace"}}>{c.address}</div></div>
                      <div style={{fontSize:10,color:th.textMuted,marginLeft:8,flexShrink:0,fontFamily:"'IBM Plex Mono',monospace"}}>{ago(c.time)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search + filter */}
            <div style={{display:"flex",gap:7,marginBottom:12}}>
              <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search locations…" style={{...IS,flex:1,fontSize:12,padding:"9px 12px"}}/>
              {["all","business","area","traffic"].map(f=>(
                <button key={f} onClick={()=>setFilterType(f)} style={{padding:"9px 10px",background:filterType===f?th.accent:th.bgCard,border:`1px solid ${filterType===f?th.accent:th.border}`,borderRadius:8,color:filterType===f?"#fff":th.textSub,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.15s"}}>
                  {f==="all"?"All":f==="business"?"🏪":f==="area"?"📍":"🚦"}
                </button>
              ))}
            </div>

            {/* Admin controls */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:10,color:th.textMuted,letterSpacing:1,fontFamily:"'Rajdhani',sans-serif",fontWeight:600}}>{filteredLocs.length} OF {locations.length} LOCATIONS</span>
              {isAdmin?(
                <div style={{display:"flex",gap:7,alignItems:"center"}}>
                  <span style={{fontSize:9,background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#1c1917",borderRadius:4,padding:"2px 7px",fontWeight:700,fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>★ ADMIN</span>
                  <button onClick={()=>setShowAddForm(v=>!v)} style={{background:showAddForm?dark?"rgba(239,68,68,0.1)":"#fee2e2":dark?"rgba(59,130,246,0.1)":"#eff6ff",border:`1px solid ${showAddForm?"rgba(239,68,68,0.4)":"rgba(59,130,246,0.4)"}`,color:showAddForm?"#ef4444":th.accent,borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>{showAddForm?"✕ CANCEL":"+ ADD LOCATION"}</button>
                  <button onClick={()=>setIsAdmin(false)} style={{background:th.bgCard,border:`1px solid ${th.border}`,color:th.textMuted,borderRadius:6,padding:"6px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>SIGN OUT</button>
                </div>
              ):(
                <button onClick={()=>setShowAdminLogin(true)} style={{background:dark?"rgba(245,158,11,0.08)":"#fffbeb",border:"1px solid rgba(245,158,11,0.4)",color:"#d97706",borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>🔒 ADMIN LOGIN</button>
              )}
            </div>

            {/* Add form */}
            {showAddForm&&isAdmin&&(
              <div style={{background:th.bgCard,border:`1px solid ${th.incBdr}`,borderRadius:12,padding:16,marginBottom:14,display:"flex",flexDirection:"column",gap:12,boxShadow:`0 4px 20px ${th.accentGlow}`}}>
                <Field label="NAME *" th={th}><input value={newLocName} onChange={e=>setNewLocName(e.target.value)} placeholder="e.g. Township building" style={IS}/></Field>
                <Field label="ADDRESS" th={th}><input value={newLocAddr} onChange={e=>setNewLocAddr(e.target.value)} placeholder="e.g. 6040 Upper Ridge Rd, Green Lane, PA" style={IS}/></Field>
                <Field label="TYPE" th={th}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                    {[["business","🏪","Business"],["area","📍","Area"],["traffic","🚦","Traffic"]].map(([t,icon,lbl])=>(
                      <button key={t} onClick={()=>setNewLocType(t)} style={{padding:"10px 4px",border:`1px solid ${newLocType===t?th.accent:th.border}`,borderRadius:8,background:newLocType===t?th.incBg:th.bgInput,color:newLocType===t?th.accent:th.textMuted,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",letterSpacing:0.5,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                        <span style={{fontSize:16}}>{icon}</span>{lbl}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="NOTES" th={th}><input value={newLocNotes} onChange={e=>setNewLocNotes(e.target.value)} placeholder="e.g. Check rear lot after dark" style={IS}/></Field>
                <ActionBtn color={th.accent} onClick={addLoc}>ADD TO PATROL LIST</ActionBtn>
              </div>
            )}

            {/* Location list */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {filteredLocs.map(loc=>(
                <div key={loc.id} style={{background:th.bgCard,border:`1px solid ${th.border}`,borderRadius:10,padding:"13px 14px",display:"flex",alignItems:"flex-start",gap:12,transition:"border-color 0.2s"}}>
                  <div style={{fontSize:22,flexShrink:0,marginTop:1}}>{typeIcon(loc.type)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:th.text,fontSize:15,letterSpacing:0.3}}>{loc.name}</div>
                    {loc.address&&<div style={{fontSize:10,color:th.textMuted,marginTop:2,fontFamily:"'IBM Plex Mono',monospace",lineHeight:1.4}}>{loc.address}</div>}
                    {loc.notes&&<div style={{fontSize:11,color:th.textSub,marginTop:4,fontStyle:"italic"}}>{loc.notes}</div>}
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0,marginTop:2}}>
                    <button onClick={()=>markPatrolled(loc)} style={{background:th.stopBg,border:`1px solid ${th.stopBdr}`,color:th.stopAcc,borderRadius:6,padding:"5px 10px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",letterSpacing:0.5}}>✓</button>
                    {isAdmin&&<button onClick={()=>removeLoc(loc.id)} style={{background:dark?"rgba(239,68,68,0.08)":"#fef2f2",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",borderRadius:6,padding:"5px 10px",fontSize:13,cursor:"pointer"}}>✕</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHIFT TAB */}
        {tab==="Shift"&&(
          <div>
            {/* Service log */}
            {serviceLog.length>0&&(
              <div style={{marginBottom:16}}>
                <SectionHead th={th}>Service Status Log</SectionHead>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {serviceLog.map((s,i)=>{
                    const on=s.status==="IN SERVICE";
                    return (
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:th.bgCard,borderRadius:8,padding:"9px 14px",border:`1px solid ${on?th.stopBdr:dark?"rgba(239,68,68,0.2)":"#fecaca"}`,borderLeft:`3px solid ${on?th.stopAcc:"#ef4444"}`}}>
                        <span style={{fontSize:12,fontWeight:700,color:on?th.stopAcc:"#ef4444",fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}>{on?"🟢":"🔴"} {s.status}</span>
                        <span style={{fontSize:10,color:th.textMuted,fontFamily:"'IBM Plex Mono',monospace"}}>{fTime(s.time)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats */}
            <div style={{background:"linear-gradient(135deg,#0f1f3d,#1a3464)",borderRadius:14,padding:20,marginBottom:20,border:"1px solid rgba(59,130,246,0.2)",boxShadow:"0 8px 32px rgba(15,31,61,0.5)"}}>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:3,marginBottom:14,fontWeight:700}}>CURRENT SHIFT STATISTICS</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["START TIME",fTime(shiftStart)],["DURATION",durStr()],["INCIDENTS",entries.filter(e=>e.kind==="incident").length],["TRAFFIC STOPS",entries.filter(e=>e.kind==="stop").length],["ARRESTS",entries.filter(e=>e.kind==="incident"&&e.arrested).length],["PATROLS DONE",completed.length]].map(([label,val])=>(
                  <div key={label} style={{background:"rgba(255,255,255,0.06)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{fontSize:8,color:"rgba(255,255,255,0.3)",letterSpacing:2,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,marginBottom:4}}>{label}</div>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:24,fontWeight:700,color:"#ffffff",letterSpacing:0.5}}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <Field label="END-OF-SHIFT NOTES" th={th}>
              <textarea value={shiftNotes} onChange={e=>setShiftNotes(e.target.value)} placeholder="Handoff notes, pending cases, observations for next shift…" rows={5} style={{...TS,marginTop:6}}/>
            </Field>

            {/* Storage status */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:14,padding:"9px 14px",background:dark?"rgba(16,185,129,0.06)":"#f0fdf4",border:`1px solid ${dark?"rgba(16,185,129,0.2)":"#a7f3d0"}`,borderRadius:8}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:"#10b981",boxShadow:"0 0 6px #10b981",flexShrink:0}}/>
              <span style={{fontSize:10,color:dark?"#6ee7b7":"#059669",fontFamily:"'IBM Plex Mono',monospace"}}>Auto-saving to this device — data survives app restarts</span>
            </div>

            {/* Share report button */}
            <button onClick={shareReport} disabled={shareStatus==="sharing"}
              style={{width:"100%",padding:"14px",borderRadius:12,border:"none",cursor:"pointer",background:shareStatus==="done"?"linear-gradient(135deg,#059669,#10b981)":shareStatus==="error"?"#ef4444":"linear-gradient(135deg,#1d4ed8,#3b82f6)",color:"#fff",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13,letterSpacing:2,textTransform:"uppercase",boxShadow:shareStatus==="done"?"0 4px 20px rgba(16,185,129,0.4)":"0 4px 20px rgba(29,78,216,0.4)",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all 0.3s",marginTop:12,marginBottom:6}}>
              <span style={{fontSize:16}}>{shareStatus==="sharing"?"⏳":shareStatus==="done"?"✓":shareStatus==="error"?"✕":"📤"}</span>
              {shareStatus==="sharing"?"PREPARING…":shareStatus==="done"?"SENT!":shareStatus==="error"?"FAILED — RETRY":"SHARE REPORT ONLY"}
            </button>

            {/* End shift button */}
            <button onClick={()=>setShowEndShiftConfirm(true)}
              style={{width:"100%",padding:"14px",borderRadius:12,border:"1px solid rgba(239,68,68,0.4)",cursor:"pointer",background:dark?"rgba(239,68,68,0.08)":"#fff5f5",color:"#ef4444",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13,letterSpacing:2,textTransform:"uppercase",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:6}}>
              <span style={{fontSize:16}}>⏹</span> END SHIFT &amp; CLEAR DATA
            </button>
            <div style={{fontSize:10,color:th.textMuted,textAlign:"center",marginBottom:20,fontFamily:"'IBM Plex Mono',monospace"}}>End Shift shares report then resets all shift data</div>

            {/* Preview */}
            <div style={{background:th.bgCard,border:`1px solid ${th.border}`,borderRadius:10,padding:16}}>
              <SectionHead th={th}>Report Preview</SectionHead>
              <pre style={{color:th.textMuted,fontSize:10,lineHeight:1.9,whiteSpace:"pre-wrap",fontFamily:"'IBM Plex Mono',monospace",margin:0,overflowX:"hidden"}}>
                {buildReport({shiftStart,shiftEnd:now,entries,completedSuggestions:completed,serviceLog,shiftNotes})}
              </pre>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing:border-box; }
        @keyframes slideDown { from{opacity:0;transform:translateX(-50%) translateY(-100%)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:${th.bg}}
        ::-webkit-scrollbar-thumb{background:${th.border};border-radius:2px}
        input::placeholder,textarea::placeholder{color:${th.textMuted}!important;font-family:'IBM Plex Mono',monospace}
        select option{background:${th.bgCard};color:${th.text}}
        input:focus,textarea:focus,select:focus{border-color:${th.accent}!important;box-shadow:0 0 0 2px ${th.accentGlow}}
      `}</style>
    </div>
  );
}

// ── Micro components ──────────────────────────────────────────────────────────
function Field({label,children,th}){
  return (
    <div>
      <div style={{fontSize:9,color:th.textMuted,letterSpacing:2,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>{label}</div>
      {children}
    </div>
  );
}
function FieldLabel({children,th}){
  return <div style={{fontSize:9,color:th.textMuted,letterSpacing:2,fontFamily:"'Rajdhani',sans-serif",fontWeight:700,marginBottom:5,textTransform:"uppercase"}}>{children}</div>;
}
function SectionHead({children,th}){
  return <div style={{fontSize:10,color:th.textMuted,letterSpacing:2,marginBottom:10,textTransform:"uppercase",fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>{children}</div>;
}
function ActionBtn({children,onClick,color}){
  return (
    <button onClick={onClick}
      onMouseDown={e=>e.currentTarget.style.transform="scale(0.98)"}
      onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
      style={{width:"100%",padding:"14px",background:color,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,fontFamily:"'Rajdhani',sans-serif",cursor:"pointer",letterSpacing:2,textTransform:"uppercase",boxShadow:`0 4px 16px ${color}44`,transition:"transform 0.1s",marginTop:4}}>
      {children}
    </button>
  );
}
