import { useState, useEffect, useCallback } from "react";
import ClientsView from './components/ClientsViewClean';
import Dashboard from './components/Dashboard';
import Payroll from './pages/Payroll';
import StaffCard from './components/StaffCard';
import { FPCCCore } from './services/fpcc-core';
import { FinanceApi } from './services/financeApi';
import ModelPanel from './components/ModelPanel';
import { geminiOpsInsights, geminiAvailable } from './services/geminiClient';
import * as dataStore from './services/dataStore';
import type { LocalStore } from './services/dataStore';

// ─── Constants & Seed ────────────────────────────────────────────────────────
const INITIAL_STAFF = [
  { id:1, name:"Amara Diallo",   role:"Bar Staff",   rate:40, pin:"1111", uniform:true,  department:"Bar",        phone:"+27 71 001 0001" },
  { id:2, name:"Themba Nkosi",   role:"Floor Staff", rate:40, pin:"2222", uniform:true,  department:"Floor",      phone:"+27 71 001 0002" },
  { id:3, name:"Priya Moodley",  role:"Supervisor",  rate:55, pin:"3333", uniform:false, department:"Management", phone:"+27 71 001 0003" },
  { id:4, name:"Lerato Khumalo", role:"Bar Staff",   rate:40, pin:"4444", uniform:true,  department:"Bar",        phone:"+27 71 001 0004" },
  { id:5, name:"Sipho Dlamini",  role:"Security",    rate:45, pin:"5555", uniform:true,  department:"Security",   phone:"+27 71 001 0005" },
  { id:6, name:"Naledi Tau",     role:"Floor Staff", rate:40, pin:"6666", uniform:false, department:"Floor",      phone:"+27 71 001 0006" },
];

const today   = new Date();
const ymd     = (d) => d.toISOString().slice(0,10);
const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };

const INITIAL_EVENTS = [
  { id:1, title:"Sandton Jazz Festival",    date:ymd(addDays(today,2)),  venue:"Sandton Convention Centre", staffIds:[1,2,5],   startTime:"17:00", endTime:"23:00", clientId:1, color:"#00e5a0", gcalId:null, notes:"Smart dress code. Parking in basement." },
  { id:2, title:"Corporate Gala — MTN",     date:ymd(addDays(today,5)),  venue:"Hyatt Regency JHB",         staffIds:[3,4,6],   startTime:"18:00", endTime:"22:00", clientId:2, color:"#7c6af7", gcalId:null, notes:"Formal. Client contact: Busi Ndlovu 082 555 0011." },
  { id:3, title:"Wedding: Khumalo/Singh",   date:ymd(addDays(today,8)),  venue:"Zimbali Estate",            staffIds:[1,2,3,4], startTime:"12:00", endTime:"20:00", clientId:3, color:"#f78c6c", gcalId:null, notes:"Outdoor. Bring own water." },
  { id:4, title:"Year-End Drinks — Deloitte",date:ymd(addDays(today,-3)),venue:"Workshop17 Rosebank",       staffIds:[2,5,6],   startTime:"16:00", endTime:"21:00", clientId:2, color:"#7c6af7", gcalId:null, notes:"" },
];

const INITIAL_CLIENTS = [
  { id:1, name:"Sandton Events Co",  email:"ops@sandtonevents.co.za",  vatNo:"4130265178", address:"14 Maude St, Sandton, 2196",   phone:"+27 11 555 0100", hourlyRate:90 },
  { id:2, name:"MTN Group Ltd",      email:"procurement@mtn.com",      vatNo:"4000109388", address:"216 14th Ave, Fairland, 2195", phone:"+27 11 912 3000", hourlyRate:120 },
  { id:3, name:"Priya & Dev Khumalo",email:"priya.khumalo@gmail.com",  vatNo:"",           address:"Private, KwaZulu-Natal",       phone:"+27 82 333 0001", hourlyRate:95 },
];

const INITIAL_INVOICES = [
  { id:1, docNo:"FP-INV-2025-001", type:"invoice", clientId:2, eventId:4, issueDate:ymd(addDays(today,-2)), dueDate:ymd(addDays(today,28)), status:"sent",
    lines:[{desc:"Floor Staff × 3 (5h)",qty:15,rate:13.0},{desc:"Supervision fee",qty:1,rate:500}], notes:"Thank you for your business." },
];

const INITIAL_QUOTES = [
  { id:1, docNo:"FP-QTE-2025-001", clientId:1, eventId:1, issueDate:ymd(today), validUntil:ymd(addDays(today,30)), status:"draft",
    lines:[{desc:"Bar Staff × 3 (6h)",qty:18,rate:14.5},{desc:"Security × 2 (6h)",qty:12,rate:15.5},{desc:"Setup & breakdown fee",qty:1,rate:800}], notes:"Valid for 30 days from issue date." },
];

// ─── Design tokens ────────────────────────────────────────────────────────────
const A="\#00e5a0",BG="\#0d1117",SF="\#161b22",SF2="\#1c2330",BD="\#30363d",
      TX="\#e6edf3",MU="\#7d8590",RD="\#f85149",AM="\#e3b341",PU="\#7c6af7",CO="\#f78c6c";

const ACCENT=A, SURFACE=SF, SURFACE2=SF2, BORDER=BD, TEXT=TX, MUTED=MU, RED=RD, AMBER=AM, PURPLE=PU, CORAL=CO;

const STATUS_COLOR = {
  draft:MUTED, sent:AMBER, paid:ACCENT, overdue:RED, accepted:ACCENT, declined:RED, expired:MUTED,
  pending:AMBER, confirmed:ACCENT, cancelled:RED,
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${BG};color:${TEXT};font-family:'Outfit',sans-serif;min-height:100vh}
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:${BORDER};border-radius:3px}
  input,select,textarea{background:${SURFACE2};color:${TEXT};border:1px solid ${BORDER};border-radius:8px;padding:8px 12px;font-family:inherit;font-size:14px;outline:none;transition:border 0.15s}
  input:focus,select:focus,textarea:focus{border-color:${ACCENT}}
  textarea{resize:vertical}
  button{cursor:pointer;font-family:inherit}
  .mono{font-family:'DM Mono',monospace}
  @media print{
    .no-print{display:none!important}
    body{background:#fff!important;color:#111!important}
    .print-doc{background:#fff!important;color:#111!important;border:none!important}
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad2    = n => String(n).padStart(2,"0");
const fmtTime = ts => { if(!ts) return "—"; const d=new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const fmtDur  = ms => { if(!ms||ms<0) return "—"; return `${Math.floor(ms/3600000)}h ${pad2(Math.floor((ms%3600000)/60000))}m`; };
const calcPay = (ms,r) => (!ms||ms<0)?0:(ms/3600000)*r;
const MONTHS  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WDAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const fmtDate = s => { if(!s) return "—"; const d=new Date(s+"T00:00:00"); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)} ${d.getFullYear()}`; };
const eventHours = ev => { 
  const [sh,sm]=ev.startTime.split(":").map(Number),
        [eh,em]=ev.endTime.split(":").map(Number); 
  let minutes = eh*60+em-sh*60-sm;
  if(minutes < 0) minutes += 24*60; // Overnight event
  return minutes/60; 
};

function docSubtotal(lines) { return lines.reduce((a,l)=>a+Number(l.qty)*Number(l.rate),0); }
function nextDocNo(arr, prefix) { return `${prefix}-${new Date().getFullYear()}-${String(arr.length+1).padStart(3,"0")}`; }

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Dot({on,color}){return <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:on?(color||ACCENT):MUTED,boxShadow:on?`0 0 6px ${color||ACCENT}`:"none",flexShrink:0}}/>;}
function Badge({color,children}){return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:500,background:color+"22",color,border:`1px solid ${color}44`}}>{children}</span>;}
function Stat({label,value,accent,sub}:{label:string;value:any;accent?:string;sub?:string}){
  return(
    <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:10,padding:"14px 18px"}}>
      <div style={{fontSize:11,color:MUTED,marginBottom:6}}>{label}</div>
      <div style={{fontSize:22,fontWeight:600,color:accent||TEXT,fontFamily:"'DM Mono',monospace"}}>{value}</div>
      {sub && <div style={{fontSize:10,color:MUTED,marginTop:4}}>{sub}</div>}
    </div>
  );
}
function Btn({children,onClick,variant="ghost",style={},disabled=false}){
  const base={border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:500,transition:"all 0.15s",opacity:disabled?0.45:1,...style};
  const v={primary:{background:ACCENT,color:"#000"},danger:{background:RED+"22",color:RED,border:`1px solid ${RED}44`},
           ghost:{background:SURFACE2,color:TEXT,border:`1px solid ${BORDER}`},accent:{background:ACCENT+"22",color:ACCENT,border:`1px solid ${ACCENT}44`},
           amber:{background:AMBER+"22",color:AMBER,border:`1px solid ${AMBER}44`}};
  return <button onClick={disabled?undefined:onClick} style={{...base,...v[variant]}}>{children}</button>;
}
function Lbl({children}){return <div style={{fontSize:12,color:MUTED,marginBottom:6}}>{children}</div>;}
function Fld({label,children,style={}}){return <div style={{marginBottom:14,...style}}><Lbl>{label}</Lbl>{children}</div>;}
function Modal({title,onClose,children,width=540}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16}}>
      <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:14,padding:28,width,maxWidth:"95vw",maxHeight:"92vh",overflow:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:16,fontWeight:600}}>{title}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:MUTED,fontSize:22,lineHeight:1,cursor:"pointer"}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Toast({msg,type="success",onDone}){
  useEffect(()=>{const t=setTimeout(onDone,3500);return()=>clearTimeout(t);},[onDone]);
  const color=type==="error"?RED:type==="warn"?AMBER:ACCENT;
  return(
    <div style={{position:"fixed",bottom:24,right:24,zIndex:999,background:SURFACE,border:`1px solid ${color}55`,borderLeft:`4px solid ${color}`,
      borderRadius:10,padding:"14px 20px",fontSize:13,color:TEXT,maxWidth:340,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
      {msg}
    </div>
  );
}

// ─── OpenRouter API call helper (used inside artifact) ──────────────────────
async function callClaude(systemPrompt, userPrompt, modelOverride = null) {
  try {
    const model = modelOverride || "deepseek/deepseek-chat-v3-0324:free";
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY || ''}`
      },
      body:JSON.stringify({
        model: model,
        max_tokens:1000,
        messages:[
          {role:"system",content:systemPrompt},
          {role:"user",content:userPrompt}
        ]
      })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('OpenRouter API error:', res.status, errorText);
      return "[Error: API call failed]";
    }
    
    const data = await res.json();
    
    if (data.error) {
      console.error('OpenRouter API error:', data.error);
      return "[Error: " + (data.error.message || "Unknown error") + "]";
    }
    
    return data.choices?.[0]?.message?.content || "";
  } catch (e) {
    console.error('callClaude error:', e);
    return "[Error: " + e.message + "]";
  }
}

