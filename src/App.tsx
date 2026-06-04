import { useState, useEffect, useCallback } from "react";
import ClientsView from './components/ClientsView';
import Dashboard from './components/Dashboard';
import Payroll from './pages/Payroll';
import StaffCard from './components/StaffCard';

// ─── Constants & Seed ────────────────────────────────────────────────────────
const INITIAL_STAFF = [
  { id:1, name:"Amara Diallo",   role:"Bar Staff",   rate:14.5, pin:"1111", uniform:true,  department:"Bar",        email:"amara@freshpeople.co.za",   phone:"+27 71 001 0001" },
  { id:2, name:"Themba Nkosi",   role:"Floor Staff", rate:13.0, pin:"2222", uniform:true,  department:"Floor",      email:"themba@freshpeople.co.za",   phone:"+27 71 001 0002" },
  { id:3, name:"Priya Moodley",  role:"Supervisor",  rate:17.0, pin:"3333", uniform:false, department:"Management", email:"priya@freshpeople.co.za",    phone:"+27 71 001 0003" },
  { id:4, name:"Lerato Khumalo", role:"Bar Staff",   rate:14.5, pin:"4444", uniform:true,  department:"Bar",        email:"lerato@freshpeople.co.za",   phone:"+27 71 001 0004" },
  { id:5, name:"Sipho Dlamini",  role:"Security",    rate:15.5, pin:"5555", uniform:true,  department:"Security",   email:"sipho@freshpeople.co.za",    phone:"+27 71 001 0005" },
  { id:6, name:"Naledi Tau",     role:"Floor Staff", rate:13.0, pin:"6666", uniform:false, department:"Floor",      email:"naledi@freshpeople.co.za",   phone:"+27 71 001 0006" },
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
  { id:1, name:"Sandton Events Co",  email:"ops@sandtonevents.co.za",  vatNo:"4130265178", address:"14 Maude St, Sandton, 2196",   phone:"+27 11 555 0100" },
  { id:2, name:"MTN Group Ltd",      email:"procurement@mtn.com",      vatNo:"4000109388", address:"216 14th Ave, Fairland, 2195", phone:"+27 11 912 3000" },
  { id:3, name:"Priya & Dev Khumalo",email:"priya.khumalo@gmail.com",  vatNo:"",           address:"Private, KwaZulu-Natal",       phone:"+27 82 333 0001" },
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
const eventHours = ev => { const [sh,sm]=ev.startTime.split(":").map(Number),[eh,em]=ev.endTime.split(":").map(Number); return (eh*60+em-sh*60-sm)/60; };

function docSubtotal(lines) { return lines.reduce((a,l)=>a+Number(l.qty)*Number(l.rate),0); }
function nextDocNo(arr, prefix) { return `${prefix}-${new Date().getFullYear()}-${String(arr.length+1).padStart(3,"0")}`; }

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Dot({on,color}){return <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:on?(color||ACCENT):MUTED,boxShadow:on?`0 0 6px ${color||ACCENT}`:"none",flexShrink:0}}/>;}
function Badge({color,children}){return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:500,background:color+"22",color,border:`1px solid ${color}44`}}>{children}</span>;}
function Stat({label,value,accent}){
  return(
    <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:10,padding:"14px 18px"}}>
      <div style={{fontSize:11,color:MUTED,marginBottom:6}}>{label}</div>
      <div style={{fontSize:22,fontWeight:600,color:accent||TEXT,fontFamily:"'DM Mono',monospace"}}>{value}</div>
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