// ─── Gemini AI Insights card (Google AI Studio powered) ─────────────────────
function AIInsightsCard({staff, events, clients, invoices, quotes}: any){
  const [loading,setLoading] = useState(false);
  const [insight,setInsight] = useState("");
  const [err,setErr] = useState("");
  const available = geminiAvailable();

  async function run(){
    setLoading(true); setErr(""); setInsight("");
    try{
      const text = await geminiOpsInsights({staff,events,clients,invoices,quotes});
      if(text.startsWith("[Error")) setErr(text.replace(/^\[Error:\s*/,"").replace(/\]$/,""));
      else setInsight(text);
    }catch(e:any){ setErr(e?.message||"Failed"); }
    finally{ setLoading(false); }
  }

  return (
    <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,padding:"18px 20px",marginBottom:24}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>✨</span>
          <h2 style={{fontSize:16,fontWeight:600,color:TEXT,margin:0}}>AI Operations Insights</h2>
          <span style={{fontSize:10,background:PURPLE+"22",color:PURPLE,padding:"2px 8px",borderRadius:6}}>Gemini</span>
        </div>
        <button onClick={run} disabled={loading||!available}
          style={{background:available?`linear-gradient(135deg, ${ACCENT} 0%, ${PURPLE} 100%)`:SURFACE2,
            border:"none",borderRadius:8,padding:"7px 14px",color:available?"#0d1117":MUTED,fontWeight:600,
            fontSize:12,cursor:available&&!loading?"pointer":"not-allowed",opacity:loading?0.6:1}}>
          {loading?"Analyzing…":"Generate Insights"}
        </button>
      </div>
      {!available && (
        <div style={{color:MUTED,fontSize:12}}>
          Gemini key not configured. Set <code style={{color:ACCENT}}>VITE_GEMINI_API_KEY</code> (build) or <code style={{color:ACCENT}}>API_KEY</code> (AI Studio).
        </div>
      )}
      {err && <div style={{color:RED,fontSize:12}}>⚠ {err}</div>}
      {!insight && !err && available && !loading && (
        <div style={{color:MUTED,fontSize:12}}>Click "Generate Insights" for an AI summary of staffing gaps, billing flags, and suggestions.</div>
      )}
      {insight && (
        <div style={{color:TEXT,fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{insight}</div>
      )}
    </div>
  );
}

// ─── Document Print View (Invoice / Quote / Statement) ───────────────────────
function DocPrint({doc, docType, client, event: evt, allDocs, onClose}){
  const sub  = docSubtotal(doc.lines);
  const includeTax = doc.includeTax !== false; // default true for legacy data
  const taxRate = Number(doc.taxRate ?? 15);
  const vat  = includeTax ? sub * (taxRate / 100) : 0;
  const total= sub+vat;
  const isPaid = docType==="statement";
  const paidAmt = isPaid ? allDocs.filter(d=>d.clientId===doc.clientId&&d.status==="paid").reduce((a,d)=>{
    const s = docSubtotal(d.lines);
    const tx = (d.includeTax !== false) ? s * (Number(d.taxRate ?? 15) / 100) : 0;
    return a + s + tx;
  }, 0) : 0;
  const outstanding = isPaid ? allDocs.filter(d=>d.clientId===doc.clientId&&d.status!=="paid").reduce((a,d)=>{
    const s = docSubtotal(d.lines);
    const tx = (d.includeTax !== false) ? s * (Number(d.taxRate ?? 15) / 100) : 0;
    return a + s + tx;
  }, 0) : 0;

  const titles = {invoice:"TAX INVOICE", quote:"QUOTATION", statement:"ACCOUNT STATEMENT"};
  const statusC = STATUS_COLOR[doc.status]||MUTED;

  return(
    <Modal title={titles[docType]||"Document"} onClose={onClose} width={680}>
      <div className="print-doc" style={{background:"#fff",color:"#111",borderRadius:10,padding:40}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:36}}>
          <div>
            <div style={{fontSize:26,fontWeight:800,color:"#111",letterSpacing:"-0.03em"}}>FRESHPEOPLE</div>
            <div style={{fontSize:12,color:"#666",marginTop:2}}>Events Staffing Solutions</div>
            <div style={{fontSize:12,color:"#666"}}>VAT Reg No: 4200000001</div>
            <div style={{fontSize:12,color:"#666"}}>4th Floor, 9 Fredman Drive, Sandton</div>
            <div style={{fontSize:12,color:"#666"}}>admin@freshpeople.co.za · +27 11 234 5678</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{titles[docType]}</div>
            <div style={{fontSize:20,fontWeight:700,color:"#111"}}>{doc.docNo}</div>
            <div style={{fontSize:12,color:"#666",marginTop:6}}>Issue: {fmtDate(doc.issueDate)}</div>
            {doc.dueDate&&<div style={{fontSize:12,color:"#666"}}>Due: {fmtDate(doc.dueDate)}</div>}
            {doc.validUntil&&<div style={{fontSize:12,color:"#666"}}>Valid until: {fmtDate(doc.validUntil)}</div>}
            {doc.status&&<div style={{marginTop:10}}>
              <span style={{background:statusC,color:"#000",fontSize:11,padding:"3px 10px",borderRadius:4,fontWeight:700}}>{doc.status.toUpperCase()}</span>
            </div>}
          </div>
        </div>

        {/* Bill To */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:28,padding:"16px 0",borderTop:"1px solid #e5e7eb",borderBottom:"1px solid #e5e7eb"}}>
          <div>
            <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Bill To</div>
            <div style={{fontWeight:700,color:"#111",fontSize:14}}>{client?.name||"—"}</div>
            <div style={{fontSize:12,color:"#555"}}>{client?.email}</div>
            <div style={{fontSize:12,color:"#555"}}>{client?.phone}</div>
            <div style={{fontSize:12,color:"#555"}}>{client?.address}</div>
            {client?.vatNo&&<div style={{fontSize:12,color:"#555"}}>VAT: {client.vatNo}</div>}
          </div>
          {evt&&<div>
            <div style={{fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Event Reference</div>
            <div style={{fontWeight:600,color:"#111",fontSize:13}}>{evt.title}</div>
            <div style={{fontSize:12,color:"#555"}}>{fmtDate(evt.date)}</div>
            <div style={{fontSize:12,color:"#555"}}>{evt.venue}</div>
            <div style={{fontSize:12,color:"#555"}}>{evt.startTime} – {evt.endTime}</div>
          </div>}
        </div>

        {/* Statement summary */}
        {docType==="statement"?(
          <div>
            <table style={{width:"100%",borderCollapse:"collapse",marginBottom:24}}>
              <thead><tr style={{borderBottom:"2px solid #e5e7eb"}}>
                {["Doc No","Type","Date","Due","Amount","Status"].map(h=>(
                  <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{allDocs.filter(d=>d.clientId===doc.clientId).map((d,i)=>{
                const amt=(docSubtotal(d.lines)*1.15).toFixed(2);
                return(
                  <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                    <td style={{padding:"9px 10px",fontSize:12,fontWeight:500}}>{d.docNo}</td>
                    <td style={{padding:"9px 10px",fontSize:12,color:"#888",textTransform:"capitalize"}}>{d.type||"invoice"}</td>
                    <td style={{padding:"9px 10px",fontSize:12}}>{fmtDate(d.issueDate)}</td>
                    <td style={{padding:"9px 10px",fontSize:12,color:d.status==="overdue"?"#dc2626":"#555"}}>{fmtDate(d.dueDate)}</td>
                    <td style={{padding:"9px 10px",fontSize:12,fontFamily:"'DM Mono',monospace"}}>R {amt}</td>
                    <td style={{padding:"9px 10px"}}><span style={{background:STATUS_COLOR[d.status]||"#888",color:"#000",fontSize:10,padding:"2px 7px",borderRadius:3,fontWeight:700}}>{d.status?.toUpperCase()}</span></td>
                  </tr>
                );
              })}</tbody>
            </table>
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <table style={{fontSize:13,borderCollapse:"collapse"}}>
                {[["Total Invoiced",`R ${(paidAmt+outstanding).toFixed(2)}`],["Paid",`R ${paidAmt.toFixed(2)}`]].map(([l,v])=>(
                  <tr key={l}><td style={{padding:"4px 16px 4px 0",color:"#555"}}>{l}</td><td style={{padding:"4px 0",textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{v}</td></tr>
                ))}
                <tr style={{borderTop:"2px solid #111"}}>
                  <td style={{padding:"8px 16px 4px 0",fontWeight:700,fontSize:15}}>Balance Due</td>
                  <td style={{padding:"8px 0 4px 0",textAlign:"right",fontWeight:700,fontSize:15,fontFamily:"'DM Mono',monospace",color:"#dc2626"}}>R {outstanding.toFixed(2)}</td>
                </tr>
              </table>
            </div>
          </div>
        ):(
          <>
            <table style={{width:"100%",borderCollapse:"collapse",marginBottom:24}}>
              <thead><tr style={{borderBottom:"2px solid #e5e7eb"}}>
                {["Description","Qty","Unit Rate","Amount"].map(h=>(
                  <th key={h} style={{padding:"8px 10px",textAlign:h==="Description"?"left":"right",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{doc.lines.map((l,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                  <td style={{padding:"10px 10px",fontSize:13}}>{l.desc}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontSize:13}}>{l.qty}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontSize:13,fontFamily:"'DM Mono',monospace"}}>R {Number(l.rate).toFixed(2)}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:500}}>R {(l.qty*l.rate).toFixed(2)}</td>
                </tr>
              ))}</tbody>
            </table>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:24}}>
              <table style={{fontSize:13,borderCollapse:"collapse"}}>
                <tr><td style={{padding:"4px 16px 4px 0",color:"#666"}}>Subtotal</td><td style={{padding:"4px 0",textAlign:"right",fontFamily:"'DM Mono',monospace"}}>R {sub.toFixed(2)}</td></tr>
                {includeTax && (
                  <tr><td style={{padding:"4px 16px 4px 0",color:"#666"}}>VAT ({taxRate}%)</td><td style={{padding:"4px 0",textAlign:"right",fontFamily:"'DM Mono',monospace"}}>R {vat.toFixed(2)}</td></tr>
                )}
                <tr style={{borderTop:"2px solid #111"}}>
                  <td style={{padding:"8px 16px 4px 0",fontWeight:700,fontSize:15}}>Total</td>
                  <td style={{padding:"8px 0 4px 0",textAlign:"right",fontWeight:700,fontSize:15,fontFamily:"'DM Mono',monospace"}}>R {total.toFixed(2)}</td>
                </tr>
              </table>
            </div>
          </>
        )}

        {/* Footer */}
        {doc.notes&&<div style={{marginTop:16,fontSize:12,color:"#555",fontStyle:"italic"}}>{doc.notes}</div>}
        <div style={{marginTop:24,padding:"14px 16px",background:"#f9fafb",borderRadius:8,fontSize:12,color:"#555"}}>
          <div style={{fontWeight:700,marginBottom:6,color:"#111"}}>Banking Details</div>
          <div>Bank: FNB · Account: 6254 0001 0034 · Branch: 250655 · Acc Type: Business Current</div>
          <div>Reference: {doc.docNo}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:20}} className="no-print">
        <Btn variant="accent" onClick={()=>window.print()} style={{flex:1,padding:"11px"}}>🖨 Print / Save PDF</Btn>
        <Btn variant="ghost" onClick={onClose} style={{flex:1,padding:"11px"}}>Close</Btn>
      </div>
    </Modal>
  );
}

// ─── Document Form (Invoice or Quote) ────────────────────────────────────────
function DocForm({docType, clients, events, staff = [], existingDocs, onSave, onClose}){
  const clientsSafe = Array.isArray(clients) ? clients : [];
  const eventsSafe = Array.isArray(events) ? events : [];
  const staffSafe = Array.isArray(staff) ? staff : [];
  const existingDocsSafe = Array.isArray(existingDocs) ? existingDocs : [];
  const prefix = docType==="invoice" ? "FP-INV" : "FP-QTE";
  const [form,setForm] = useState<any>({
    docNo: nextDocNo(existingDocsSafe, prefix),
    clientId:"", eventId:"",
    issueDate:ymd(today),
    dueDate: docType==="invoice" ? ymd(addDays(today,30)) : "",
    validUntil: docType==="quote" ? ymd(addDays(today,30)) : "",
    lines:[{desc:"",qty:1,rate:0,kind:'manual',total:0}],
    notes: docType==="invoice"?"Thank you for your business.":"This quotation is valid for 30 days.",
    type: docType,
    includeTax: true,
    taxRate: 15,
  });

  function prefill(eventId){
    const ev=eventsSafe.find(e=>e.id===Number(eventId));
    if(!ev){ setForm(f=>({...f,eventId})); return; }
    const hrs=eventHours(ev);
    const client = clientsSafe.find(c=>c.id===ev.clientId);
    const clientRate = client?.hourlyRate || 0;
    // Build line items from the staff assigned to this event
    const lines = (ev.staffIds || []).map(id=>{
      const s=staffSafe.find(x=>x.id===id);
      const rate = s?.rate || 0;
      const total = (hrs * rate).toFixed(2);
      return {
        desc: `${s?.name||"Staff"} — ${s?.role||""} (${hrs}h @ R${rate}/h)`,
        qty: hrs,
        rate,
        total: Number(total),
        kind: 'staff',
        staffId: s?.id,
      };
    });
    if (lines.length === 0 && clientRate) {
      // No staff assigned: charge a flat hourly rate
      lines.push({
        desc: `${ev.title} — Service (${hrs}h @ R${clientRate}/h)`,
        qty: hrs,
        rate: clientRate,
        total: Number((hrs * clientRate).toFixed(2)),
        kind: 'service',
      });
    }
    setForm(f=>({...f,eventId,clientId:String(ev.clientId||f.clientId),lines}));
  }
  function addLine(kind='manual'){ setForm(f=>({...f,lines:[...f.lines,{desc:"",qty:1,rate:0,kind,total:0}]})); }
  function updLine(i,k,v){ setForm(f=>({...f,lines:f.lines.map((l,j)=>{
    const updated = j===i ? {...l, [k]: v} : l;
    if (j===i) {
      const qty = Number(updated.qty) || 0;
      const rate = Number(updated.rate) || 0;
      updated.total = Number((qty * rate).toFixed(2));
    }
    return updated;
  })})); }
  function rmLine(i){ setForm(f=>({...f,lines:f.lines.filter((_,j)=>j!==i)})); }

  const sub=docSubtotal(form.lines);
  const tax = form.includeTax ? sub * (Number(form.taxRate) || 0) / 100 : 0;
  const total = sub + tax;

  return(
    <Modal title={docType==="invoice"?"New Invoice":"New Quotation"} onClose={onClose} width={720}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <Fld label="Doc Number"><input value={form.docNo} onChange={e=>setForm(f=>({...f,docNo:e.target.value}))} style={{width:"100%"}}/></Fld>
        <Fld label="Client *">
          <select value={form.clientId} onChange={e=>setForm(f=>({...f,clientId:e.target.value}))} style={{width:"100%"}}>
            <option value="">— Select client —</option>
            {clientsSafe.map(c=><option key={c.id} value={c.id}>{c.name} (R{c.hourlyRate||90}/h)</option>)}
          </select>
        </Fld>
        <Fld label="Link Event (auto-fills from staff & hours)">
          <select value={form.eventId} onChange={e=>prefill(e.target.value)} style={{width:"100%"}}>
            <option value="">— None —</option>
            {eventsSafe.map(ev=><option key={ev.id} value={ev.id}>{ev.title} ({fmtDate(ev.date)})</option>)}
          </select>
        </Fld>
        <Fld label="Issue Date"><input type="date" value={form.issueDate} onChange={e=>setForm(f=>({...f,issueDate:e.target.value}))} style={{width:"100%"}}/></Fld>
        {docType==="invoice"
          ?<Fld label="Due Date"><input type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} style={{width:"100%"}}/></Fld>
          :<Fld label="Valid Until"><input type="date" value={form.validUntil} onChange={e=>setForm(f=>({...f,validUntil:e.target.value}))} style={{width:"100%"}}/></Fld>
        }
      </div>

      <Fld label="Line Items (staff auto-filled from event; you can add extras)">
        {form.lines.map((l,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 70px 90px 90px 28px",gap:8,marginBottom:8,alignItems:"center"}}>
            <input value={l.desc} onChange={e=>updLine(i,"desc",e.target.value)} placeholder={l.kind==='staff'?"Staff line auto-filled":(l.kind==='service'?"Service line":"Description e.g. Equipment, transport, catering")} style={{width:"100%"}}/>
            <input type="number" value={l.qty} onChange={e=>updLine(i,"qty",e.target.value)} placeholder="Qty/Hrs" style={{width:"100%",textAlign:"right"}}/>
            <input type="number" value={l.rate} onChange={e=>updLine(i,"rate",e.target.value)} placeholder="Rate" style={{width:"100%",textAlign:"right"}}/>
            <div className="mono" style={{textAlign:"right",fontSize:12,color:ACCENT,padding:"0 8px"}}>
              {((Number(l.qty)||0)*(Number(l.rate)||0)).toFixed(2)}
            </div>
            <button onClick={()=>rmLine(i)} style={{background:"none",border:"none",color:MUTED,fontSize:18,cursor:"pointer"}}>×</button>
          </div>
        ))}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
          <Btn onClick={()=>addLine('manual')} style={{fontSize:12,padding:"5px 12px"}}>+ Add manual item</Btn>
          <Btn onClick={()=>addLine('service')} style={{fontSize:12,padding:"5px 12px"}}>+ Add service</Btn>
          <Btn onClick={()=>addLine('staff')} style={{fontSize:12,padding:"5px 12px"}}>+ Add staff line</Btn>
        </div>
      </Fld>

      <div style={{background:SURFACE2,borderRadius:8,padding:"12px 16px",marginBottom:14,fontSize:13}}>
        <div style={{display:"flex",justifyContent:"space-between",color:MUTED}}><span>Subtotal</span><span className="mono">R {sub.toFixed(2)}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",color:MUTED,marginTop:4}}>
          <span style={{display:"flex",alignItems:"center",gap:6}}>
            <input type="checkbox" checked={form.includeTax} onChange={e=>setForm(f=>({...f,includeTax:e.target.checked}))} id="incTax"/>
            <label htmlFor="incTax" style={{cursor:"pointer"}}>VAT</label>
            {form.includeTax && (
              <input
                type="number"
                value={form.taxRate}
                onChange={e=>setForm(f=>({...f,taxRate:Number(e.target.value)}))}
                style={{width:60,padding:"2px 6px",fontSize:12}}
                min={0}
                max={100}
              />
            )}
            {form.includeTax && <span>%</span>}
          </span>
          <span className="mono">R {tax.toFixed(2)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontWeight:600,marginTop:8,paddingTop:8,borderTop:`1px solid ${BORDER}`}}>
          <span>Total</span><span className="mono" style={{color:ACCENT}}>R {total.toFixed(2)}</span>
        </div>
      </div>

      <Fld label="Notes / Terms">
        <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} style={{width:"100%"}}/>
      </Fld>
      <div style={{display:"flex",gap:10}}>
        <Btn variant="primary" onClick={()=>onSave({...form,id:Date.now(),status:"draft",lines:form.lines.map(l=>({...l,qty:Number(l.qty)||0,rate:Number(l.rate)||0,total:Number((Number(l.qty)||0)*(Number(l.rate)||0))}))})} style={{flex:1,padding:"11px"}}>
          Create {docType==="invoice"?"Invoice":"Quote"}
        </Btn>
        <Btn variant="ghost" onClick={onClose} style={{flex:1,padding:"11px"}}>Cancel</Btn>
      </div>
    </Modal>
  );
}

// ─── Documents Tab (Invoices + Quotes + Statements) ──────────────────────────
function DocumentsTab({invoices,setInvoices,quotes,setQuotes,clients,setClients,events,setEvents,staff,setStaff}: any){
  const invoicesSafe = Array.isArray(invoices) ? invoices : [];
  const quotesSafe = Array.isArray(quotes) ? quotes : [];
  const clientsSafe = Array.isArray(clients) ? clients : [];
  const eventsSafe = Array.isArray(events) ? events : [];
  const staffSafe = Array.isArray(staff) ? staff : [];
  const [view,setView]         = useState("invoices"); // invoices | quotes | statements
  const [showForm,setShowForm] = useState(null);       // "invoice" | "quote" | null
  const [printDoc,setPrintDoc] = useState(null);
  const [stmtClient,setStmtClient] = useState("");
  const [statement,setStatement] = useState(null);
  const [toast,setToast]       = useState(null);
  const [loading,setLoading]   = useState(true);
  const [saving,setSaving]     = useState(false);
  const [apiError,setApiError] = useState("");

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const data = await FinanceApi.listDocs();
      if (!data.success) throw new Error(data.error || "Failed to load finance documents");
      setInvoices(data.invoices || []);
      setQuotes(data.quotes || []);
      if (Array.isArray(data.clients)) setClients(data.clients);
      if (Array.isArray(data.events)) setEvents(data.events);
      if (Array.isArray(data.staff)) setStaff(data.staff);
    } catch (err) {
      console.error("Finance API load failed", err);
      setApiError(err instanceof Error ? err.message : "Backend finance API unavailable");
    } finally {
      setLoading(false);
    }
  }, [setClients,setEvents,setInvoices,setQuotes,setStaff]);

  useEffect(() => { void loadDocs(); }, [loadDocs]);

  const allDocs = [...invoicesSafe,...quotesSafe];

  const invTotal  = invoicesSafe.reduce((a,i)=>a + docSubtotal(i.lines) * (i.includeTax !== false ? (1 + (Number(i.taxRate) || 15) / 100) : 1), 0);
  const invPaid   = invoicesSafe.filter(i=>i.status==="paid").reduce((a,i)=>a + docSubtotal(i.lines) * (i.includeTax !== false ? (1 + (Number(i.taxRate) || 15) / 100) : 1), 0);
  const invOverdue= invoicesSafe.filter(i=>i.status==="overdue").length;
  const quoteConv = quotesSafe.length ? Math.round(quotesSafe.filter(q=>q.status==="accepted").length/quotesSafe.length*100) : 0;

  async function setStatus(id, status, collection, setter){
    try {
      const updated = await FinanceApi.updateDoc(Number(id), { status });
      setter(prev=>prev.map(d=>d.id===id?{...d,status}:d));
      setToast({msg:`Status updated to ${status}`,type:"success"});
    } catch (err) {
      console.error(err);
      setApiError("Could not update document status on backend");
    }
  }
  async function deleteDoc(id, setter){
    try {
      await FinanceApi.deleteDoc(Number(id));
      setter(prev=>prev.filter(d=>d.id!==id));
      setToast({msg:"Document deleted",type:"success"});
    } catch (err) {
      console.error(err);
      setApiError("Could not delete document on backend");
    }
  }

  async function convertToInvoice(quote){
    try {
      const inv = await FinanceApi.convertQuote(Number(quote.id));
      setInvoices(prev=>[inv,...prev]);
      setQuotes(prev=>prev.map(q=>q.id===quote.id?{...q,status:"accepted"}:q));
      setToast({msg:`Quote converted to Invoice ${inv.docNo}`,type:"success"});
      setView("invoices");
    } catch (err) {
      console.error(err);
      setApiError("Could not convert quote to invoice on backend");
    }
  }

  async function loadStatement(){
    if (!stmtClient) return;
    try {
      const data = await FinanceApi.getStatement(Number(stmtClient));
      if (!data.success) throw new Error(data.error || "Failed to load statement");
      setStatement(data);
    } catch (err) {
      console.error(err);
      setApiError("Could not load statement from backend");
      setStatement(null);
    }
  }
  useEffect(() => { void loadStatement(); }, [stmtClient]);

  const renderDocs = (docs, setter, isInvoice) => {
    const docsSafe = Array.isArray(docs) ? docs : [];
    if(!docsSafe.length) return <div style={{textAlign:"center",padding:48,color:MUTED,fontSize:14}}>No backend documents found</div>;
    return(
      <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead style={{background:SURFACE2}}><tr>
            {["Doc No","Client","Event","Date",isInvoice?"Due":"Valid Until","Total","Status",""].map(h=>(
              <th key={h} style={{padding:"12px 14px",textAlign:"left",color:MUTED,fontWeight:500,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{docsSafe.map(doc=>{
            const client=clientsSafe.find(c=>c.id===doc.clientId);
            const event=eventsSafe.find(e=>String(e.id)===String(doc.eventId));
            const sub=docSubtotal(doc.lines);
            const tax = doc.includeTax !== false ? sub * (Number(doc.taxRate) || 15) / 100 : 0;
            const total=(sub+tax).toFixed(2);
            const sc=STATUS_COLOR[doc.status]||MUTED;
            return(
              <tr key={doc.id} style={{borderTop:`1px solid ${BORDER}33`}}>
                <td style={{padding:"12px 14px",fontFamily:"'DM Mono',monospace",color:ACCENT}}>{doc.docNo}</td>
                <td style={{padding:"12px 14px",fontWeight:500}}>{client?.name||"—"}</td>
                <td style={{padding:"12px 14px",color:MUTED,fontSize:12,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{event?.title||"—"}</td>
                <td style={{padding:"12px 14px",color:MUTED}}>{fmtDate(doc.issueDate)}</td>
                <td style={{padding:"12px 14px",color:doc.status==="overdue"?RED:MUTED}}>{fmtDate(isInvoice?doc.dueDate:doc.validUntil)}</td>
                <td style={{padding:"12px 14px",fontFamily:"'DM Mono',monospace"}}>R {total}</td>
                <td style={{padding:"12px 14px"}}>
                  <select value={doc.status} onChange={e=>setStatus(doc.id,e.target.value,docs,setter)}
                    style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`,borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:600,textTransform:"uppercase"}}>
                    {(isInvoice?["draft","sent","paid","overdue"]:["draft","sent","accepted","declined","expired"]).map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <Btn onClick={()=>setPrintDoc({doc,docType:isInvoice?"invoice":"quote"})} style={{fontSize:11,padding:"4px 10px"}}>View</Btn>
                    {!isInvoice&&doc.status!=="accepted"&&<Btn variant="accent" onClick={()=>convertToInvoice(doc)} style={{fontSize:11,padding:"4px 10px"}}>→ Invoice</Btn>}
                    <Btn variant="danger" onClick={()=>deleteDoc(doc.id,setter)} style={{fontSize:11,padding:"4px 10px"}}>×</Btn>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    );
  };

  return(
    <div>
      {apiError && <div style={{background:RED+"22",border:`1px solid ${RED}55`,color:TEXT,borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:13}}>
        Backend sync issue: {apiError}
      </div>}
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        <Stat label="Invoiced (incl VAT)"  value={`R ${invTotal.toFixed(0)}`}    accent={ACCENT} />
        <Stat label="Collected"            value={`R ${invPaid.toFixed(0)}`}      accent={ACCENT} />
        <Stat label="Overdue invoices"     value={invOverdue}                     accent={invOverdue?RED:MUTED} />
        <Stat label="Quote conversion"     value={`${quoteConv}%`}               accent={AMBER} sub={`${quotesSafe.length} quotes total`}/>
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",gap:0,background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:10,padding:4,width:"fit-content",marginBottom:20}}>
        {[["invoices","Invoices"],["quotes","Quotations"],["statements","Statements"]].map(([k,l])=>(
          <button key={k} onClick={()=>setView(k)} style={{
            padding:"8px 20px",borderRadius:7,border:"none",fontSize:13,fontWeight:500,
            background:view===k?ACCENT+"22":"transparent",
            color:view===k?ACCENT:MUTED,
            borderBottom:view===k?`2px solid ${ACCENT}`:"2px solid transparent",
          }}>{l}</button>
        ))}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:12,color:MUTED}}>
          {loading ? "Syncing backend finance data…" : "Backend connected — invoices, quotations and statements are server-side."}
        </div>
        {view!=="statements"&&<Btn variant="primary" disabled={saving} onClick={async ()=>{setSaving(true); try { await loadDocs(); setToast({msg:"Backend documents refreshed",type:"success"}); } finally { setSaving(false); } }} style={{fontSize:12,padding:"6px 12px"}}>
          {saving ? "Syncing…" : "Refresh backend"}
        </Btn>}
      </div>

      {/* Controls - simplified */}
      {view!=="statements"&&loading===false&&(
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
          <Btn variant="primary" onClick={()=>setShowForm(view==="invoices"?"invoice":"quote")}>
            + New {view==="invoices"?"Invoice":"Quote"}
          </Btn>
        </div>
      )}

      {/* Content */}
      {loading ? <div style={{textAlign:"center",padding:48,color:MUTED}}>Loading backend documents…</div> : null}
      {!loading && view==="invoices" && renderDocs(invoicesSafe, setInvoices, true)}
      {!loading && view==="quotes"   && renderDocs(quotesSafe, setQuotes, false)}
      {!loading && view==="statements"&&(
        <div>
          <div style={{marginBottom:20,maxWidth:320}}>
            <Lbl>Select Client to generate statement</Lbl>
            <select value={stmtClient} onChange={e=>setStmtClient(e.target.value)} style={{width:"100%"}}>
              <option value="">— Choose client —</option>
              {clientsSafe.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {stmtClient&&statement&&statement.success&&Array.isArray(statement.docs)&&(()=>{
            const c=clientsSafe.find(x=>x.id===Number(stmtClient));
            const s=statement.summary;
            return(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                  <Stat label="Total invoiced" value={`R ${(s.totalInvoiced||0).toFixed(0)}`}/>
                  <Stat label="Paid" value={`R ${(s.paid||0).toFixed(0)}`} accent={ACCENT}/>
                  <Stat label="Balance due" value={`R ${(s.balanceDue||0).toFixed(0)}`} accent={(s.balanceDue||0)>0?RED:MUTED}/>
                </div>
                <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,overflow:"auto",marginBottom:16}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{background:SURFACE2}}>
                      {["Doc No","Date","Due","Amount","Status"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",color:MUTED,fontSize:11,textTransform:"uppercase"}}>{h}</th>)}
                    </tr></thead>
                    <tbody>{statement.docs.map(d=>{
                      const totals=docTotalsLocal(d);
                      return <tr key={d.id} style={{borderTop:`1px solid ${BORDER}33`}}>
                        <td style={{padding:"10px 12px",fontFamily:"'DM Mono',monospace",color:ACCENT}}>{d.docNo}</td>
                        <td style={{padding:"10px 12px"}}>{fmtDate(d.issueDate)}</td>
                        <td style={{padding:"10px 12px"}}>{fmtDate(d.dueDate)}</td>
                        <td style={{padding:"10px 12px",fontFamily:"'DM Mono',monospace"}}>R {totals.total.toFixed(2)}</td>
                        <td style={{padding:"10px 12px"}}><Badge color={STATUS_COLOR[d.status]||MUTED}>{d.status}</Badge></td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
                <Btn variant="accent" onClick={()=>setPrintDoc({
                  doc:{...c,docNo:statement.statement.docNo,clientId:Number(stmtClient),issueDate:statement.statement.issueDate,lines:[],notes:statement.statement.notes,status:"statement"},
                  docType:"statement"
                })}>View / Print Statement</Btn>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modals */}
      {showForm&&loading===false&&(
        <DocForm
          docType={showForm}
          clients={clients}
          events={events}
          staff={staff}
          existingDocs={showForm==="invoice"?invoicesSafe:quotesSafe}
          onSave={async doc=>{
            setSaving(true);
            try {
              const created = await FinanceApi.createDoc(doc);
              if(showForm==="invoice") setInvoices(p=>[created,...p]);
              else setQuotes(p=>[created,...p]);
              setShowForm(null);
              const t = showForm==="invoice" ? "Invoice" : "Quote";
              setToast({msg: t + " " + doc.docNo + " created on backend", type: "success"});
            } catch (err) {
              console.error(err);
              setApiError("Could not create document on backend");
            } finally {
              setSaving(false);
            }
          }}
          onClose={()=>setShowForm(null)}
        />
      )}
      {printDoc&&loading===false&&(
        <DocPrint
          doc={printDoc.doc}
          docType={printDoc.docType}
          client={clientsSafe.find(c=>c.id===printDoc.doc.clientId)}
          event={eventsSafe.find(e=>String(e.id)===String(printDoc.doc.eventId))}
          allDocs={allDocs}
          onClose={()=>setPrintDoc(null)}
        />
      )}
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}

function docTotalsLocal(doc) {
  const sub = docSubtotal(doc.lines || []);
  const tax = doc.includeTax !== false ? sub * (Number(doc.taxRate) || 15) / 100 : 0;
  return { subtotal: sub, tax, total: sub + tax };
}

// ─── Calendar Tab (with Google Calendar sync) ─────────────────────────────────
// ─── Calendar Tab (with Google Calendar sync) ─────────────────────────────────
function CalendarTab({events,setEvents,staff,clients,addToast,currentModel}: any){
  const [viewDate,setViewDate] = useState(new Date(today.getFullYear(),today.getMonth(),1));
  const [selected,setSelected] = useState(null);
  const [showForm,setShowForm] = useState(false);
  const [editEvt,setEditEvt]   = useState(null);
  const [gcalEvents,setGcalEvents] = useState([]);
  const [syncing,setSyncing]   = useState(false);
  const [appleEvents,setAppleEvents] = useState([]);
  const [syncingApple,setSyncingApple] = useState(false);
  const [bookingModal,setBookingModal] = useState(null); // event to send notifications for
  const [sendingNotifs,setSendingNotifs] = useState(false);
  const [form,setForm] = useState({title:"",date:"",venue:"",startTime:"09:00",endTime:"17:00",staffIds:[],clientId:"",color:ACCENT,notes:""});

  const yr=viewDate.getFullYear(), mo=viewDate.getMonth();
  const firstDay=new Date(yr,mo,1).getDay();
  const daysInMonth=new Date(yr,mo+1,0).getDate();
  const cells=Array.from({length:firstDay+daysInMonth},(_,i)=>i<firstDay?null:i-firstDay+1);
  const todayStr=ymd(today);

  // Fetch GCal events for the visible month
  // Fetch Google Calendar events (client-side, no API route needed)
  async function fetchGcal() {
    setSyncing(true);
    try{
      // Use local API endpoint instead of direct iCal fetch
      const resp = await fetch('/api/calendar/google');
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch Google Calendar');
      }
      
      const data = await resp.json();
      
      if (data.success && Array.isArray(data.events)) {
        setGcalEvents(data.events.map(e => ({
          ...e,
          isGcal: true,
          color: "#5ca4ea",
          date: e.start.split('T')[0] // Extract date part
        })));
        addToast(`Google Calendar synced ✓ (${data.events.length} events)`, "success");
      } else {
        throw new Error('Invalid response format');
      }
    } catch(e){ 
      console.error('GCal sync error:', e);
      addToast(`Google Calendar sync failed: ${e.message}`, "error"); 
    }
    setSyncing(false);
  }

  // Fetch Apple Calendar events via the new /api/calendar/apple endpoint
  // (uses lib/ical.js with node-ical for robust RFC 5545 parsing)
  async function fetchApple() {
    setSyncingApple(true);
    try {
      const response = await fetch('/api/calendar/apple');
      const data = await response.json();

      if (data.success && Array.isArray(data.events)) {
        setAppleEvents(data.events.map(e => ({
          ...e,
          isApple: true,
          color: "#FF9500",
          date: e.start?.split('T')[0]
        })));
        addToast(`Apple Calendar synced ✓ (${data.events.length} events)`, 'success');
      } else {
        throw new Error(data.error || 'Invalid response');
      }
    } catch (e) {
      console.error('Apple sync error:', e);
      addToast(`Apple Calendar sync failed: ${e.message}`, "error");
    }
    setSyncingApple(false);
  }

  // Push event to Apple Calendar (via Nylas) → syncs to Google Calendar
  async function pushToGcal(ev){
    if(!ev?.id) return;
    try{
      const [sh,sm]=ev.startTime.split(":").map(Number);
      const [eh,em]=ev.endTime.split(":").map(Number);
      const base=ev.date+"T";
      const start=`${base}${pad2(sh)}:${pad2(sm)}:00`;
      const end=`${base}${pad2(eh)}:${pad2(em)}:00`;
      const staffNames=ev.staffIds.map(id=>staff.find(s=>s.id===id)?.name||"Staff").join(", ");
      const description=`Freshpeople Event\nVenue: ${ev.venue||""}\nStaff: ${staffNames}\n${ev.notes||""}`;

      // Push to Apple Calendar via Nylas (already configured in Vercel)
      const resp=await fetch('/api/calendar/nylas',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          title:ev.title,
          start:start,
          end:end,
          description:description,
          location:ev.venue||''
        })
      });
      
      const data=await resp.json();
      
      if(data.success){
        setEvents(prev=>prev.map(e=>e.id===ev.id?{...e,gcalId:data.eventId}:e));
        addToast(`"${ev.title}" pushed to Apple Calendar ✓ (synced to Google)`,"success");
      } else {
        addToast(`Failed to push: ${data.error||'Unknown error'}`,"error");
      }
    }catch(e){ 
      console.error('Push to Calendar error:', e);
      addToast("Failed to push to calendar","error"); 
    }
  }

  // Send staff booking notifications via WhatsApp Business API
  async function sendBookingNotifications(ev){
    setSendingNotifs(true);
    const staffToNotify=ev.staffIds.map(id=>staff.find(s=>s.id===id)).filter(Boolean);
    try{
      const result = await FPCCCore.sendWhatsApp(Number(ev.id), ev.staffIds.map(Number));
      setSendingNotifs(false);
      setBookingModal(null);
      if (result.success) {
        addToast(`WhatsApp booking notices sent to ${result.dispatched || staffToNotify.length} staff ✓`,"success");
        if (result.skipped || result.failed) {
          addToast(`${result.skipped || 0} skipped, ${result.failed || 0} failed`,"warn");
        }
      } else {
        addToast(`WhatsApp dispatch failed: ${result.message || result.error || 'Unknown error'}`,"error");
      }
    } catch(e) {
      console.error('WhatsApp dispatch error:', e);
      setSendingNotifs(false);
      addToast("WhatsApp dispatch failed","error");
    }
  }

  function openNew(day){
    const d=`${yr}-${pad2(mo+1)}-${pad2(day)}`;
    setForm({title:"",date:d,venue:"",startTime:"09:00",endTime:"17:00",staffIds:[],clientId:"",color:ACCENT,notes:""});
    setEditEvt(null); setShowForm(true);
  }
  function openEdit(ev){
    setForm({...ev,staffIds:[...ev.staffIds],clientId:String(ev.clientId||"")});
    setEditEvt(ev); setShowForm(true);
  }
  function saveEvent(){
    if(!form.title||!form.date) return;
    const evt={...form,staffIds:form.staffIds.map(Number),clientId:form.clientId?Number(form.clientId):null};
    if(editEvt){
      setEvents(prev=>prev.map(e=>e.id===editEvt.id?{...evt,id:editEvt.id,gcalId:editEvt.gcalId}:e));
      addToast("Event updated","success");
    } else {
      const newEv={...evt,id:Date.now(),gcalId:null};
      setEvents(prev=>[...prev,newEv]);
      addToast("Event created","success");
      // Auto-offer to push to GCal
      setTimeout(()=>pushToGcal(newEv),300);
    }
    setShowForm(false); setSelected(null);
  }
  function deleteEvent(id){
    setEvents(prev=>prev.filter(e=>e.id!==id));
    setSelected(null);
    addToast("Event deleted","warn");
  }
  function toggleStaff(id){ setForm(f=>({...f,staffIds:f.staffIds.includes(id)?f.staffIds.filter(x=>x!==id):[...f.staffIds,id]})); }

  const upcomingEvs=events.filter(e=>e.date>=todayStr).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const allCells=[...events,...gcalEvents,...appleEvents];

  return(
    <div>
      {/* Sync banner */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,background:SURFACE2,border:`1px solid ${BORDER}`,borderRadius:10,padding:"10px 16px",flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13}}>
          <span style={{color:MUTED}}>Google Calendar sync · </span>
          <span style={{color:ACCENT}}>{gcalEvents.length} events loaded</span>
          <span style={{color:MUTED}}> · Apple Calendar · </span>
          <span style={{color:"#FF9500"}}>{appleEvents.length} events</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="accent" onClick={fetchGcal} disabled={syncing} style={{fontSize:12,padding:"6px 14px"}}>
            {syncing?"Syncing…":"↻ Google"}
          </Btn>
          <Btn variant="accent" onClick={fetchApple} disabled={syncingApple} style={{fontSize:12,padding:"6px 14px",background:"#FF9500"}}>
            {syncingApple?"Syncing…":"↻ Apple"}
          </Btn>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 290px",gap:20}}>
        {/* Calendar grid */}
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div style={{fontSize:18,fontWeight:600}}>{["January","February","March","April","May","June","July","August","September","October","November","December"][mo]} {yr}</div>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={()=>setViewDate(new Date(yr,mo-1,1))} style={{fontSize:12,padding:"6px 12px"}}>‹</Btn>
              <Btn onClick={()=>setViewDate(new Date(today.getFullYear(),today.getMonth(),1))} style={{fontSize:12,padding:"6px 12px"}}>Today</Btn>
              <Btn onClick={()=>setViewDate(new Date(yr,mo+1,1))} style={{fontSize:12,padding:"6px 12px"}}>›</Btn>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
            {WDAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,color:MUTED,padding:"6px 0",textTransform:"uppercase",letterSpacing:"0.06em"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
            {cells.map((day,idx)=>{
              if(!day) return <div key={idx}/>;
              const cellDate=`${yr}-${pad2(mo+1)}-${pad2(day)}`;
              const dayEvs=allCells.filter(e=>e.date===cellDate);
              const isToday=cellDate===todayStr;
              return(
                <div key={idx} onClick={()=>openNew(day)}
                  style={{minHeight:80,background:isToday?ACCENT+"18":SURFACE,border:`1px solid ${isToday?ACCENT+"55":BORDER}`,
                    borderRadius:8,padding:6,cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background=SURFACE2}
                  onMouseLeave={e=>e.currentTarget.style.background=isToday?ACCENT+"18":SURFACE}
                >
                  <div style={{fontSize:12,fontWeight:isToday?700:400,color:isToday?ACCENT:TEXT,marginBottom:4}}>{day}</div>
                  {dayEvs.map(ev=>(
                    <div key={ev.id} onClick={e=>{e.stopPropagation();setSelected(ev);}}
                      style={{background:ev.color+"33",border:`1px solid ${ev.color}55`,borderLeft:`3px solid ${ev.color}`,
                        borderRadius:4,padding:"2px 5px",fontSize:10,marginBottom:2,color:TEXT,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer"}}
                      title={`${ev.title}${ev.isGcal?" (Google Calendar)":""}`}
                    >{ev.isGcal?"📅 ":""}{ev.title}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Btn variant="primary" onClick={()=>openNew(today.getDate())} style={{width:"100%",padding:"10px"}}>+ New Event</Btn>

          {/* Selected detail */}
          {selected&&!selected.isGcal&&(
            <div style={{background:SURFACE,border:`1px solid ${selected.color}55`,borderLeft:`4px solid ${selected.color}`,borderRadius:10,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontWeight:600,fontSize:14}}>{selected.title}</div>
                <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:MUTED,fontSize:18,cursor:"pointer"}}>×</button>
              </div>
              <div style={{fontSize:12,color:MUTED}}>{fmtDate(selected.date)}</div>
              {selected.venue&&<div style={{fontSize:12,marginTop:4}}>{selected.venue}</div>}
              {selected.notes&&<div style={{fontSize:12,color:MUTED,marginTop:4,fontStyle:"italic"}}>{selected.notes}</div>}
              <div style={{margin:"10px 0",display:"flex",flexWrap:"wrap",gap:4}}>
                {selected.staffIds.map(id=>{const s=staff.find(x=>x.id===id);return s?<Badge key={id} color={MUTED}>{s.name.split(" ")[0]}</Badge>:null;})}
              </div>
              {selected.gcalId
                ?<div style={{fontSize:11,color:ACCENT,marginBottom:10}}>✓ GCal</div>
                :<Btn variant="accent" onClick={()=>pushToGcal(selected)} style={{width:"100%",fontSize:12,padding:"6px",marginBottom:8}}>Sync</Btn>
              }
              <Btn variant="amber" onClick={()=>setBookingModal(selected)} style={{width:"100%",fontSize:12,padding:"6px",marginBottom:8}}>
                Notify
              </Btn>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>openEdit(selected)} style={{flex:1,fontSize:12,padding:"6px"}}>E</Btn>
                <Btn variant="danger" onClick={()=>deleteEvent(selected.id)} style={{flex:1,fontSize:12,padding:"6px"}}>X</Btn>
              </div>
            </div>
          )}
          {selected?.isGcal&&(
            <div style={{background:SURFACE,border:`1px solid ${selected.color}55`,borderLeft:`4px solid ${selected.color}`,borderRadius:10,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontWeight:600,fontSize:14}}>{selected.title}</div>
                <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:MUTED,fontSize:18,cursor:"pointer"}}>×</button>
              </div>
              <div style={{fontSize:12,color:"#5ca4ea",marginBottom:4}}>📅 Google Calendar Event</div>
              <div style={{fontSize:12,color:MUTED}}>{fmtDate(selected.date)} · {selected.startTime}–{selected.endTime}</div>
              {selected.location&&<div style={{fontSize:12,marginTop:4}}>{selected.location}</div>}
            </div>
          )}

          {/* Upcoming */}
          <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:10,padding:16}}>
            <div style={{fontSize:11,color:MUTED,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Upcoming Events</div>
            {upcomingEvs.length===0&&<div style={{fontSize:13,color:MUTED}}>No upcoming events</div>}
            {upcomingEvs.map(ev=>(
              <div key={ev.id} onClick={()=>setSelected(ev)} style={{marginBottom:12,cursor:"pointer"}}>
                <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <div style={{width:3,minHeight:36,background:ev.color,borderRadius:2,flexShrink:0,marginTop:2}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:500}}>{ev.title}</div>
                    <div style={{fontSize:11,color:MUTED}}>{fmtDate(ev.date)} · {ev.startTime}</div>
                    <div style={{fontSize:11,color:MUTED,display:"flex",gap:6,alignItems:"center"}}>
                      <span>{ev.staffIds.length} staff</span>
                      {ev.gcalId&&<span style={{color:ACCENT}}>✓GCal</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* GCal legend */}
          <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:10,padding:12,fontSize:11,color:MUTED}}>
            <div style={{marginBottom:6,fontWeight:500,color:TEXT}}>Calendar Legend</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><div style={{width:10,height:10,borderRadius:2,background:ACCENT}}/> Freshpeople events</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><div style={{width:10,height:10,borderRadius:2,background:"#5ca4ea"}}/> Google Calendar</div>
            <div style={{marginTop:8}}>Apple Calendar syncs via:<br/>Settings → Calendar → Add Account → Google</div>
          </div>
        </div>
      </div>

      {/* Event form */}
      {showForm&&(
        <Modal title={editEvt?"Edit Event":"New Event"} onClose={()=>setShowForm(false)}>
          <Fld label="Event Title"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Corporate Gala" style={{width:"100%"}}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <Fld label="Date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{width:"100%"}}/></Fld>
            <Fld label="Client">
              <select value={form.clientId} onChange={e=>setForm(f=>({...f,clientId:e.target.value}))} style={{width:"100%"}}>
                <option value="">— No client —</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Fld>
          </div>
          <Fld label="Venue"><input value={form.venue} onChange={e=>setForm(f=>({...f,venue:e.target.value}))} placeholder="e.g. Sandton Convention Centre" style={{width:"100%"}}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            <Fld label="Start"><input type="time" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))} style={{width:"100%"}}/></Fld>
            <Fld label="End"><input type="time" value={form.endTime} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))} style={{width:"100%"}}/></Fld>
            <Fld label="Colour">
              <div style={{display:"flex",gap:6,paddingTop:4}}>
                {[ACCENT,PURPLE,AMBER,CORAL,"#5ca4ea"].map(c=>(
                  <div key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                    style={{width:22,height:22,borderRadius:"50%",background:c,cursor:"pointer",border:form.color===c?"3px solid #fff":"3px solid transparent"}}/>
                ))}
              </div>
            </Fld>
          </div>
          <Fld label="Assign Staff">
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {staff.map(s=>(
                <div key={s.id} onClick={()=>toggleStaff(s.id)}
                  style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",
                    background:form.staffIds.includes(s.id)?ACCENT+"22":SURFACE2,
                    border:`1px solid ${form.staffIds.includes(s.id)?ACCENT:BORDER}`,
                    color:form.staffIds.includes(s.id)?ACCENT:TEXT}}
                >{s.name.split(" ")[0]} <span style={{color:MUTED,fontSize:10}}>({s.role})</span></div>
              ))}
            </div>
          </Fld>
          <Fld label="Notes / Instructions">
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} style={{width:"100%"}} placeholder="Dress code, contact person, etc."/>
          </Fld>
          <div style={{display:"flex",gap:10}}>
            <Btn variant="primary" onClick={saveEvent} style={{flex:1,padding:"11px"}}>{editEvt?"Save Changes":"Create & Sync to Google Cal"}</Btn>
            <Btn variant="ghost" onClick={()=>setShowForm(false)} style={{flex:1,padding:"11px"}}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* Booking notifications modal */}
      {bookingModal&&(
        <Modal title="Send Staff Booking Notifications" onClose={()=>setBookingModal(null)} width={500}>
          <div style={{marginBottom:20}}>
            <div style={{fontWeight:600,fontSize:15,marginBottom:4}}>{bookingModal.title}</div>
            <div style={{fontSize:13,color:MUTED}}>{fmtDate(bookingModal.date)} · {bookingModal.startTime}–{bookingModal.endTime} · {bookingModal.venue}</div>
          </div>
          <div style={{marginBottom:20}}>
            <Lbl>Staff receiving WhatsApp booking notices ({bookingModal.staffIds.length})</Lbl>
            {bookingModal.staffIds.map(id=>{
              const s=staff.find(x=>x.id===id);
              if(!s) return null;
              const pay=(eventHours(bookingModal)*s.rate).toFixed(2);
              return(
                <div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:SURFACE2,borderRadius:8,marginBottom:6}}>
                  <div>
                    <div style={{fontWeight:500,fontSize:13}}>{s.name}</div>
                    <div style={{fontSize:11,color:MUTED}}>{s.phone || "No phone on file"}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,color:ACCENT,fontFamily:"'DM Mono',monospace"}}>R {pay}</div>
                    <div style={{fontSize:11,color:MUTED}}>{eventHours(bookingModal).toFixed(1)}h @ R{s.rate}/h</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{background:SURFACE2,borderRadius:8,padding:"10px 14px",fontSize:12,color:MUTED,marginBottom:20}}>
            💡 Sends a WhatsApp booking notice to each assigned staff member and records the dispatch result.
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn variant="primary" onClick={()=>sendBookingNotifications(bookingModal)} disabled={sendingNotifs} style={{flex:1,padding:"11px"}}>
              {sendingNotifs?"Sending WhatsApp notices…":"📱 Send Booking Notices"}
            </Btn>
            <Btn variant="ghost" onClick={()=>setBookingModal(null)} style={{flex:1,padding:"11px"}}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── PIN Pad ──────────────────────────────────────────────────────────────────
function PinPad({onSuccess,staff,adminMode}){
  const [pin,setPin]=useState(""); const [shake,setShake]=useState(false); const [err,setErr]=useState("");
  function press(d){ if(pin.length>=4)return; const next=pin+d; setPin(next); if(next.length===4)setTimeout(()=>check(next),80); }
  function check(p){
    if(adminMode&&p==="0000"){onSuccess(null,true);return;}
    const found=staff.find(s=>s.pin===p);
    if(found){onSuccess(found,false);return;}
    setShake(true);setErr("Invalid PIN");
    setTimeout(()=>{setShake(false);setPin("");setErr("");},700);
  }
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,padding:24}}>
      <div style={{fontSize:13,color:MUTED}}>Enter your PIN{adminMode?" · Admin: 0000":""}</div>
      <div style={{display:"flex",gap:12,transform:shake?"translateX(8px)":"none",transition:"transform 0.1s"}}>
        {Array.from({length:4},(_,i)=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:i<pin.length?ACCENT:"transparent",border:`2px solid ${i<pin.length?ACCENT:BORDER}`,transition:"all 0.1s"}}/>)}
      </div>
      {err&&<div style={{fontSize:12,color:RED}}>{err}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,width:200}}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
          <button key={i} onClick={()=>k==="⌫"?setPin(p=>p.slice(0,-1)):k!==""?press(String(k)):null}
            style={{padding:"14px 0",background:k===""?"transparent":SURFACE2,border:`1px solid ${k===""?"transparent":BORDER}`,borderRadius:8,color:TEXT,fontSize:16,fontWeight:500,fontFamily:"'DM Mono',monospace",opacity:k===""?0:1}}
            onMouseEnter={e=>{if(k!=="")e.currentTarget.style.background=SURFACE;}}
            onMouseLeave={e=>{if(k!=="")e.currentTarget.style.background=SURFACE2;}}
          >{k}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App(){
  const [page,setPage]           = useState("login");
  const [currentStaff,setCS]     = useState(null);
  const [isAdmin,setIsAdmin]     = useState(false);
  const [staff,setStaff]      = useState(() => dataStore.listStaff());
  const [records,setRecords]     = useState([]);
  const [now,setNow]             = useState(Date.now());
  const [adminTab,setAdminTab]   = useState(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/+|\/+$/g, '') : '';
    if (path === 'payroll') return 'payroll';
    if (path === 'documents' || path === 'billing') return 'documents';
    return 'dashboard';
  });
  const [events,setEvents]       = useState(() => dataStore.listEvents());
  const todayStr = ymd(today);
  const todayEvents = events.filter(e => e.date === todayStr);
  const [invoices,setInvoices]   = useState(() => dataStore.listInvoices());
  const [quotes,setQuotes]       = useState(() => dataStore.listQuotes());
  const [clients,setClients]     = useState(() => dataStore.listClients());
  const [toasts,setToasts]       = useState([]);
  const [newStaff,setNewStaff]   = useState({name:"",role:"",rate:"",pin:"",department:"Bar",uniform:false,phone:""});
  const [editingStaffId,setEditingStaffId] = useState(null);
  const [currentModel,setCurrentModel] = useState('deepseek/deepseek-chat-v3-0324:free');
  const [currentTask,setCurrentTask] = useState('default');

  const replaceStoreState = useCallback((s: LocalStore) => {
    setStaff(s.staff);
    setEvents(s.events);
    setInvoices(s.invoices);
    setQuotes(s.quotes);
    setClients(s.clients);
  }, []);

  // Load remote Firestore data when configured, then fall back to local store.
  useEffect(() => {
    let cancelled = false;
    dataStore.loadFromCloud().then((remote) => {
      if (cancelled || !remote) return;
      replaceStoreState(remote);
    }).catch((e) => console.warn('FPCC Firestore load failed', e))
      .finally(() => {
        if (cancelled) return;
        setStaff(dataStore.listStaff());
        setEvents(dataStore.listEvents());
        setInvoices(dataStore.listInvoices());
        setQuotes(dataStore.listQuotes());
        setClients(dataStore.listClients());
      });
    return () => { cancelled = true; };
  }, [replaceStoreState]);

  // Refresh local state whenever the user changes admin tab.
  useEffect(() => {
    setStaff(dataStore.listStaff());
    setEvents(dataStore.listEvents());
    setInvoices(dataStore.listInvoices());
    setQuotes(dataStore.listQuotes());
    setClients(dataStore.listClients());
  }, [adminTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = adminTab === 'dashboard' ? '/' : `/${adminTab}`;
    if (window.location.pathname !== path) window.history.replaceState(null, '', path);
  }, [adminTab]);

  useEffect(()=>{ const t=setInterval(()=>setNow(Date.now()),10000); return()=>clearInterval(t); },[]);

  // Task detection for model rotation
  useEffect(() => {
    const taskMapping = {
      'dashboard': 'data-analysis',
      'roster': 'staff-scheduling',
      'timesheets': 'payroll-calculation',
      'calendar': 'event-planning',
      'documents': 'invoice-generation',
      'clients': 'client-communication',
      'payroll': 'payroll-calculation',
      'add staff': 'staff-scheduling'
    };
    setCurrentTask(taskMapping[adminTab] || 'default');
  }, [adminTab]);

  const addToast = useCallback((msg,type="success")=>{
    const id=Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4000);
  },[]);

  function handleLogin(member,adminFlag){
    if(adminFlag){
      setIsAdmin(true);setCS(null);setPage("admin");
      // Bootstrap API token for write-protected routes (staff/events/dispatch).
      // Prompts for server-side admin password (set via FPCC_ADMIN_PASSWORD env).
      // Token stored in localStorage; re-enter on new sessions or when expired.
      setTimeout(async () => {
        try {
          const stored = localStorage.getItem('fpcc_admin_token');
          if (stored) return; // already have
          const pw = window.prompt('Enter FPCC admin password (from FPCC_ADMIN_PASSWORD env) to enable staff/event writes & dispatch. (Cancel to use read-only for now)');
          if (!pw) return;
          const r = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw })
          });
          const j = await r.json();
          if (j.token) {
            localStorage.setItem('fpcc_admin_token', j.token);
            console.log('[FPCC] Admin token obtained for API writes.');
          } else {
            alert('Token bootstrap failed: ' + (j.error || 'unknown'));
          }
        } catch (e) { console.warn('Token bootstrap skipped', e); }
      }, 200);
    }
    else{setCS(member);setIsAdmin(false);setPage("staff");}
  }
  function clockIn(id){if(!records.find(r=>r.staffId===id&&!r.clockOut))setRecords(p=>[...p,{id:Date.now(),staffId:id,clockIn:Date.now(),clockOut:null}]);}
  function clockOut(id){setRecords(p=>p.map(r=>r.staffId===id&&!r.clockOut?{...r,clockOut:Date.now()}:r));}

  const activeRec   = currentStaff?records.find(r=>r.staffId===currentStaff.id&&!r.clockOut):null;
  const elapsed     = activeRec?now-activeRec.clockIn:0;
  const myShifts    = currentStaff?records.filter(r=>r.staffId===currentStaff.id&&r.clockOut).slice(-5).reverse():[];
  const myTotalMs   = myShifts.reduce((a,r)=>a+(r.clockOut-r.clockIn),0);
  const myPay       = currentStaff?calcPay(myTotalMs,currentStaff.rate):0;
  const completed   = records.filter(r=>r.clockOut);
  const tPayroll    = completed.reduce((a,r)=>{const s=staff.find(x=>x.id===r.staffId);return a+calcPay(r.clockOut-r.clockIn,s?.rate||0);},0);
  const tHours      = completed.reduce((a,r)=>a+(r.clockOut-r.clockIn)/3600000,0);
  const tActive     = staff.filter(s=>records.some(r=>r.staffId===s.id&&!r.clockOut)).length;

  const TABS=[["dashboard","Dashboard"],["roster","Roster"],["timesheets","Timesheets"],["calendar","Calendar"],["documents","Docs & Billing"],["clients","Clients"],["payroll","Payroll"],["add staff","Add Staff"]];

  return(
    <>
      <style>{css}</style>

      {/* Header */}
      <div style={{background:SURFACE,borderBottom:`1px solid ${BORDER}`,padding:"0 24px",display:"flex",alignItems:"center",gap:16,height:56,position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,background:ACCENT,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#000"}}>FP</div>
          <span style={{fontWeight:600,fontSize:15,letterSpacing:"-0.02em"}}>Freshpeople</span>
          <span style={{color:MUTED,fontSize:13}}>Command Center</span>
        </div>
        <div style={{flex:1}}/>
        {page!=="login"&&(
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {isAdmin&&<Badge color={ACCENT}>Admin</Badge>}
            {currentStaff&&<Badge color={MUTED}>{currentStaff.name.split(" ")[0]}</Badge>}
            <button onClick={()=>{setPage("login");setCS(null);setIsAdmin(false);}}
              style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:6,color:MUTED,fontSize:12,padding:"4px 10px",cursor:"pointer"}}>Sign out</button>
          </div>
        )}
        <div style={{color:MUTED,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{new Date(now).toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})}</div>
        <ModelPanel currentTask={currentTask} onModelSelect={(modelId) => setCurrentModel(modelId)} />
      </div>

      <div style={{maxWidth:1080,margin:"0 auto",padding:"32px 20px"}}>

        {/* LOGIN */}
        {page==="login"&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:40}}>
              <h1 style={{fontSize:24,fontWeight:700,marginBottom:8}}>Freshpeople</h1>
              <p style={{color:MUTED,fontSize:13,marginBottom:24}}>Enter PIN</p>
            <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:14,width:"100%",maxWidth:320}}>
              <PinPad staff={staff} onSuccess={handleLogin} adminMode/>
            </div>
            <div style={{marginTop:24,display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
              {staff.slice(0,3).map(s=><div key={s.id} style={{fontSize:11,color:MUTED,background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:6,padding:"4px 10px"}}>{s.name.split(" ")[0]}: {s.pin}</div>)}
            </div>
          </div>
        )}

        {/* STAFF */}
        {page==="staff"&&currentStaff&&(
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{fontSize:22,fontWeight:700}}>{currentStaff.name}</h1>
            </div>
              <div style={{background:SURFACE,border:`1px solid ${activeRec?ACCENT+"44":BORDER}`,borderRadius:14,padding:28,marginBottom:24,textAlign:"center",transition:"border 0.3s"}}>
                <div style={{fontSize:13,color:MUTED,marginBottom:8}}>{activeRec?"Active":"Off"}</div>
                <div style={{fontSize:48,fontWeight:700,fontFamily:"'DM Mono',monospace",color:activeRec?ACCENT:MUTED,marginBottom:4,letterSpacing:"-0.02em"}}>{activeRec?fmtDur(elapsed):"—"}</div>
                {activeRec&&<div style={{fontSize:13,color:MUTED,marginBottom:20}}>In at {fmtTime(activeRec.clockIn)}</div>}
              <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:20}}>
                {!activeRec
                  ?<button onClick={()=>clockIn(currentStaff.id)} style={{background:ACCENT,color:"#000",border:"none",borderRadius:10,padding:"14px 40px",fontSize:15,fontWeight:600,cursor:"pointer"}}>Clock In</button>
                  :<button onClick={()=>clockOut(currentStaff.id)} style={{background:RED,color:"#fff",border:"none",borderRadius:10,padding:"14px 40px",fontSize:15,fontWeight:600,cursor:"pointer"}}>Clock Out</button>
                }
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
              <Stat label="Shifts today" value={myShifts.length}/>
              <Stat label="Total hours" value={`${(myTotalMs/3600000).toFixed(1)}h`} accent={ACCENT}/>
              <Stat label="Earnings" value={`R ${myPay.toFixed(0)}`} accent={ACCENT}/>
            </div>
            {myShifts.length>0&&(
              <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,padding:"16px 20px"}}>
                <div style={{fontSize:12,color:MUTED,marginBottom:14}}>Recent</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{borderBottom:`1px solid ${BORDER}`}}>{["In","Out","Hrs","R"].map(h=><th key={h} style={{padding:"4px 8px",textAlign:"left",color:MUTED,fontWeight:400,paddingBottom:10}}>{h}</th>)}</tr></thead>
                  <tbody>{myShifts.map(r=>(
                    <tr key={r.id} style={{borderBottom:`1px solid ${BORDER}22`}}>
                      <td style={{padding:"10px 8px",fontFamily:"'DM Mono',monospace"}}>{fmtTime(r.clockIn)}</td>
                      <td style={{padding:"10px 8px",fontFamily:"'DM Mono',monospace"}}>{fmtTime(r.clockOut)}</td>
                      <td style={{padding:"10px 8px"}}>{fmtDur(r.clockOut-r.clockIn)}</td>
                      <td style={{padding:"10px 8px",color:ACCENT,fontFamily:"'DM Mono',monospace"}}>R {calcPay(r.clockOut-r.clockIn,currentStaff.rate).toFixed(2)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ADMIN */}
        {page==="admin"&&isAdmin&&(
          <div>
            <div style={{marginBottom:20}}>
              <h1 style={{fontSize:22,fontWeight:700}}>Dashboard</h1>
            </div>

            {/* Tabs */}
            <div style={{display:"flex",gap:2,background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:10,padding:4,marginBottom:28,overflowX:"auto"}}>
              {TABS.map(([k,l])=>(
                <button key={k} onClick={()=>setAdminTab(k)} style={{
                  padding:"8px 18px",borderRadius:7,border:"none",fontSize:13,fontWeight:500,whiteSpace:"nowrap",cursor:"pointer",
                  background:adminTab===k?ACCENT+"22":"transparent",
                  color:adminTab===k?ACCENT:MUTED,
                  borderBottom:adminTab===k?`2px solid ${ACCENT}`:"2px solid transparent",
                }}>{l}</button>
              ))}
            </div>

            {/* DASHBOARD */}
            {/* DASHBOARD - Clean & Modern */}
            {adminTab==="dashboard"&&(
              <div>
                {/* KPI Row */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
                  <div className="fp-kpi">
                    <div className="fp-kpi__label">Active Staff</div>
                    <div className="fp-kpi__value">{tActive || staff.filter(s=>s.uniform).length}</div>
                    <div className="fp-kpi__sub">{staff.length} total in roster</div>
                  </div>
                  <div className="fp-kpi">
                    <div className="fp-kpi__label">Shifts Today</div>
                    <div className="fp-kpi__value">{todayEvents.length}</div>
                    <div className="fp-kpi__sub">{events.length} events total</div>
                  </div>
                  <div className="fp-kpi">
                    <div className="fp-kpi__label">Timesheets Pending</div>
                    <div className="fp-kpi__value">{records.filter(r=>!r.clockOut).length}</div>
                    <div className="fp-kpi__sub">{records.length} shifts logged</div>
                  </div>
                  <div className="fp-kpi">
                    <div className="fp-kpi__label">Outstanding (ZAR)</div>
                    <div className="fp-kpi__value">R {invoices.filter(i=>i.status!=="paid").reduce((a,i)=>a + docSubtotal(i.lines) * (i.includeTax !== false ? (1 + (Number(i.taxRate) || 15) / 100) : 1), 0).toFixed(0)}</div>
                    <div className="fp-kpi__sub">{invoices.filter(i=>i.status!=="paid").length} unpaid</div>
                  </div>
                </div>

                {/* AI Operations Insights (Gemini) */}
                <AIInsightsCard staff={staff} events={events} clients={clients} invoices={invoices} quotes={quotes}/>

                <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24,marginBottom:24}}>
                  {/* Main Content */}
                  <div>
                    {/* Today's Events */}
                    <div style={{marginBottom:24}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                        <h2 style={{fontSize:20,fontWeight:600,color:TEXT,margin:0}}>Today's Events</h2>
                        <Btn variant="primary" onClick={()=>setAdminTab("calendar")} style={{fontSize:12}}>+ New Event</Btn>
                      </div>
                      
                      {todayEvents.length === 0 ? (
                        <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,padding:"32px 24px",textAlign:"center"}}>
                          <div style={{fontSize:48,marginBottom:8}}>📅</div>
                          <div style={{color:MUTED,fontSize:14}}>No events scheduled for today</div>
                        </div>
                      ) : (
                        <div style={{display:"flex",flexDirection:"column",gap:12}}>
                          {todayEvents.map(e => {
                            const client = clients.find(c => c.id === e.clientId);
                            const assignedStaff = staff.filter(s => e.staffIds?.includes(s.id));
                            return (
                              <div key={e.id} style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,padding:"20px 24px"}}>
                                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                                  <div style={{flex:1}}>
                                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                                      <div style={{width:8,height:8,borderRadius:"50%",background:e.color||ACCENT}}/>
                                      <h3 style={{fontSize:16,fontWeight:600,color:TEXT,margin:0}}>{e.title}</h3>
                                    </div>
                                    
                                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:12,fontSize:13,color:MUTED}}>
                                      <div>📍 {e.venue}</div>
                                      <div>⏰ {e.startTime} - {e.endTime}</div>
                                      <div>👤 {client?.name || "Unknown Client"}</div>
                                    </div>
                                    
                                    {assignedStaff.length > 0 && (
                                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                                        <span style={{fontSize:12,color:MUTED}}>Staff:</span>
                                        {assignedStaff.map(s => (
                                          <Badge key={s.id} color={ACCENT}>{s.name}</Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:16}}>
                                    <Btn variant="accent" onClick={async ()=>{
                                      try {
                                        const result = await FPCCCore.sendWhatsApp(e.id, e.staffIds || []);
                                        
                                        if (result.success) {
                                          addToast(`WhatsApp sent to ${result.dispatched} staff members`, 'success');
                                        } else {
                                          addToast('Failed to send WhatsApp notifications', 'error');
                                        }
                                      } catch (err) {
                                        addToast('Network error sending notifications', 'error');
                                      }
                                    }} style={{fontSize:12,padding:"6px 12px"}}>
                                      📤 Notify Staff
                                    </Btn>
                                    <Btn variant="ghost" onClick={()=>{setAdminTab("calendar")}} style={{fontSize:12,padding:"6px 8px"}}>✏️</Btn>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {/* Quick Actions */}
                    <div style={{marginBottom:24}}>
                      <h3 style={{fontSize:16,fontWeight:600,color:TEXT,marginBottom:16}}>Quick Actions</h3>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                        <button onClick={()=>setAdminTab("calendar")} style={{
                          background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,padding:"20px 16px",
                          display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                          transition:"all 0.2s",cursor:"pointer",color:"inherit"
                        }}>
                          <div style={{fontSize:24}}>📅</div>
                          <div style={{fontSize:13,fontWeight:500,color:TEXT}}>Create Event</div>
                        </button>
                        
                        <button onClick={()=>setAdminTab("add staff")} style={{
                          background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,padding:"20px 16px",
                          display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                          transition:"all 0.2s",cursor:"pointer",color:"inherit"
                        }}>
                          <div style={{fontSize:24}}>👥</div>
                          <div style={{fontSize:13,fontWeight:500,color:TEXT}}>Add Staff</div>
                        </button>
                        
                        <button onClick={async ()=>{
                          const todayStaffIds = todayEvents.flatMap(e => e.staffIds || []);
                          if (todayStaffIds.length === 0) {
                            addToast('No staff assigned to today\'s events', 'warning');
                            return;
                          }
                          try {
                            for (const event of todayEvents) {
                              if (event.staffIds?.length > 0) {
                                const dispatchToken = localStorage.getItem('fpcc_admin_token');
                                await fetch('/api/dispatch-staff', {
                                  method: 'POST',
                                  headers: { 
                                    'Content-Type': 'application/json',
                                    ...(dispatchToken ? { 'Authorization': `Bearer ${dispatchToken}` } : {})
                                  },
                                  body: JSON.stringify({ eventId: event.id, staffIds: event.staffIds })
                                });
                              }
                            }
                            addToast('Bulk WhatsApp dispatch completed', 'success');
                          } catch (err) {
                            addToast('Bulk dispatch failed', 'error');
                          }
                        }} style={{
                          background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,padding:"20px 16px",
                          display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                          transition:"all 0.2s",cursor:"pointer",color:"inherit"
                        }}>
                          <div style={{fontSize:24}}>📤</div>
                          <div style={{fontSize:13,fontWeight:500,color:TEXT}}>Bulk Dispatch</div>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sidebar */}
                  <div>
                    {/* Staff Status */}
                    <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,padding:"20px 24px",marginBottom:16}}>
                      <h3 style={{fontSize:16,fontWeight:600,color:TEXT,marginBottom:16}}>Staff Status</h3>
                      
                      <div style={{display:"flex",flexDirection:"column",gap:12}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:"#10b981"}}/>
                            <span style={{fontSize:13,color:TEXT}}>Available</span>
                          </div>
                          <span style={{fontSize:14,fontWeight:600,color:"#10b981"}}>{staff.length - todayEvents.flatMap(e => e.staffIds || []).length}</span>
                        </div>
                        
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:AMBER}}/>
                            <span style={{fontSize:13,color:TEXT}}>On Assignment</span>
                          </div>
                          <span style={{fontSize:14,fontWeight:600,color:AMBER}}>{todayEvents.flatMap(e => e.staffIds || []).length}</span>
                        </div>
                        
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:RED}}/>
                            <span style={{fontSize:13,color:TEXT}}>Total Staff</span>
                          </div>
                          <span style={{fontSize:14,fontWeight:600,color:TEXT}}>{staff.length}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Recent Bookings */}
                    <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,padding:"20px 24px"}}>
                      <h3 style={{fontSize:16,fontWeight:600,color:TEXT,marginBottom:16}}>Upcoming Events</h3>
                      
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {events.filter(e => new Date(e.date) > new Date()).slice(0,4).map((event) => (
                          <div key={event.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0"}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:event.color||ACCENT}}/>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12,color:TEXT}}>{event.title}</div>
                              <div style={{fontSize:10,color:MUTED}}>{new Date(event.date).toLocaleDateString()} - {event.startTime}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CLIENTS - CRM Agent */}
            {adminTab==="clients"&&<ClientsView clients={clients} events={events} addToast={addToast}/>}

            {/* ROSTER - simplified, no filters */}
            {adminTab==="roster"&&(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
                  {staff.map(s=>{
                    const active=records.some(r=>r.staffId===s.id&&!r.clockOut);
                    const shifts=records.filter(r=>r.staffId===s.id&&r.clockOut);
                    const hrs=shifts.reduce((a,r)=>a+(r.clockOut-r.clockIn)/3600000,0);
                    return (
                      <StaffCard
                        key={s.id}
                        staff={s}
                        active={active}
                        hrs={hrs}
                        onView={()=>alert(s.name)}
                        onEdit={()=>{
                          setNewStaff({name:s.name,role:s.role,rate:String(s.rate),pin:s.pin,department:s.department,uniform:s.uniform,phone:s.phone});
                          setEditingStaffId(s.id);
                          setAdminTab("add staff");
                        }}
                        onRemove={()=>{
                          if(window.confirm(`Remove ${s.name}?`)){
                            setStaff(prev=>prev.filter(x=>x.id!==s.id));
                            addToast(s.name+" removed","success");
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* TIMESHEETS */}
            {adminTab==="timesheets"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <div style={{fontSize:14,color:MUTED}}>{completed.length} completed shifts</div>
                  <Btn variant="accent" onClick={()=>{
                    const payrollHeader="Name,Dept,Clock In,Clock Out,Hours,Pay (R)";
                    const lines=completed.map(r=>{const s=staff.find(x=>x.id===r.staffId);const dur=r.clockOut-r.clockIn;return `${s?.name},${s?.department},${fmtTime(r.clockIn)},${fmtTime(r.clockOut)},${(dur/3600000).toFixed(2)},${calcPay(dur,s?.rate||0).toFixed(2)}`;});
                    navigator.clipboard.writeText([payrollHeader,...lines].join("\n"));
                    addToast("Payroll CSV copied to clipboard","success");
                  }}>Export Payroll CSV</Btn>
                </div>
                {completed.length===0
                  ?<div style={{color:MUTED,textAlign:"center",padding:40}}>No completed shifts yet</div>
                  :<div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,overflow:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                      <thead style={{background:SURFACE2}}><tr>
                        {["Staff","Dept","Clock In","Clock Out","Duration","Pay"].map(label=><th key={label} style={{padding:"12px 14px",textAlign:"left",color:MUTED,fontWeight:500,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</th>)}
                      </tr></thead>
                      <tbody>{completed.slice().reverse().map(r=>{
                        const s=staff.find(x=>x.id===r.staffId); const dur=r.clockOut-r.clockIn;
                        return(<tr key={r.id} style={{borderTop:`1px solid ${BORDER}33`}}>
                          <td style={{padding:"12px 14px",fontWeight:500}}>{s?.name||"?"}</td>
                          <td style={{padding:"12px 14px",color:MUTED}}>{s?.department}</td>
                          <td style={{padding:"12px 14px",fontFamily:"'DM Mono',monospace"}}>{fmtTime(r.clockIn)}</td>
                          <td style={{padding:"12px 14px",fontFamily:"'DM Mono',monospace"}}>{fmtTime(r.clockOut)}</td>
                          <td style={{padding:"12px 14px"}}>{fmtDur(dur)}</td>
                          <td style={{padding:"12px 14px",color:ACCENT,fontFamily:"'DM Mono',monospace"}}>R {calcPay(dur,s?.rate||0).toFixed(2)}</td>
                        </tr>);
                      })}</tbody>
                    </table>
                  </div>
                }
              </div>
            )}

            {/* CALENDAR */}
            {adminTab==="calendar"&&<CalendarTab events={events} setEvents={setEvents} staff={staff} clients={clients} addToast={addToast} currentModel={currentModel}/>}

            {/* DOCUMENTS */}
            {adminTab==="documents"&&<DocumentsTab invoices={invoices} setInvoices={setInvoices} quotes={quotes} setQuotes={setQuotes} clients={clients} events={events} staff={staff}/>}

            {/* PAYROLL - Finance Agent */}
            {adminTab==="payroll"&&<Payroll staff={staff} events={events} records={records} addToast={addToast}/>}

            {/* ADD STAFF */}
            {adminTab==="add staff"&&(
              <div style={{maxWidth:500}}>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    {[{k:"name",l:"Full Name",p:"Amara Diallo"},{k:"role",l:"Role",p:"Bar Staff"},{k:"rate",l:"Hourly Rate (R)",p:"40",t:"number"},{k:"pin",l:"4-Digit PIN",p:"1234",mx:4}].map(f=>(
                      <div key={f.k}>
                        <Lbl>{f.l}</Lbl>
                        <input type={f.t||"text"} placeholder={f.p} maxLength={f.mx} value={newStaff[f.k]} onChange={e=>setNewStaff(p=>({...p,[f.k]:e.target.value}))} style={{width:"100%"}}/>
                      </div>
                    ))}
                    <div><Lbl>Phone</Lbl><input value={newStaff.phone} onChange={e=>setNewStaff(p=>({...p,phone:e.target.value}))} placeholder="+27 71 000 0000" style={{width:"100%"}}/></div>
                  </div>
                  <div>
                    <Lbl>Department</Lbl>
                    <select value={newStaff.department} onChange={e=>setNewStaff(p=>({...p,department:e.target.value}))} style={{width:"100%"}}>
                      {["Bar","Floor","Management","Security"].map(d=><option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <input type="checkbox" checked={newStaff.uniform} onChange={e=>setNewStaff(p=>({...p,uniform:e.target.checked}))} style={{width:16,height:16}}/>
                    <span style={{fontSize:13,color:MUTED}}>Requires uniform</span>
                  </div>
                  <Btn variant="primary" onClick={()=>{ 
                    if(!newStaff.name||!newStaff.pin||!newStaff.rate) return; 
                    if(editingStaffId) {
                      // Update existing staff (persist to data store)
                      const updated = dataStore.updateStaff(editingStaffId, {
                        ...newStaff,
                        rate: Number(newStaff.rate) || 40,
                        uniform: newStaff.uniform
                      });
                      setStaff(prev=>prev.map(s=>s.id===editingStaffId?updated:s));
                      addToast(`${newStaff.name} updated`,"success");
                      setEditingStaffId(null);
                    } else {
                      // Add new staff (persist to data store)
                      const created = dataStore.addStaff({
                        ...newStaff,
                        rate: Number(newStaff.rate) || 40,
                        uniform: newStaff.uniform
                      });
                      setStaff(prev=>[...prev, created]);
                      addToast(`${newStaff.name} added to roster`,"success");
                    }
                    setNewStaff({name:"",role:"",rate:"",pin:"",department:"Bar",uniform:false,phone:""}); 
                  }} style={{padding:"12px 24px",fontSize:14}}>{editingStaffId?"Update Staff Member":"Add Staff Member"}</Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/27672961272?text=Hello%20Fresh%20People"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 20px',
          background: '#25D366',
          color: 'white',
          borderRadius: '50px',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 211, 102, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.4)';
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.272-.135-1.605-.793-1.855-.884-.249-.09-.431-.135-.611.135-.181.27-.7.884-.86 1.066-.271.198-.541.223-.818.074-.272-.148-1.152-.424-2.194-1.352-1.041-.721-1.744-1.61-1.949-1.882-.204-.271-.022-.419.146-.587.15-.159.331-.38.496-.57.166-.188.221-.322.332-.537.11-.215.055-.403-.027-.538-.082-.135-.611-.884-1.348-1.225-.947-.331-1.663-.331-2.262-.331-.215 0-.611.074-1.021.537C9.64 7.534 8.5 9.186 8.5 10.838c0 1.652.554 3.245 1.665 4.425.998 1.18 2.194 2.08 3.636 2.349.421.075.749.06 1.003-.148.272-.222 1.605-.793 1.855-1.066.27-.27.27-.5.189-.787-.082-.287-.611-.884-1.348-1.225z"/>
        </svg>
         Message Us
      </a>

      {/* Toast stack */}
      <div style={{position:"fixed",bottom:24,right:24,zIndex:999,display:"flex",flexDirection:"column",gap:8}}>
        {toasts.map(t=>(
          <div key={t.id} style={{background:SURFACE,border:`1px solid ${(t.type==="error"?RED:t.type==="warn"?AMBER:ACCENT)}55`,borderLeft:`4px solid ${t.type==="error"?RED:t.type==="warn"?AMBER:ACCENT}`,borderRadius:10,padding:"12px 18px",fontSize:13,color:TEXT,maxWidth:340,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}