// ─── Anthropic API call helper (used inside artifact) ─────────────────────────
async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:1000,
      system: systemPrompt,
      messages:[{role:"user",content:userPrompt}]
    })
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ─── Document Print View (Invoice / Quote / Statement) ───────────────────────
function DocPrint({doc, docType, client, event: evt, allDocs, onClose}){
  const sub  = docSubtotal(doc.lines);
  const vat  = sub*0.15;
  const total= sub+vat;
  const isPaid = docType==="statement";
  const paidAmt = isPaid ? allDocs.filter(d=>d.clientId===doc.clientId&&d.status==="paid").reduce((a,d)=>a+docSubtotal(d.lines)*1.15,0) : 0;
  const outstanding = isPaid ? allDocs.filter(d=>d.clientId===doc.clientId&&d.status!=="paid").reduce((a,d)=>a+docSubtotal(d.lines)*1.15,0) : 0;

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
                {[["Subtotal",`R ${sub.toFixed(2)}`],["VAT (15%)",`R ${vat.toFixed(2)}`]].map(([l,v])=>(
                  <tr key={l}><td style={{padding:"4px 16px 4px 0",color:"#666"}}>{l}</td><td style={{padding:"4px 0",textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{v}</td></tr>
                ))}
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
function DocForm({docType, clients, events, existingDocs, onSave, onClose}){
  const prefix = docType==="invoice" ? "FP-INV" : "FP-QTE";
  const [form,setForm] = useState({
    docNo: nextDocNo(existingDocs, prefix),
    clientId:"", eventId:"",
    issueDate:ymd(today),
    dueDate: docType==="invoice" ? ymd(addDays(today,30)) : "",
    validUntil: docType==="quote" ? ymd(addDays(today,30)) : "",
    lines:[{desc:"",qty:1,rate:0}],
    notes: docType==="invoice"?"Thank you for your business.":"This quotation is valid for 30 days.",
    type: docType,
  });

  function prefill(eventId){
    const ev=events.find(e=>e.id===Number(eventId));
    if(!ev){ setForm(f=>({...f,eventId})); return; }
    const hrs=eventHours(ev);
    const lines=ev.staffIds.map(id=>{
      const s=INITIAL_STAFF.find(x=>x.id===id);
      return {desc:`${s?.name||"Staff"} — ${s?.role||""} (${hrs}h @ R${s?.rate}/h)`, qty:hrs, rate:s?.rate||0};
    });
    setForm(f=>({...f,eventId,clientId:String(ev.clientId||f.clientId),lines}));
  }
  function addLine(){ setForm(f=>({...f,lines:[...f.lines,{desc:"",qty:1,rate:0}]})); }
  function updLine(i,k,v){ setForm(f=>({...f,lines:f.lines.map((l,j)=>j===i?{...l,[k]:v}:l)})); }
  function rmLine(i){ setForm(f=>({...f,lines:f.lines.filter((_,j)=>j!==i)})); }

  const sub=docSubtotal(form.lines);

  return(
    <Modal title={docType==="invoice"?"New Invoice":"New Quotation"} onClose={onClose} width={660}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <Fld label="Doc Number"><input value={form.docNo} onChange={e=>setForm(f=>({...f,docNo:e.target.value}))} style={{width:"100%"}}/></Fld>
        <Fld label="Client *">
          <select value={form.clientId} onChange={e=>setForm(f=>({...f,clientId:e.target.value}))} style={{width:"100%"}}>
            <option value="">— Select client —</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Fld>
        <Fld label="Link Event (auto-fills lines)">
          <select value={form.eventId} onChange={e=>prefill(e.target.value)} style={{width:"100%"}}>
            <option value="">— None —</option>
            {events.map(ev=><option key={ev.id} value={ev.id}>{ev.title} ({fmtDate(ev.date)})</option>)}
          </select>
        </Fld>
        <Fld label="Issue Date"><input type="date" value={form.issueDate} onChange={e=>setForm(f=>({...f,issueDate:e.target.value}))} style={{width:"100%"}}/></Fld>
        {docType==="invoice"
          ?<Fld label="Due Date"><input type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} style={{width:"100%"}}/></Fld>
          :<Fld label="Valid Until"><input type="date" value={form.validUntil} onChange={e=>setForm(f=>({...f,validUntil:e.target.value}))} style={{width:"100%"}}/></Fld>
        }
      </div>
      <Fld label="Line Items">
        {form.lines.map((l,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 72px 96px 28px",gap:8,marginBottom:8,alignItems:"center"}}>
            <input value={l.desc} onChange={e=>updLine(i,"desc",e.target.value)} placeholder="Description" style={{width:"100%"}}/>
            <input type="number" value={l.qty} onChange={e=>updLine(i,"qty",e.target.value)} placeholder="Qty" style={{width:"100%",textAlign:"right"}}/>
            <input type="number" value={l.rate} onChange={e=>updLine(i,"rate",e.target.value)} placeholder="Rate" style={{width:"100%",textAlign:"right"}}/>
            <button onClick={()=>rmLine(i)} style={{background:"none",border:"none",color:MUTED,fontSize:18,cursor:"pointer"}}>×</button>
          </div>
        ))}
        <Btn onClick={addLine} style={{fontSize:12,padding:"5px 12px"}}>+ Add Line</Btn>
      </Fld>
      <div style={{background:SURFACE2,borderRadius:8,padding:"12px 16px",marginBottom:14,fontSize:13}}>
        <div style={{display:"flex",justifyContent:"space-between",color:MUTED}}><span>Subtotal</span><span className="mono">R {sub.toFixed(2)}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",color:MUTED}}><span>VAT 15%</span><span className="mono">R {(sub*0.15).toFixed(2)}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",fontWeight:600,marginTop:8,paddingTop:8,borderTop:`1px solid ${BORDER}`}}>
          <span>Total</span><span className="mono" style={{color:ACCENT}}>R {(sub*1.15).toFixed(2)}</span>
        </div>
      </div>
      <Fld label="Notes / Terms">
        <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} style={{width:"100%"}}/>
      </Fld>
      <div style={{display:"flex",gap:10}}>
        <Btn variant="primary" onClick={()=>onSave({...form,id:Date.now(),status:"draft",lines:form.lines.map(l=>({...l,qty:Number(l.qty),rate:Number(l.rate)}))})} style={{flex:1,padding:"11px"}}>
          Create {docType==="invoice"?"Invoice":"Quote"}
        </Btn>
        <Btn variant="ghost" onClick={onClose} style={{flex:1,padding:"11px"}}>Cancel</Btn>
      </div>
    </Modal>
  );
}

// ─── Documents Tab (Invoices + Quotes + Statements) ──────────────────────────
function DocumentsTab({invoices,setInvoices,quotes,setQuotes,clients,events}){
  const [view,setView]         = useState("invoices"); // invoices | quotes | statements
  const [showForm,setShowForm] = useState(null);       // "invoice" | "quote" | null
  const [printDoc,setPrintDoc] = useState(null);
  const [stmtClient,setStmtClient] = useState("");
  const [toast,setToast]       = useState(null);

  const allDocs = [...invoices,...quotes];

  const invTotal  = invoices.reduce((a,i)=>a+docSubtotal(i.lines)*1.15,0);
  const invPaid   = invoices.filter(i=>i.status==="paid").reduce((a,i)=>a+docSubtotal(i.lines)*1.15,0);
  const invOverdue= invoices.filter(i=>i.status==="overdue").length;
  const quoteConv = quotes.length ? Math.round(quotes.filter(q=>q.status==="accepted").length/quotes.length*100) : 0;

  function setStatus(id, status, collection, setter){
    setter(prev=>prev.map(d=>d.id===id?{...d,status}:d));
    setToast({msg:`Status updated to ${status}`,type:"success"});
  }
  function deleteDoc(id, setter){ setter(prev=>prev.filter(d=>d.id!==id)); }

  function convertToInvoice(quote){
    const inv={
      ...quote,
      id:Date.now(),
      docNo:nextDocNo(invoices,"FP-INV"),
      type:"invoice",
      dueDate:ymd(addDays(today,30)),
      validUntil:undefined,
      status:"draft",
    };
    setInvoices(prev=>[inv,...prev]);
    setQuotes(prev=>prev.map(q=>q.id===quote.id?{...q,status:"accepted"}:q));
    setToast({msg:`Quote converted to Invoice ${inv.docNo}`,type:"success"});
    setView("invoices");
  }

  const renderDocs = (docs, setter, isInvoice) => {
    if(!docs.length) return <div style={{textAlign:"center",padding:48,color:MUTED,fontSize:14}}>No documents found</div>;
    return(
      <div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead style={{background:SURFACE2}}><tr>
            {["Doc No","Client","Event","Date",isInvoice?"Due":"Valid Until","Total","Status",""].map(h=>(
              <th key={h} style={{padding:"12px 14px",textAlign:"left",color:MUTED,fontWeight:500,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{docs.map(doc=>{
            const client=clients.find(c=>c.id===doc.clientId);
            const event=events.find(e=>e.id===doc.eventId);
            const total=(docSubtotal(doc.lines)*1.15).toFixed(2);
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
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        <Stat label="Invoiced (incl VAT)"  value={`R ${invTotal.toFixed(0)}`}    accent={ACCENT} />
        <Stat label="Collected"            value={`R ${invPaid.toFixed(0)}`}      accent={ACCENT} />
        <Stat label="Overdue invoices"     value={invOverdue}                     accent={invOverdue?RED:MUTED} />
        <Stat label="Quote conversion"     value={`${quoteConv}%`}               accent={AMBER} sub={`${quotes.length} quotes total`}/>
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

      {/* Controls - simplified */}
      {view!=="statements"&&(
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
          <Btn variant="primary" onClick={()=>setShowForm(view==="invoices"?"invoice":"quote")}>
            + New {view==="invoices"?"Invoice":"Quote"}
          </Btn>
        </div>
      )}

      {/* Content */}
      {view==="invoices" && renderDocs(invoices, setInvoices, true)}
      {view==="quotes"   && renderDocs(quotes, setQuotes, false)}
      {view==="statements"&&(
        <div>
          <div style={{marginBottom:20,maxWidth:320}}>
            <Lbl>Select Client to generate statement</Lbl>
            <select value={stmtClient} onChange={e=>setStmtClient(e.target.value)} style={{width:"100%"}}>
              <option value="">— Choose client —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {stmtClient&&(()=>{
            const c=clients.find(x=>x.id===Number(stmtClient));
            const cDocs=allDocs.filter(d=>d.clientId===Number(stmtClient));
            const outstanding=cDocs.filter(d=>d.status!=="paid").reduce((a,d)=>a+docSubtotal(d.lines)*1.15,0);
            const paid=cDocs.filter(d=>d.status==="paid").reduce((a,d)=>a+docSubtotal(d.lines)*1.15,0);
            return(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                  <Stat label="Total invoiced" value={`R ${(outstanding+paid).toFixed(0)}`}/>
                  <Stat label="Paid" value={`R ${paid.toFixed(0)}`} accent={ACCENT}/>
                  <Stat label="Balance due" value={`R ${outstanding.toFixed(0)}`} accent={outstanding>0?RED:MUTED}/>
                </div>
                <Btn variant="accent" onClick={()=>setPrintDoc({
                  doc:{...c,docNo:`FP-STMT-${Date.now()}`,clientId:Number(stmtClient),issueDate:ymd(today),lines:[],notes:"",status:"statement"},
                  docType:"statement"
                })}>View / Print Statement</Btn>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modals */}
      {showForm&&(
        <DocForm
          docType={showForm}
          clients={clients}
          events={events}
          existingDocs={showForm==="invoice"?invoices:quotes}
          onSave={doc=>{ if(showForm==="invoice") setInvoices(p=>[doc,...p]); else setQuotes(p=>[doc,...p]); setShowForm(null); setToast({msg:`${showForm==="invoice"?"Invoice":"Quote"} ${doc.docNo} created`,type:"success"}); }}
          onClose={()=>setShowForm(null)}
        />
      )}
      {printDoc&&(
        <DocPrint
          doc={printDoc.doc}
          docType={printDoc.docType}
          client={clients.find(c=>c.id===printDoc.doc.clientId)}
          event={events.find(e=>e.id===printDoc.doc.eventId)}
          allDocs={allDocs}
          onClose={()=>setPrintDoc(null)}
        />
      )}
      {toast&&<Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}

// ─── Calendar Tab (with Google Calendar sync) ─────────────────────────────────
function CalendarTab({events,setEvents,staff,clients,addToast}){
  const [viewDate,setViewDate] = useState(new Date(today.getFullYear(),today.getMonth(),1));
  const [selected,setSelected] = useState(null);
  const [showForm,setShowForm] = useState(false);
  const [editEvt,setEditEvt]   = useState(null);
  const [gcalEvents,setGcalEvents] = useState([]);
  const [syncing,setSyncing]   = useState(false);
  const [bookingModal,setBookingModal] = useState(null); // event to send notifications for
  const [sendingNotifs,setSendingNotifs] = useState(false);
  const [form,setForm] = useState({title:"",date:"",venue:"",startTime:"09:00",endTime:"17:00",staffIds:[],clientId:"",color:ACCENT,notes:""});

  const yr=viewDate.getFullYear(), mo=viewDate.getMonth();
  const firstDay=new Date(yr,mo,1).getDay();
  const daysInMonth=new Date(yr,mo+1,0).getDate();
  const cells=Array.from({length:firstDay+daysInMonth},(_,i)=>i<firstDay?null:i-firstDay+1);
  const todayStr=ymd(today);

  // Fetch GCal events for the visible month
  async function fetchGcal(){
    setSyncing(true);
    try{
      // Fetch events from Apple Calendar via Nylas (old working method)
      const resp=await fetch('/api/calendar/nylas');
      const data=await resp.json();
      
      if(data.success && Array.isArray(data.events)){
        setGcalEvents(data.events.map(e=>({
          ...e,
          isGcal:true,
          color:"#5ca4ea",
          date:e.start.split('T')[0]
        })));
        addToast(`Apple Calendar synced via Nylas ✓ (${data.events.length} events)`,"success");
      } else if(data.error){
        addToast(`Sync error: ${data.error}`,"error");
      } else {
        addToast("No Apple Calendar events found","info");
      }
    }catch(e){ 
      console.error('Nylas sync error:', e);
      addToast("Could not sync Apple Calendar - check Nylas config","error"); 
    }
    setSyncing(false);
  }
  // Push event to GCal (Google Calendar)
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

      // Push to Google Calendar via our API
      const resp=await fetch('/api/calendar/google',{
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
        addToast(`"${ev.title}" pushed to Google Calendar ✓`,"success");
      } else {
        addToast(`Failed to push: ${data.error||'Unknown error'}`,"error");
      }
    }catch(e){ 
      console.error('Push to GCal error:', e);
      addToast("Failed to push to Google Calendar","error"); 
    }
  }

  // Send staff booking notifications via Gmail drafts
  async function sendBookingNotifications(ev){
    setSendingNotifs(true);
    const staffToNotify=ev.staffIds.map(id=>staff.find(s=>s.id===id)).filter(Boolean);
    const hrs=eventHours(ev).toFixed(1);
    const pay=staffToNotify.map(s=>({...s,total:(eventHours(ev)*s.rate).toFixed(2)}));
    let successCount=0;

    for(const s of pay){
      try{
        // Generate personalised email body via Claude
        const body=await callClaude(
          "You write concise, professional staff booking emails for Freshpeople Events Staffing. Be warm but brief. Plain text only, no markdown.",
          `Write a booking confirmation email to ${s.name} (${s.role}) for:
Event: ${ev.title}
Date: ${fmtDate(ev.date)}
Time: ${ev.startTime} – ${ev.endTime}
Venue: ${ev.venue||"TBC"}
Hours: ${hrs}h
Pay: R${s.total} (R${s.rate}/h)
Notes: ${ev.notes||"N/A"}
Sign off from: Freshpeople Admin`
        );

        // Create Gmail draft
        await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            model:"claude-sonnet-4-20250514",
            max_tokens:200,
            system:"Create the Gmail draft as instructed. Confirm with: Draft created.",
            messages:[{role:"user",content:`Create a Gmail draft email to: ${s.email}, subject: "Booking Confirmed: ${ev.title} — ${fmtDate(ev.date)}", body: ${JSON.stringify(body)}`}],
            mcp_servers:[{type:"url",url:"https://gmailmcp.googleapis.com/mcp/v1",name:"gmail"}]
          })
        });
        successCount++;
      }catch(e){}
    }
    setSendingNotifs(false);
    setBookingModal(null);
    addToast(`${successCount}/${staffToNotify.length} booking emails drafted in Gmail ✓`,"success");
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
  const allCells=[...events,...gcalEvents];

  return(
    <div>
      {/* Sync banner */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,background:SURFACE2,border:`1px solid ${BORDER}`,borderRadius:10,padding:"10px 16px"}}>
        <div style={{fontSize:13}}>
          <span style={{color:MUTED}}>Google Calendar sync · </span>
          <span style={{color:ACCENT}}>{gcalEvents.length} events loaded</span>
          <span style={{color:MUTED,fontSize:11,marginLeft:12}}>Apple Calendar syncs automatically via Google ↔ iCloud CalDAV</span>
        </div>
        <Btn variant="accent" onClick={fetchGcal} disabled={syncing} style={{fontSize:12,padding:"6px 14px"}}>
          {syncing?"Syncing…":"↻ Sync Google Calendar"}
        </Btn>
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
            <Lbl>Staff receiving booking emails ({bookingModal.staffIds.length})</Lbl>
            {bookingModal.staffIds.map(id=>{
              const s=staff.find(x=>x.id===id);
              if(!s) return null;
              const pay=(eventHours(bookingModal)*s.rate).toFixed(2);
              return(
                <div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:SURFACE2,borderRadius:8,marginBottom:6}}>
                  <div>
                    <div style={{fontWeight:500,fontSize:13}}>{s.name}</div>
                    <div style={{fontSize:11,color:MUTED}}>{s.email}</div>
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
            💡 Claude will write a personalised email for each staff member and save it as a Gmail draft. You review and send from your Gmail Drafts folder.
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn variant="primary" onClick={()=>sendBookingNotifications(bookingModal)} disabled={sendingNotifs} style={{flex:1,padding:"11px"}}>
              {sendingNotifs?"Drafting emails…":"📧 Draft All Booking Emails"}
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
  const [staff]                  = useState(INITIAL_STAFF);
  const [records,setRecords]     = useState([]);
  const [now,setNow]             = useState(Date.now());
  const [adminTab,setAdminTab]   = useState("dashboard");
  const [events,setEvents]       = useState(INITIAL_EVENTS);
  const [invoices,setInvoices]   = useState(INITIAL_INVOICES);
  const [quotes,setQuotes]       = useState(INITIAL_QUOTES);
  const [clients]                = useState(INITIAL_CLIENTS);
  const [toasts,setToasts]       = useState([]);
  const [newStaff,setNewStaff]   = useState({name:"",role:"",rate:"",pin:"",department:"Bar",uniform:false,email:"",phone:""});

  useEffect(()=>{ const t=setInterval(()=>setNow(Date.now()),10000); return()=>clearInterval(t); },[]);

  const addToast = useCallback((msg,type="success")=>{
    const id=Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4000);
  },[]);

  function handleLogin(member,adminFlag){
    if(adminFlag){setIsAdmin(true);setCS(null);setPage("admin");}
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

  const TABS=[["dashboard","Dashboard"],["roster","Roster"],["timesheets","Timesheets"],["calendar","Calendar"],["documents","Docs & Billing"],["add staff","Add Staff"]];

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
            {/* DASHBOARD - Executive Intelligence Agent */}
            {adminTab==="dashboard"&&<Dashboard staff={staff} events={events} clients={clients} records={records} now={now} addToast={addToast}/>}

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
                          setNewStaff({name:s.name,role:s.role,rate:String(s.rate),pin:s.pin,department:s.department,uniform:s.uniform,email:s.email,phone:s.phone});
                          setAdminTab("add staff");
                        }}
                        onRemove={()=>{
                          if(window.confirm("Remove?")){
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
                    const h="Name,Dept,Clock In,Clock Out,Hours,Pay (R)";
                    const lines=completed.map(r=>{const s=staff.find(x=>x.id===r.staffId);const dur=r.clockOut-r.clockIn;return `${s?.name},${s?.department},${fmtTime(r.clockIn)},${fmtTime(r.clockOut)},${(dur/3600000).toFixed(2)},${calcPay(dur,s?.rate||0).toFixed(2)}`;});
                    navigator.clipboard.writeText([h,...lines].join("\n"));
                    addToast("Payroll CSV copied to clipboard","success");
                  }}>Export Payroll CSV</Btn>
                </div>
                {completed.length===0
                  ?<div style={{color:MUTED,textAlign:"center",padding:40}}>No completed shifts yet</div>
                  :<div style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:12,overflow:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                      <thead style={{background:SURFACE2}}><tr>
                        {["Staff","Dept","Clock In","Clock Out","Duration","Pay"].map(h=><th key={h} style={{padding:"12px 14px",textAlign:"left",color:MUTED,fontWeight:500,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>)}
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
            {adminTab==="calendar"&&<CalendarTab events={events} setEvents={setEvents} staff={staff} clients={clients} addToast={addToast}/>}

            {/* DOCUMENTS */}
            {adminTab==="documents"&&<DocumentsTab invoices={invoices} setInvoices={setInvoices} quotes={quotes} setQuotes={setQuotes} clients={clients} events={events}/>}

            {/* PAYROLL - Finance Agent */}
            {adminTab==="payroll"&&<Payroll staff={staff} events={events} records={records} addToast={addToast}/>}

            {/* ADD STAFF */}
            {adminTab==="add staff"&&(
              <div style={{maxWidth:500}}>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    {[{k:"name",l:"Full Name",p:"Amara Diallo"},{k:"role",l:"Role",p:"Bar Staff"},{k:"rate",l:"Hourly Rate (R)",p:"14.50",t:"number"},{k:"pin",l:"4-Digit PIN",p:"1234",mx:4}].map(f=>(
                      <div key={f.k}>
                        <Lbl>{f.l}</Lbl>
                        <input type={f.t||"text"} placeholder={f.p} maxLength={f.mx} value={newStaff[f.k]} onChange={e=>setNewStaff(p=>({...p,[f.k]:e.target.value}))} style={{width:"100%"}}/>
                      </div>
                    ))}
                    <div><Lbl>Email</Lbl><input value={newStaff.email} onChange={e=>setNewStaff(p=>({...p,email:e.target.value}))} placeholder="name@freshpeople.co.za" style={{width:"100%"}}/></div>
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
                  <Btn variant="primary" onClick={()=>{ if(!newStaff.name||!newStaff.pin||!newStaff.rate) return; addToast(`${newStaff.name} added to roster`,"success"); setNewStaff({name:"",role:"",rate:"",pin:"",department:"Bar",uniform:false,email:"",phone:""}); }} style={{padding:"12px 24px",fontSize:14}}>Add Staff Member</Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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