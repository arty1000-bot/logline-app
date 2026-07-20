import React, {
  useState, useEffect, useRef, useContext, createContext,
  useCallback, Component
} from 'react';

import {
  TrendingUp, Navigation, Settings, Users, Wind, Mic,
  Droplets, CheckCircle2, FileText, Wifi, Signal, Battery,
  Search, X, Activity,
  AlertTriangle, Zap, BarChart2,
  AlertOctagon, Target, ClipboardList,
  Wrench,
  PlusCircle, TrendingDown, Leaf,
  Lock, Eye, LogOut, Moon, Check, Sun,
  Ship, MapPin, Info, Anchor, Briefcase, Map, Edit3, Loader
} from 'lucide-react';

import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// ═══════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════
const T = {
  bg:     { canvas:'#1A1B22', surface:'#242630', surfaceAlt:'#2C2E3C' },
  accent: { primary:'#524EFA', primaryHover:'#413CE0', soft:'rgba(82,78,250,0.15)',
            cyan:'#12D4FF', coral:'#FF5A5F', green:'#00E58F', amber:'#FFB017' },
  text:   { main:'#FFFFFF', vessel:'#E8EDF0', data:'#B0C2C6', muted:'#8E93A6', faint:'#5D6175' },
  shadow: { soft:'0 12px 32px rgba(0,0,0,0.25)', inner:'0 4px 12px rgba(0,0,0,0.1)', bottomNav:'0 -10px 40px rgba(0,0,0,0.2)' },
  radius: { sm:'12px', md:'18px', lg:'28px', pill:'999px' },
};

// ═══════════════════════════════════════════════════════
// UTC HELPERS
// ═══════════════════════════════════════════════════════
const utcNow  = ()    => new Date().toISOString();
const utcTime = ()    => new Date().toISOString().substr(11,5) + 'Z';
const utcFull = (iso) => iso ? new Date(iso).toISOString().substr(0,16).replace('T',' ')+'Z' : '—';
const utcDate = ()    => new Date().toISOString().substr(0,10);

// ═══════════════════════════════════════════════════════
// GEO HELPERS
// ═══════════════════════════════════════════════════════
const parseDeg = str => {
  if (!str) return 0;
  const m = str.match(/^(\d+)°([\d.]+)?([NSEW])$/);
  if (!m) return 0;
  const deg = parseFloat(m[1]) + (parseFloat(m[2] || '0') / 60);
  return (m[3] === 'S' || m[3] === 'W') ? -deg : deg;
};

const degToCompass = deg => {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
};

const PORT_COORDS = {
  NLRTM: [51.9225,  4.4792],
  SGSIN: [ 1.2641, 103.819],
  USLGB: [33.7545,-118.217],
  AEJEA: [25.0070,  55.066],
  SAJED: [21.4858,  39.193],
};

// ═══════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════
const GLOBAL_PORTS = [
  {id:'NLRTM',name:'Rotterdam',  country:'Netherlands', region:'Europe',     dist:4200,etaDays:14, wind:'NW 15kt',swell:'1.2m',blocked:false,hra:false},
  {id:'SGSIN',name:'Singapore',  country:'Singapore',   region:'Asia',       dist:3100,etaDays:10, wind:'NE 8kt', swell:'0.5m',blocked:false,hra:false},
  {id:'USLGB',name:'Long Beach', country:'USA',         region:'N. America', dist:8200,etaDays:27, wind:'W 10kt', swell:'1.8m',blocked:false,hra:false},
  {id:'AEJEA',name:'Jebel Ali',  country:'UAE',         region:'Gulf',       dist:400, etaDays:1.5,wind:'NW 5kt', swell:'0.2m',blocked:true, hra:true, alert:'HORMUZ BLOCKADE'},
  {id:'SAJED',name:'Jeddah',     country:'Saudi Arabia',region:'Red Sea',    dist:1200,etaDays:4,  wind:'N 12kt', swell:'0.8m',blocked:false,hra:true, alert:'Land-Bridge Hub'},
];

const FULL_CREW = [
  // Deck Department
  {id:1, name:'Ivanov, M.',   rank:'Master',            dept:'Deck'},
  {id:2, name:'Santos, J.',   rank:'Chief Officer',     dept:'Deck'},
  {id:3, name:'Chen, W.',     rank:'2nd Officer',       dept:'Deck'},
  {id:4, name:'Nair, S.',     rank:'3rd Officer',       dept:'Deck'},
  {id:5, name:'Park, S.',     rank:'Bosun',             dept:'Deck'},
  {id:6, name:'Reyes, D.',    rank:'Able Seaman',       dept:'Deck'},
  {id:7, name:'Okafor, E.',   rank:'Able Seaman',       dept:'Deck'},
  {id:8, name:'Mendoza, C.',  rank:'Able Seaman',       dept:'Deck'},
  {id:9, name:'Petrov, A.',   rank:'Ordinary Seaman',   dept:'Deck'},
  {id:10,name:'Tran, H.',     rank:'Ordinary Seaman',   dept:'Deck'},
  {id:11,name:'Ahuja, R.',    rank:'Pumpman',           dept:'Deck'},
  {id:12,name:'Garcia, M.',   rank:'Deck Cadet',        dept:'Deck'},
  // Engine Department
  {id:13,name:'Smith, R.',    rank:'Chief Engineer',    dept:'Engine'},
  {id:14,name:'Kumar, A.',    rank:'2nd Engineer',      dept:'Engine'},
  {id:15,name:'Nguyen, V.',   rank:'3rd Engineer',      dept:'Engine'},
  {id:16,name:'Osei, K.',     rank:'4th Engineer',      dept:'Engine'},
  {id:17,name:'Tanaka, H.',   rank:'Electrical Officer',dept:'Engine'},
  {id:18,name:'Mbeki, S.',    rank:'Fitter',            dept:'Engine'},
  {id:19,name:'Lim, J.',      rank:'Motorman',          dept:'Engine'},
  {id:20,name:'Hassan, M.',   rank:'Motorman',          dept:'Engine'},
  {id:21,name:'Kowalski, P.', rank:'Engine Cadet',      dept:'Engine'},
  // Catering / General Service
  {id:22,name:'Diaz, R.',     rank:'Chief Cook',        dept:'Catering'},
  {id:23,name:'Wu, X.',       rank:'Steward',           dept:'Catering'},
  {id:24,name:'Ibrahim, A.',  rank:'General Steward',   dept:'Catering'},
];

const PSC_SEED = [
  {id:1,cat:'Certificates',item:'Safety Management Certificate (SMC)',  done:true },
  {id:2,cat:'Certificates',item:'MARPOL Annex I – IOPP Certificate',    done:true },
  {id:3,cat:'Safety',      item:'Fire detection & suppression systems', done:true },
  {id:4,cat:'Safety',      item:'LSA equipment – liferafts, EPIRBs',    done:false},
  {id:5,cat:'Crew',        item:'STCW rest hours – all officers current',done:false},
];

const GMDSS_SEED = [
  {id:1,item:'MF/HF DSC Controller',       tested:true, freq:'Daily',  testedAt:'2026-03-09T07:14:00Z',testedBy:'Chen, W.'},
  {id:2,item:'VHF DSC Controller (Ch 70)', tested:true, freq:'Daily',  testedAt:'2026-03-09T07:16:00Z',testedBy:'Chen, W.'},
  {id:3,item:'SART (2×) – battery date',   tested:false,freq:'Monthly',testedAt:null,testedBy:null},
  {id:4,item:'EPIRB – self-test function',  tested:false,freq:'Weekly', testedAt:null,testedBy:null},
];

const DEFECTS_SEED = [
  {id:1,system:'Main Engine',  component:'ME FW Cooler',      desc:'Minor weeping on inspection cover gasket.',              priority:'medium',  loggedAt:'2026-03-06T10:22:00Z',updatedAt:null,assignee:'Kumar, A.',status:'open',     pscLinked:false},
  {id:2,system:'Deck',         component:'Bow Thruster Seal', desc:'Shaft seal degradation observed. Awaiting spare.',       priority:'high',    loggedAt:'2026-02-26T14:00:00Z',updatedAt:null,assignee:'Smith, R.',status:'spare_req',pscLinked:false},
  {id:3,system:'Safety',       component:'EPIRB HRU Unit #2', desc:'Hydrostatic release unit expired. PSC deficiency risk.', priority:'critical',loggedAt:'2026-03-05T09:00:00Z',updatedAt:null,assignee:'Chen, W.', status:'open',     pscLinked:true },
];

const SCHEDULED_JOBS = [
  {id:1,system:'Main Engine',job:'ME Cylinder Head Inspection',interval:'4,000 RH',due:'Overdue 220 RH',urgent:true},
  {id:2,system:'Auxiliary',  job:'AE1 Governor Service',       interval:'6,000 RH',due:'In 90 RH',      urgent:true},
  {id:3,system:'Safety',     job:'Liferaft Annual Inspection', interval:'Annual',  due:'In 6 days',     urgent:true},
  {id:4,system:'Deck',       job:'Anchor Chain Inspection',    interval:'Annual',  due:'In 42 days',    urgent:false},
];

const SPARES_ROB = [
  {id:1,part:'ME FW Cooler Gasket Set',    partNo:'MAN-5E-0321',  status:'on_order',eta:'Jeddah (4 days)'},
  {id:2,part:'AE Fuel Injection Pump Kit', partNo:'MAK-FIP-6M',   status:'critical',eta:'ROB: 0 — Order now'},
  {id:3,part:'Bow Thruster Shaft Seal',    partNo:'SKF-BT-SEAL-A',status:'on_order',eta:'Rotterdam ETA'},
  {id:4,part:'EPIRB HRU Replacement',      partNo:'ACR-HRU-2026', status:'on_order',eta:'Singapore (10 days)'},
];

const ROLES = [
  {id:'broker',  label:'Broker',         sub:'Shore Operations', shell:'shore',color:T.accent.cyan},
  {id:'master',  label:'Master',         sub:'vessel',           shell:'ship', color:T.accent.green},
  {id:'chiefeng',label:'Chief Engineer', sub:'vessel',           shell:'ship', color:T.accent.amber},
  {id:'crew',    label:'Deck / Ratings', sub:'vessel',           shell:'ship', color:T.text.muted,restricted:true},
];
const ROLE_ICON = {broker:Briefcase, master:Anchor, chiefeng:Settings, crew:Wrench};

const DEFAULT_VESSEL = {
  name:'MT Iron Titan',imo:'IMO 9876543',flag:'🇱🇷 Liberia',
  type:'VLCC',dwt:'298,000',callsign:'ELTI5',lat:'24°32.1N',lon:'057°18.4E',
};

const REROUTE_CHECKS = [
  'All charterers and relevant parties have been notified of the route change',
  'Alternative route weather and routing assessed and safe to proceed',
  'Charter party and commercial implications reviewed and accepted',
];

// ═══════════════════════════════════════════════════════
// STORAGE — localStorage (real-world compatible)
// NOTE: Replaces window.storage for production deployment
// ═══════════════════════════════════════════════════════
const store = {
  get(key) {
    try { 
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null; 
    } catch { 
      return null; 
    }
  },
  set(key, val) {
    try { 
      localStorage.setItem(key, JSON.stringify(val)); 
    } catch {}
  },
  del(key) {
    try { 
      localStorage.removeItem(key); 
    } catch {}
  },
  clear() {
    try { 
      localStorage.clear(); 
    } catch {}
  },
};

// ═══════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
const fmt    = n => new Intl.NumberFormat().format(n);
const fmtUSD = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const getETA = d => {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() + d);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
};
const hraActive = p => !!p?.hra;
const ciiFor    = p => (p?.blocked)
  ? {rating:'D',score:6.41,target:4.94,voyagePenalty:144020,dailyCO2:177.4,note:'Cape route: +760 mt CO₂ — CII Rating D.'}
  : {rating:'C',score:5.82,target:4.94,voyagePenalty:87780, dailyCO2:135.2,note:'Cape diversion risk if Hormuz stays closed.'};

// Position validation
const isValidPosition = (lat, lon) => {
  const latRegex = /^(\d{1,2})°(\d{1,2}(?:\.\d+)?)?[NS]$/;
  const lonRegex = /^(\d{1,3})°(\d{1,2}(?:\.\d+)?)?[EW]$/;
  return latRegex.test(lat) && lonRegex.test(lon);
};

// ═══════════════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════════════
class ErrorBoundary extends Component {
  state = {error:null};
  static getDerivedStateFromError(e){return {error:e.message};}
  render(){
    if(this.state.error) return (
      <div style={{padding:24,background:'rgba(255,90,95,0.1)',borderRadius:T.radius.lg,margin:16}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <AlertOctagon size={18} color={T.accent.coral}/>
          <span style={{fontSize:14,fontWeight:700,color:T.accent.coral}}>VIEW ERROR</span>
        </div>
        <p style={{fontSize:12,color:T.text.muted,margin:'0 0 16px',lineHeight:1.5}}>{this.state.error}</p>
        <button onClick={()=>this.setState({error:null})} style={{background:T.text.main,border:'none',borderRadius:T.radius.pill,padding:'12px 24px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Retry</button>
      </div>
    );
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════
// SHARED UI ATOMS
// ═══════════════════════════════════════════════════════
const Card = ({children, className="", style={}}) => (
  <section className={className} style={{background:T.bg.surface,borderRadius:T.radius.lg,boxShadow:T.shadow.soft,padding:'20px',display:'flex',flexDirection:'column',gap:'14px',border:'1px solid transparent',...style}}>
    {children}
  </section>
);

const CardHeader = ({icon:Icon,title,right}) => (
  <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      {Icon&&<Icon size={15} color={T.text.muted} aria-hidden="true"/>}
      <h3 style={{fontSize:13,color:T.text.muted,fontWeight:600,margin:0,textTransform:'uppercase',letterSpacing:'0.04em'}}>{title}</h3>
    </div>
    {right}
  </header>
);

const Stat = ({label,value,unit,accent}) => (
  <div style={{background:T.bg.surfaceAlt,borderRadius:T.radius.sm,padding:'10px 12px',display:'flex',flexDirection:'column',gap:'4px'}}>
    <p style={{fontSize:11,color:T.text.muted,fontWeight:500,margin:0,textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</p>
    <p style={{color:accent||T.text.data,fontSize:17,fontWeight:700,letterSpacing:'-0.02em',margin:0,lineHeight:1.1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
      {value}{unit&&<span style={{color:T.text.faint,fontSize:12,fontWeight:500,marginLeft:4}}>{unit}</span>}
    </p>
  </div>
);

const Badge = ({label,color,bg}) => (
  <span style={{fontSize:11,fontWeight:700,color,background:bg,padding:'5px 10px',borderRadius:T.radius.pill,whiteSpace:'nowrap',letterSpacing:'0.04em'}}>{label}</span>
);

const SubTabs = ({tabs,active,setActive}) => (
  <nav aria-label="Sub Navigation" style={{display:'flex',background:T.bg.canvas,padding:'5px',borderRadius:T.radius.pill,gap:'3px'}} role="tablist">
    {tabs.map(tb=>(
      <button key={tb} onClick={()=>setActive(tb)} role="tab" aria-selected={active===tb}
        style={{flex:1,textAlign:'center',padding:'11px 6px',borderRadius:T.radius.pill,fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.2s',background:active===tb?T.bg.surfaceAlt:'transparent',color:active===tb?T.text.main:T.text.muted,boxShadow:active===tb?T.shadow.inner:'none',border:'none',textTransform:'capitalize'}}>
        {tb}
      </button>
    ))}
  </nav>
);

const PriorityBadge = ({p}) => {
  const m={critical:[T.accent.coral,'rgba(255,90,95,0.15)'],high:[T.accent.amber,'rgba(255,176,23,0.15)'],medium:[T.accent.cyan,'rgba(18,212,255,0.15)'],low:[T.text.muted,T.bg.surfaceAlt]};
  const[c,bg]=m[p]||m.low;
  return <Badge label={p.toUpperCase()} color={c} bg={bg}/>;
};

const StatusBadge = ({s}) => {
  const m={open:[T.accent.amber,'rgba(255,176,23,0.15)','OPEN'],wip:[T.accent.primary,'rgba(82,78,250,0.15)','WIP'],spare_req:[T.accent.cyan,'rgba(18,212,255,0.15)','SPARE REQ'],closed:[T.accent.green,'rgba(0,229,143,0.15)','CLOSED']};
  const[c,bg,l]=m[s]||m.open;
  return <Badge label={l} color={c} bg={bg}/>;
};

const PillButton = ({children,onClick,variant='primary',disabled=false}) => {
  const base={display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'8px',fontSize:'14px',fontWeight:600,border:'none',borderRadius:T.radius.pill,padding:'15px 28px',cursor:disabled?'not-allowed':'pointer',transition:'all 0.2s',width:'100%'};
  const vs={primary:{background:T.accent.primary,color:'#fff',boxShadow:'0 8px 20px rgba(82,78,250,0.3)'},secondary:{background:T.bg.surfaceAlt,color:T.text.main},danger:{background:T.accent.coral,color:'#fff',boxShadow:'0 8px 20px rgba(255,90,95,0.3)'},disabled:{background:T.bg.surfaceAlt,color:T.text.faint}};
  return <button onClick={disabled?undefined:onClick} style={{...base,...(disabled?vs.disabled:vs[variant])}}>{children}</button>;
};

const CiiDisclaimer = () => (
  <div style={{background:'rgba(255,176,23,0.08)',border:`1px solid rgba(255,176,23,0.3)`,borderRadius:T.radius.sm,padding:'12px 14px',display:'flex',gap:10,alignItems:'flex-start'}}>
    <Info size={14} color={T.accent.amber} style={{flexShrink:0,marginTop:1}}/>
    <p style={{fontSize:12,color:T.accent.amber,margin:0,lineHeight:1.5}}>CII and ETS figures are indicative estimates. Not for regulatory submission.</p>
  </div>
);

// ═══════════════════════════════════════════════════════
// MAP AUTO-FIT — recalculates size on mount
// ═══════════════════════════════════════════════════════
function MapInvalidator() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 120); }, [map]);
  return null;
}

// ═══════════════════════════════════════════════════════
// VESSEL MAP
// ═══════════════════════════════════════════════════════
const VesselMap = ({ vessel, destination }) => {
  const lat  = parseDeg(vessel.lat);
  const lon  = parseDeg(vessel.lon);
  const dest = PORT_COORDS[destination.id] || [0, 0];

  const shipIcon = L.divIcon({
    html: `<div style="width:14px;height:14px;background:#12D4FF;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px rgba(18,212,255,0.8)"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const portIcon = L.divIcon({
    html: `<div style="width:10px;height:10px;background:${destination.blocked?'#FF5A5F':'#00E58F'};border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.5)"></div>`,
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  return (
    <MapContainer
      center={[lat, lon]}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      attributionControl={false}
    >
      <MapInvalidator/>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
      <Marker position={[lat, lon]} icon={shipIcon}/>
      <Marker position={dest} icon={portIcon}/>
      <Polyline
        positions={[[lat, lon], dest]}
        pathOptions={{ color:'#524EFA', weight:2, dashArray:'6 4', opacity:0.75 }}
      />
    </MapContainer>
  );
};

// ═══════════════════════════════════════════════════════
// ONBOARDING — FIX: Position validation
// ═══════════════════════════════════════════════════════
const VesselSetup = ({onComplete}) => {
  const [v,setV] = useState(DEFAULT_VESSEL);
  const [err, setErr] = useState('');
  const inp = {background:T.bg.canvas,border:'2px solid transparent',borderRadius:T.radius.sm,padding:'14px 16px',color:T.text.main,fontSize:'14px',width:'100%',outline:'none'};
  
  const handleComplete = () => {
    if (!v.name.trim()) { setErr('Vessel name is required'); return; }
    if (!v.imo.trim())  { setErr('IMO is required'); return; }
    if (!isValidPosition(v.lat, v.lon)) { setErr('Position format: 24°32.1N 057°18.4E'); return; }
    onComplete(v);
  };

  return (
    <main style={{flex:1,overflowY:'auto',padding:'24px'}}>
      <header style={{marginBottom:28,animation:'fadeUp 0.5s ease-out both'}}>
        <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.03em',margin:'0 0 6px',color:T.accent.cyan}}>Vessel Setup</h1>
        <p style={{fontSize:14,color:T.text.muted,margin:0}}>Configure your vessel before entering.</p>
      </header>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {[{key:'name',label:'Vessel Name'},{key:'imo',label:'IMO Number'},{key:'callsign',label:'Call Sign'}].map(({key,label},i)=>(
          <div key={key} style={{animation:`fadeUp 0.5s ease-out ${i*0.1}s both`}}>
            <label style={{fontSize:12,fontWeight:600,color:T.text.muted,display:'block',margin:'0 0 7px'}}>{label}</label>
            <input value={v[key]} onChange={e=>{setV(p=>({...p,[key]:e.target.value}));setErr('');}} style={inp}/>
          </div>
        ))}
        <div style={{animation:'fadeUp 0.5s ease-out 0.3s both'}}>
          <label style={{fontSize:12,fontWeight:600,color:T.text.muted,display:'flex',alignItems:'center',gap:6,margin:'0 0 7px'}}><MapPin size={13}/>Initial Position (e.g., 24°32.1N 057°18.4E)</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <input value={v.lat} onChange={e=>{setV(p=>({...p,lat:e.target.value}));setErr('');}} placeholder="24°32.1N" style={inp}/>
            <input value={v.lon} onChange={e=>{setV(p=>({...p,lon:e.target.value}));setErr('');}} placeholder="057°18.4E" style={inp}/>
          </div>
        </div>
        {err&&<p style={{fontSize:12,color:T.accent.coral,margin:0}}>{err}</p>}
        <div style={{marginTop:8,animation:'fadeUp 0.5s ease-out 0.4s both'}}>
          <PillButton variant="primary" onClick={handleComplete}>Confirm & Enter App</PillButton>
        </div>
      </div>
    </main>
  );
};

const LoginScreen = ({onLogin, vesselName}) => {
  const [selected,setSelected] = useState(null);
  const roles = ROLES.map(r => r.sub === 'vessel' ? {...r, sub: vesselName} : r);
  return (
    <main style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'32px 24px'}}>
      <header style={{marginBottom:40,textAlign:'center',animation:'fadeUp 0.5s ease-out both'}}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1344 768" style={{width:'72%',maxWidth:280,height:'auto',margin:'0 auto 8px',display:'block'}}>
          <g>
            <path fill={T.accent.cyan} d="M741.43,510.92c6.03-.04,10.38-7.2,10.38-12.08v-13.43s-43.03-.37-43.03-.37c-15.15-.13-27.75-8.82-35.03-21.65-4.93-8.7-5.75-17.74-6.01-27.63-.36-14.22,3.4-27.74,13.94-37.74,7.39-6.05,16.65-11.03,26.68-11.04l59.07-.09-.39,113.96c-.05,13.05-11.79,25.93-24.38,26.02l-51.92.38-.16-14.78c1.47-.54,3.9-1.25,5.52-1.26l45.34-.31ZM707.18,469l44.65.39-.03-67.05c-15.72.43-31.01-.78-46.21.6-11.5,1.05-18.88,10.78-21.61,20.94-.78,8.89-.81,16.87.56,25.54,3.54,9.92,11.1,19.47,22.64,19.57Z"/>
            <path fill={T.accent.cyan} d="M998.15,469.46l58.78.42c.33,5.02.36,9.78.14,15.55l-60.29-.45c-18.14-.13-33.86-16.68-35.95-34.36-1.14-9.63-.68-18.57-.16-28.02,1.08-19.62,20.47-35.76,38.52-35.68l41.16.18c14.38.06,25.08,15.74,20.87,29.35-4.2,13.58-18.62,29.1-34.14,30.22l-19.06.32-31.94.49c1.28,11.19,9.85,21.89,22.06,21.98ZM1046.11,412.73c1.04-1.96.06-5.68-1.26-7.4-1.03-1.34-3.85-2.94-6.02-2.93l-40.41.25c-14.51.09-24.42,14.45-22.35,28.46l50.27-.07c8.62-.01,16.09-11.41,19.76-18.31Z"/>
            <path fill={T.accent.cyan} d="M659.46,436.07c0,28.06-22.75,50.81-50.81,50.81s-50.81-22.75-50.81-50.81,22.75-50.81,50.81-50.81,50.81,22.75,50.81,50.81ZM628.6,465.63c12.83-7.87,15.07-21.8,14.06-35.32-1.03-13.84-10.23-25.71-24.56-27.55-6.05-.78-12.77-.8-18.99-.1-10.69,1.21-19.34,9.18-22.59,19-2.51,7.6-2.64,14.9-1.59,22.64,1.32,9.74,6.58,18.08,15.51,22.58,8.36,4.22,28.51,4.65,38.16-1.27Z"/>
            <path fill={T.accent.cyan} d="M933.42,485.29l-.03-57.24c.25-14.23-10.62-25.65-24.93-25.67l-46.51-.05-.04,82.8c-5.43.27-10.02.28-15.42,0l-.05-98.32,66.47.25c8.07.03,15.22,3.57,21.13,8.19,9.52,7.96,14.76,18.77,14.85,31.23l.26,36.07.18,22.63-15.92.09Z"/>
            <path fill={T.accent.cyan} d="M558.54,469.87c.37,5.41.36,9.86-.04,15.43l-77.62-.17c-17.42-.04-30.28-14.6-30.3-31.75l-.08-99.85,16.05-.32.16,102.71c.01,7.12,6.3,13.66,13.53,13.69l78.29.27Z"/>
            <rect fill={T.accent.cyan} x="783.53" y="341.04" width="15.5" height="144.35"/>
            <rect fill={T.accent.cyan} x="814.62" y="386.95" width="15.54" height="98.46"/>
            <rect fill={T.accent.cyan} x="814.56" y="353.47" width="15.6" height="16.39" transform="translate(-.53 1.21) rotate(-.08)"/>
            <path fill={T.accent.cyan} d="M426.89,463.69c-47.59,0-96.58.09-144.92.09l-.1-12.99-.03-210.06c71.23,34.77,122.94,96.45,139.2,174.35,3.42,15.79,5.61,31.56,5.85,48.61Z"/>
            <rect fill={T.accent.cyan} x="281.84" y="474.66" width="145.15" height="11.34"/>
          </g>
        </svg>
        <p style={{fontSize:14,color:T.text.muted,margin:0}}>Select your operational role</p>
      </header>
      <nav style={{display:'flex',flexDirection:'column',gap:12,marginBottom:28}}>
        {roles.map((role,i)=>(
          <button key={role.id} onClick={()=>setSelected(role.id)} aria-pressed={selected===role.id} className="role-card"
            style={{background:selected===role.id?T.bg.surfaceAlt:T.bg.surface,border:`2px solid ${selected===role.id?role.color:'transparent'}`,borderRadius:T.radius.md,padding:'18px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',textAlign:'left',boxShadow:selected===role.id?T.shadow.soft:'none',animation:`fadeUp 0.5s ease-out ${0.1+(i*0.08)}s both`}}>
            <div style={{width:44,height:44,borderRadius:14,background:`${role.color}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {React.createElement(ROLE_ICON[role.id],{size:20,color:role.color,strokeWidth:1.75})}
            </div>
            <div style={{flex:1}}>
              <p style={{fontSize:15,fontWeight:700,color:T.text.vessel,margin:'0 0 3px'}}>{role.label}</p>
              <p style={{fontSize:12,color:T.text.muted,margin:0}}>{role.sub}{role.restricted?' · Limited access':''}</p>
            </div>
            {selected===role.id&&<div style={{width:22,height:22,borderRadius:'50%',background:role.color,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,animation:'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'}}><Check size={13} color="#fff"/></div>}
          </button>
        ))}
      </nav>
      <div style={{animation:'fadeUp 0.5s ease-out 0.5s both'}}>
        <PillButton variant={selected?'primary':'disabled'} onClick={()=>selected&&onLogin(roles.find(r=>r.id===selected))} disabled={!selected}>
          {selected?`Enter as ${roles.find(r=>r.id===selected)?.label}`:'Select a role'}
        </PillButton>
      </div>
    </main>
  );
};

// ═══════════════════════════════════════════════════════
// BIOMETRIC MODAL
// ═══════════════════════════════════════════════════════
const BiometricModal = ({title,onSuccess,onCancel}) => {
  const [phase,setPhase] = useState('prompt');
  const mountedRef = useRef(true);
  const t1Ref = useRef(null);
  const t2Ref = useRef(null);

  useEffect(()=>{
    return () => {
      mountedRef.current = false;
      clearTimeout(t1Ref.current);
      clearTimeout(t2Ref.current);
    };
  },[]);

  const scan = () => {
    setPhase('scanning');
    t1Ref.current = setTimeout(()=>{ if(mountedRef.current) setPhase('success'); }, 1800);
    t2Ref.current = setTimeout(()=>{ if(mountedRef.current) onSuccess(); }, 2600);
  };

  return (
    <div role="dialog" aria-modal="true" style={{position:'absolute',inset:0,zIndex:200,display:'flex',alignItems:'flex-end',animation:'backdropIn 0.3s ease-out forwards'}}>
      <div style={{width:'100%',background:T.bg.surface,borderRadius:'32px 32px 0 0',padding:'32px 24px 40px',animation:'slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'}}>
        <header style={{textAlign:'center',marginBottom:24}}>
          <p style={{fontSize:11,fontWeight:700,color:T.text.muted,textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 6px'}}>Identity Sign-Off</p>
          <h2 style={{fontSize:19,fontWeight:700,margin:0}}>{title}</h2>
        </header>
        <div style={{display:'flex',justifyContent:'center',marginBottom:28}}>
          <div style={{width:88,height:88,borderRadius:28,background:T.bg.canvas,border:`2px solid ${phase==='success'?T.accent.green:phase==='scanning'?T.accent.primary:'transparent'}`,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',transition:'all 0.4s'}}>
            {phase==='success'?<CheckCircle2 size={38} color={T.accent.green} style={{animation:'scaleIn 0.3s'}}/>:<Eye size={34} color={phase==='scanning'?T.accent.primary:T.text.muted}/>}
            {phase==='scanning'&&<div style={{position:'absolute',inset:-4,borderRadius:32,border:'2px solid transparent',borderTop:`2px solid ${T.accent.primary}`,animation:'spin 1s linear infinite'}}/>}
          </div>
        </div>
        {phase==='scanning'&&<div className="shimmer-box" style={{height:12,width:140,borderRadius:T.radius.pill,margin:'0 auto 28px'}}/>}
        <p style={{textAlign:'center',fontSize:13,fontWeight:500,color:phase==='success'?T.accent.green:phase==='scanning'?T.accent.primary:T.text.muted,marginBottom:28,transition:'color 0.3s'}}>
          {phase==='prompt'?'Use Face ID to authenticate':phase==='scanning'?'Verifying identity…':'Signed · Saved locally · Pending fleet sync'}
        </p>
        {phase==='prompt'&&(
          <div style={{display:'flex',gap:12}}>
            <button onClick={onCancel} style={{flex:1,background:T.bg.surfaceAlt,border:'none',borderRadius:T.radius.pill,padding:'15px',color:T.text.main,fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
            <button onClick={scan} style={{flex:2,background:T.text.main,border:'none',borderRadius:T.radius.pill,padding:'15px',color:T.bg.canvas,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <Lock size={15}/> Sign Record
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// DECK LOG MODAL
// ═══════════════════════════════════════════════════════
const DeckLogModal = ({onSave,onCancel}) => {
  const {currentUser,vessel} = useApp();
  const [text,setText]         = useState('');
  const [listening,setListening] = useState(false);
  const [hasSR,setHasSR]       = useState(false);
  const recognitionRef         = useRef(null);
  const mountedRef             = useRef(true);

  useEffect(()=>{
    setHasSR(!!(window.SpeechRecognition||window.webkitSpeechRecognition));
    return ()=>{ mountedRef.current=false; recognitionRef.current?.stop(); };
  },[]);

  const toggleSpeech = () => {
    if(listening){ recognitionRef.current?.stop(); return; }
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR) return;
    const r = new SR();
    r.continuous = true; r.interimResults = false; r.lang='en-US';
    r.onstart  = ()=>{ if(mountedRef.current) setListening(true); };
    r.onresult = e=>{ if(!mountedRef.current) return; const t=Array.from(e.results).map(r=>r[0].transcript).join(' '); setText(prev=>prev?prev+' '+t:t); };
    r.onerror  = ()=>{ if(mountedRef.current) setListening(false); };
    r.onend    = ()=>{ if(mountedRef.current) setListening(false); };
    recognitionRef.current = r;
    r.start();
  };

  const save = () => {
    if(!text.trim()) return;
    recognitionRef.current?.stop();
    onSave({ text:text.trim(), timestamp:utcNow(), author:currentUser?.label||'Officer', vessel:vessel?.name });
  };

  return (
    <div role="dialog" aria-modal="true" style={{position:'absolute',inset:0,zIndex:200,display:'flex',alignItems:'flex-end',animation:'backdropIn 0.3s ease-out forwards'}}>
      <div style={{width:'100%',background:T.bg.surface,borderRadius:'32px 32px 0 0',padding:'28px 24px 40px',animation:'slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',maxHeight:'85vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,margin:'0 0 3px'}}>Deck Log Entry</h2>
            <p style={{fontSize:11,fontFamily:'monospace',color:T.text.muted,margin:0}}>{utcFull(utcNow())} · {currentUser?.label||'Officer'}</p>
          </div>
          {hasSR&&(
            <button onClick={toggleSpeech} aria-label={listening?'Stop dictation':'Start dictation'}
              style={{width:46,height:46,borderRadius:T.radius.pill,background:listening?T.accent.primary:T.bg.surfaceAlt,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.2s'}}>
              <Mic size={19} color={listening?'#fff':T.text.muted} style={{animation:listening?'pulse 1s infinite':'none'}}/>
            </button>
          )}
        </div>
        {listening&&(
          <div style={{background:T.accent.soft,borderRadius:T.radius.sm,padding:'9px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:T.accent.primary,animation:'pulse 1s infinite'}}/>
            <span style={{fontSize:12,color:T.accent.primary,fontWeight:600}}>Listening — speak your entry…</span>
          </div>
        )}
        <textarea
          value={text}
          onChange={e=>setText(e.target.value)}
          placeholder="Type or dictate your deck log entry…"
          rows={5}
          autoFocus
          style={{width:'100%',background:T.bg.canvas,border:'none',borderRadius:T.radius.sm,padding:'14px',color:T.text.main,fontSize:13,resize:'none',fontFamily:'inherit',lineHeight:1.6}}
        />
        {!hasSR&&(
          <p style={{fontSize:11,color:T.text.faint,margin:'8px 0 0',lineHeight:1.5}}>Speech recognition not available in this browser. Type your entry above.</p>
        )}
        <div style={{display:'flex',gap:12,marginTop:20}}>
          <button onClick={onCancel} style={{flex:1,background:T.bg.surfaceAlt,border:'none',borderRadius:T.radius.pill,padding:'15px',color:T.text.main,fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
          <button onClick={save} disabled={!text.trim()}
            style={{flex:2,background:text.trim()?T.accent.primary:T.bg.surfaceAlt,border:'none',borderRadius:T.radius.pill,padding:'15px',color:text.trim()?'#fff':T.text.faint,fontSize:14,fontWeight:700,cursor:text.trim()?'pointer':'not-allowed',transition:'all 0.2s'}}>
            Save Entry
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// REROUTE MODAL — 3-STEP SAFETY GATE
// ═══════════════════════════════════════════════════════
const RerouteModal = ({fromPort,toPort,onConfirm,onCancel}) => {
  const {currentUser,vessel} = useApp();
  const [step,setStep]     = useState(1);
  const [checks,setChecks] = useState([false,false,false]);
  const allChecked = checks.every(Boolean);
  const timestamp  = utcFull(utcNow());
  const toggleCheck = i => setChecks(c=>c.map((v,idx)=>idx===i?!v:v));

  const stepBar = (
    <div style={{display:'flex',gap:6,marginBottom:24}}>
      {[1,2,3].map(s=>(
        <div key={s} style={{flex:1,height:3,borderRadius:2,background:s<=step?T.accent.primary:T.bg.canvas,transition:'background 0.3s'}}/>
      ))}
    </div>
  );

  return (
    <div role="dialog" aria-modal="true" style={{position:'absolute',inset:0,zIndex:200,display:'flex',alignItems:'flex-end',animation:'backdropIn 0.3s ease-out forwards'}}>
      <div style={{width:'100%',background:T.bg.surface,borderRadius:'32px 32px 0 0',padding:'28px 24px 40px',animation:'slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',maxHeight:'88vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
          <AlertOctagon size={16} color={T.accent.coral}/>
          <span style={{fontSize:11,fontWeight:700,color:T.accent.coral,textTransform:'uppercase',letterSpacing:'0.1em'}}>Diversion Order</span>
          <span style={{marginLeft:'auto',fontSize:11,color:T.text.muted}}>Step {step} of 3</span>
        </div>
        <h2 style={{fontSize:19,fontWeight:700,margin:'0 0 3px',color:T.text.vessel}}>{fromPort.name} → {toPort.name}</h2>
        <p style={{fontSize:13,color:T.text.muted,margin:'0 0 20px'}}>All steps required before order is issued</p>
        <div style={{background:T.bg.canvas,borderRadius:T.radius.md,padding:'16px 18px',marginBottom:20}}>
          <p style={{fontSize:11,fontWeight:700,color:T.text.muted,textTransform:'uppercase',letterSpacing:'0.04em',margin:'0 0 12px'}}>Route Change</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center'}}>
            <div>
              <p style={{fontSize:10,color:T.text.faint,margin:'0 0 2px',textTransform:'uppercase'}}>From</p>
              <p style={{fontSize:14,fontWeight:700,color:T.accent.coral,margin:0}}>{fromPort.name}</p>
              <p style={{fontSize:11,fontFamily:'monospace',color:T.text.muted,margin:'2px 0 0'}}>{fromPort.id}</p>
            </div>
            <Navigation size={16} color={T.text.faint}/>
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:10,color:T.text.faint,margin:'0 0 2px',textTransform:'uppercase'}}>To</p>
              <p style={{fontSize:14,fontWeight:700,color:T.accent.green,margin:0}}>{toPort.name}</p>
              <p style={{fontSize:11,fontFamily:'monospace',color:T.text.muted,margin:'2px 0 0'}}>{toPort.id}</p>
            </div>
          </div>
        </div>
        {stepBar}

        {step===1&&(
          <div style={{animation:'fadeUp 0.3s ease-out'}}>
            <p style={{fontSize:13,fontWeight:700,color:T.text.vessel,margin:'0 0 14px'}}>Safety confirmation</p>
            {REROUTE_CHECKS.map((text,i)=>(
              <button key={i} onClick={()=>toggleCheck(i)} style={{width:'100%',background:checks[i]?T.accent.soft:T.bg.canvas,border:`1px solid ${checks[i]?T.accent.primary:T.bg.surfaceAlt}`,borderRadius:T.radius.md,padding:'14px',marginBottom:10,display:'flex',gap:12,alignItems:'flex-start',cursor:'pointer',textAlign:'left',transition:'all 0.2s'}}>
                <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${checks[i]?T.accent.primary:T.text.faint}`,background:checks[i]?T.accent.primary:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s',marginTop:1}}>
                  {checks[i]&&<Check size={12} color="#fff" style={{animation:'scaleIn 0.2s'}}/>}
                </div>
                <span style={{fontSize:13,color:T.text.main,lineHeight:1.5}}>{text}</span>
              </button>
            ))}
            <div style={{display:'flex',gap:12,marginTop:8}}>
              <button onClick={onCancel} style={{flex:1,background:T.bg.surfaceAlt,border:'none',borderRadius:T.radius.pill,padding:'15px',color:T.text.main,fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
              <button onClick={()=>setStep(2)} disabled={!allChecked} style={{flex:2,background:allChecked?T.accent.primary:T.bg.surfaceAlt,border:'none',borderRadius:T.radius.pill,padding:'15px',color:allChecked?'#fff':T.text.faint,fontSize:14,fontWeight:700,cursor:allChecked?'pointer':'not-allowed',transition:'all 0.2s'}}>
                Review Log Entry →
              </button>
            </div>
          </div>
        )}

        {step===2&&(
          <div style={{animation:'fadeUp 0.3s ease-out'}}>
            <p style={{fontSize:13,fontWeight:700,color:T.text.vessel,margin:'0 0 14px'}}>Deck log entry preview</p>
            <div style={{background:T.bg.canvas,borderRadius:T.radius.md,padding:'18px',fontFamily:'monospace',fontSize:12,color:T.text.muted,lineHeight:1.9,marginBottom:22}}>
              <div style={{color:T.text.main,fontWeight:700,marginBottom:6}}>DIVERSION ORDER</div>
              <div>Timestamp  {timestamp}</div>
              <div>From Port  {fromPort.name} ({fromPort.id})</div>
              <div>To Port    {toPort.name} ({toPort.id})</div>
              <div>Reason     {fromPort.blocked?`Route blocked — ${fromPort.alert||'security'}`:'HRA — rerouted by Master'}</div>
              <div>Auth By    {currentUser?.label||'Master'}</div>
              <div>Vessel     {vessel?.name} ({vessel?.imo})</div>
              <div style={{marginTop:6,color:T.accent.amber}}>Status     PENDING SIGN-OFF</div>
            </div>
            <div style={{display:'flex',gap:12}}>
              <button onClick={()=>setStep(1)} style={{flex:1,background:T.bg.surfaceAlt,border:'none',borderRadius:T.radius.pill,padding:'15px',color:T.text.main,fontSize:14,fontWeight:600,cursor:'pointer'}}>← Back</button>
              <button onClick={()=>setStep(3)} style={{flex:2,background:T.accent.primary,border:'none',borderRadius:T.radius.pill,padding:'15px',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Confirm Order →</button>
            </div>
          </div>
        )}

        {step===3&&(
          <div style={{animation:'fadeUp 0.3s ease-out'}}>
            <div style={{background:'rgba(255,90,95,0.08)',border:`1px solid ${T.accent.coral}`,borderRadius:T.radius.md,padding:'18px',marginBottom:22}}>
              <p style={{fontSize:13,fontWeight:700,color:T.accent.coral,margin:'0 0 8px'}}>⚠ Final Confirmation</p>
              <p style={{fontSize:13,color:T.text.muted,margin:0,lineHeight:1.6}}>
                This will issue a formal diversion order, update destination to <strong style={{color:T.text.main}}>{toPort.name}</strong>, and create a deck log entry timestamped <strong style={{color:T.text.main}}>{timestamp}</strong>. This action cannot be undone.
              </p>
            </div>
            <div style={{display:'flex',gap:12}}>
              <button onClick={()=>setStep(2)} style={{flex:1,background:T.bg.surfaceAlt,border:'none',borderRadius:T.radius.pill,padding:'15px',color:T.text.main,fontSize:14,fontWeight:600,cursor:'pointer'}}>← Back</button>
              <button onClick={onConfirm} style={{flex:2,background:T.accent.coral,border:'none',borderRadius:T.radius.pill,padding:'15px',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',boxShadow:'0 8px 20px rgba(255,90,95,0.3)'}}>
                Issue Diversion Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// STATUS BAR
// ═══════════════════════════════════════════════════════
const MobileStatusBar = ({onLogout,onToggleNvg,nvgMode,scrolled}) => {
  const {activePort} = useApp();
  const isHRA = hraActive(activePort);
  const [time,setTime] = useState(utcTime());
  useEffect(()=>{ const id=setInterval(()=>setTime(utcTime()),1000); return()=>clearInterval(id); },[]);

  return (
    <header style={{background:'rgba(26,27,34,0.85)',backdropFilter:'blur(12px)',padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,zIndex:50,borderBottom:`1px solid ${T.bg.surfaceAlt}`,boxShadow:scrolled?'0 8px 32px rgba(0,0,0,0.5)':'none',transition:'box-shadow 0.3s ease-out'}}>
      <span style={{fontFamily:'monospace',color:T.text.data,fontSize:14,fontWeight:700}}>{time}</span>
      <div style={{display:'flex',alignItems:'center',gap:6,background:isHRA?'rgba(255,90,95,0.15)':'rgba(0,229,143,0.15)',borderRadius:T.radius.pill,padding:'5px 11px',transition:'all 0.5s'}}>
        <div style={{width:7,height:7,borderRadius:'50%',background:isHRA?T.accent.coral:T.accent.green,animation:isHRA?'pulse 1.5s infinite':'none'}}/>
        <span style={{fontSize:10,fontWeight:700,color:isHRA?T.accent.coral:T.accent.green,letterSpacing:'0.05em'}}>{isHRA?(activePort?.blocked?'BLOCKED':'HRA'):'CLEAR'}</span>
      </div>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <button onClick={onToggleNvg} aria-label={nvgMode?'Disable NVG':'Enable NVG'} style={{background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',padding:2}}>
          {nvgMode?<Sun size={15} color={T.accent.amber}/>:<Moon size={15} color={T.text.muted}/>}
        </button>
        <div style={{display:'flex',gap:5,color:T.text.muted}}><Signal size={13}/><Wifi size={13}/><Battery size={15}/></div>
        <button onClick={onLogout} aria-label="Log Out" style={{background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center'}}>
          <LogOut size={14} color={T.text.muted}/>
        </button>
      </div>
    </header>
  );
};

// ═══════════════════════════════════════════════════════
// BOTTOM BARS
// ═══════════════════════════════════════════════════════
const ShoreBottomBar = ({activeTab,setActiveTab}) => {
  const tabs=[{id:'market',label:'Market',icon:TrendingUp},{id:'fleet',label:'Fleet',icon:Ship},{id:'carbon',label:'Carbon',icon:Leaf}];
  return (
    <nav aria-label="Main Navigation" style={{background:'rgba(36,38,48,0.92)',backdropFilter:'blur(20px)',padding:'14px 20px 30px',display:'flex',justifyContent:'space-around',borderRadius:'28px 28px 0 0',boxShadow:T.shadow.bottomNav,flexShrink:0,zIndex:50}}>
      {tabs.map(({id,label,icon:Icon})=>(
        <button key={id} onClick={()=>setActiveTab(id)} role="tab" aria-selected={activeTab===id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,color:activeTab===id?T.accent.primary:T.text.faint,background:'none',border:'none',cursor:'pointer'}}>
          <div key={activeTab===id?'active':'inactive'} style={{width:44,height:30,borderRadius:14,background:activeTab===id?T.accent.soft:'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.25s',animation:activeTab===id?'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)':'none'}}>
            <Icon size={19}/>
          </div>
          <span style={{fontSize:10,fontWeight:600}}>{label}</span>
        </button>
      ))}
    </nav>
  );
};

const ShipBottomBar = ({activeTab,setActiveTab,defects,pscItems,currentUser}) => {
  const restricted = currentUser?.restricted;
  const critCount  = defects.filter(d=>d.priority==='critical'&&d.status!=='closed').length;
  const pscFail    = pscItems.filter(x=>!x.done).length;
  const allTabs=[
    {id:'bridge',label:'Bridge',icon:Navigation},
    {id:'engine',label:'Engine',icon:Settings},
    {id:'crew',  label:'Crew',  icon:Users},
    {id:'maint', label:'Maint', icon:Wrench,badge:critCount||null},
    {id:'ops',   label:'Ops',   icon:ClipboardList,badge:pscFail||null},
  ];
  const tabs = restricted ? allTabs.filter(t=>t.id==='bridge'||t.id==='crew') : allTabs;
  return (
    <nav aria-label="Main Navigation" style={{background:'rgba(36,38,48,0.92)',backdropFilter:'blur(20px)',padding:'14px 20px 30px',display:'flex',justifyContent:'space-around',borderRadius:'28px 28px 0 0',boxShadow:T.shadow.bottomNav,flexShrink:0,zIndex:50}}>
      {tabs.map(({id,label,icon:Icon,badge})=>(
        <button key={id} onClick={()=>setActiveTab(id)} role="tab" aria-selected={activeTab===id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,color:activeTab===id?T.accent.primary:T.text.faint,background:'none',border:'none',cursor:'pointer',position:'relative'}}>
          <div key={activeTab===id?'active':'inactive'} style={{width:44,height:30,borderRadius:14,background:activeTab===id?T.accent.soft:'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.25s',animation:activeTab===id?'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)':'none'}}>
            <Icon size={19}/>
          </div>
          <span style={{fontSize:10,fontWeight:600}}>{label}</span>
          {badge&&<div style={{position:'absolute',top:-2,right:2,width:17,height:17,borderRadius:'50%',background:T.accent.coral,display:'flex',alignItems:'center',justifyContent:'center',border:`2px solid ${T.bg.canvas}`}}><span style={{fontSize:9,color:'#fff',fontWeight:800}}>{badge}</span></div>}
        </button>
      ))}
    </nav>
  );
};

// ═══════════════════════════════════════════════════════
// BRIDGE — FIX: Position editing
// ═══════════════════════════════════════════════════════
function BridgeViewWrapper() {
  const {activePort,setActivePort,vessel,setVessel,bridgeSub,setBridgeSub,deckLog,setDeckLog,scrollH} = useApp();
  const [isSearch,    setIsSearch]    = useState(false);
  const [query,       setQuery]       = useState('');
  const [showReroute, setShowReroute] = useState(false);
  const [rerouteDest, setRerouteDest] = useState(null);
  const [showLogModal,setShowLogModal]= useState(false);
  const [editPos,     setEditPos]     = useState(false);
  const [posErr,      setPosErr]      = useState('');
  const [tempLat,     setTempLat]     = useState(vessel.lat);
  const [tempLon,     setTempLon]     = useState(vessel.lon);
  const [liveWx,      setLiveWx]      = useState(null);
  const [wxLoading,   setWxLoading]   = useState(false);

  useEffect(() => {
    if (bridgeSub !== 'weather') return;
    const lat = parseDeg(vessel.lat);
    const lon = parseDeg(vessel.lon);
    if (!lat && !lon) return;
    setWxLoading(true);
    Promise.all([
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,swell_wave_height,sea_surface_temperature`).then(r=>r.json()),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m,surface_pressure,visibility&wind_speed_unit=kn`).then(r=>r.json()),
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`).then(r=>r.json()).catch(()=>null),
    ]).then(([marine, atmo, geo]) => {
      setLiveWx({
        wave:      marine.current?.wave_height,
        swell:     marine.current?.swell_wave_height,
        seaTemp:   marine.current?.sea_surface_temperature,
        windSpeed: atmo.current?.wind_speed_10m,
        windDir:   atmo.current?.wind_direction_10m,
        baro:      atmo.current?.surface_pressure,
        vis:       atmo.current?.visibility != null ? (atmo.current.visibility / 1000).toFixed(1) : null,
        place:     geo?.locality || geo?.city || geo?.principalSubdivision || geo?.countryName || null,
      });
      setWxLoading(false);
    }).catch(() => setWxLoading(false));
  }, [bridgeSub, vessel.lat, vessel.lon]);

  const filtered = GLOBAL_PORTS.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())||p.id.toLowerCase().includes(query.toLowerCase())||p.country.toLowerCase().includes(query.toLowerCase()));

  const triggerReroute = dest => { setRerouteDest(dest); setShowReroute(true); };
  const confirmReroute = ()   => { setActivePort(rerouteDest); setShowReroute(false); setRerouteDest(null); };

  const saveLogEntry = entry => {
    setDeckLog(l=>[entry,...l]);
    setShowLogModal(false);
  };

  const savePosition = () => {
    if (!isValidPosition(tempLat, tempLon)) { setPosErr('Format: 24°32.1N 057°18.4E'); return; }
    setVessel(v=>({...v, lat: tempLat, lon: tempLon}));
    setEditPos(false);
    setPosErr('');
  };

  return (
    <main aria-label="Bridge" style={{display:'flex',flexDirection:'column',flex:1,gap:22,padding:'22px',position:'relative'}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.03em',color:T.accent.cyan,margin:0}}>{vessel.name}</h1>
          <p style={{fontSize:12,color:T.text.muted,fontWeight:500,margin:'3px 0 0'}}>{vessel.imo} · {vessel.flag}</p>
        </div>
      </header>

      <SubTabs tabs={['passage','weather','log']} active={bridgeSub} setActive={setBridgeSub}/>

      {bridgeSub==='passage'&&<>
        <div style={{height:180,borderRadius:T.radius.lg,overflow:'hidden',border:`1px solid ${T.bg.surfaceAlt}`}}>
          <VesselMap vessel={vessel} destination={activePort}/>
        </div>

        {editPos?(
          <Card className="hover-card" style={{border:`1px solid ${T.accent.primary}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <p style={{fontSize:13,fontWeight:700,color:T.text.vessel,margin:0}}>Edit Position</p>
              <button onClick={()=>{setEditPos(false);setPosErr('');}}>
                <X size={16} color={T.text.muted}/>
              </button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:T.text.muted,display:'block',marginBottom:5}}>Latitude</label>
                <input value={tempLat} onChange={e=>setTempLat(e.target.value)} placeholder="24°32.1N" style={{background:T.bg.canvas,border:'none',borderRadius:T.radius.sm,padding:'11px',color:T.text.main,fontSize:13,width:'100%'}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:T.text.muted,display:'block',marginBottom:5}}>Longitude</label>
                <input value={tempLon} onChange={e=>setTempLon(e.target.value)} placeholder="057°18.4E" style={{background:T.bg.canvas,border:'none',borderRadius:T.radius.sm,padding:'11px',color:T.text.main,fontSize:13,width:'100%'}}/>
              </div>
            </div>
            {posErr&&<p style={{fontSize:12,color:T.accent.coral,margin:'0 0 10px'}}>{posErr}</p>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setEditPos(false);setPosErr('');}} style={{flex:1,background:T.bg.canvas,border:'none',borderRadius:T.radius.pill,padding:'10px',color:T.text.muted,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
              <button onClick={savePosition} style={{flex:1,background:T.accent.primary,border:'none',borderRadius:T.radius.pill,padding:'10px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save Position</button>
            </div>
          </Card>
        ):(
          <Card className="hover-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <CardHeader icon={MapPin} title="Current Position"/>
              <button onClick={()=>{setTempLat(vessel.lat);setTempLon(vessel.lon);setEditPos(true);}} style={{background:T.bg.canvas,border:'none',borderRadius:T.radius.pill,padding:'6px 12px',display:'flex',alignItems:'center',gap:6,cursor:'pointer',color:T.text.muted,fontSize:11,fontWeight:600}}>
                <Edit3 size={13}/> Edit
              </button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Stat label="Latitude"  value={vessel.lat}/>
              <Stat label="Longitude" value={vessel.lon}/>
            </div>
          </Card>
        )}

        <Card className="hover-card" style={{background:activePort.blocked?'rgba(255,90,95,0.08)':T.bg.surface,border:activePort.blocked?`2px solid ${T.accent.coral}`:'none',padding:0,overflow:'hidden'}}>
          {activePort.blocked&&(
            <div style={{background:T.accent.coral,padding:'10px 20px',display:'flex',justifyContent:'center',alignItems:'center',gap:8}}>
              <AlertOctagon size={15} color="#fff"/>
              <span style={{fontSize:12,fontWeight:700,color:'#fff',letterSpacing:'0.06em'}}>PASSAGE DENIED</span>
            </div>
          )}
          <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <p style={{fontSize:11,fontWeight:600,color:T.text.muted,textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 3px'}}>Destination</p>
                <p style={{fontSize:22,fontWeight:700,color:activePort.blocked?T.accent.coral:T.text.main,margin:0}}>{activePort.name}</p>
                <p style={{fontSize:13,color:T.text.muted,margin:'2px 0 0'}}>{activePort.country}</p>
              </div>
              <button onClick={()=>setIsSearch(true)} style={{width:44,height:44,borderRadius:T.radius.pill,background:T.bg.surfaceAlt,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                <Search size={18} color={T.text.main}/>
              </button>
            </div>
            {activePort.blocked?(
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <p style={{fontSize:13,color:T.text.muted,lineHeight:1.55,margin:0}}>Strait of Hormuz suspended. Issue formal diversion order before proceeding. All parties must be notified.</p>
                <PillButton variant="danger" onClick={()=>triggerReroute(GLOBAL_PORTS.find(p=>p.id==='SAJED'))}>Issue Diversion → Jeddah</PillButton>
              </div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <Stat label="ETA (UTC)"  value={getETA(activePort.etaDays)} unit="08:00Z"/>
                <Stat label="Dist to Go" value={fmt(activePort.dist)} unit="NM"/>
                <Stat label="SOG"        value="13.4" unit="kts" accent={T.accent.green}/>
                <Stat label="COG"        value="312°"/>
              </div>
            )}
          </div>
        </Card>

        <button onClick={()=>{ setBridgeSub('log'); setShowLogModal(true); }}
          style={{background:T.bg.surface,border:'none',borderRadius:T.radius.lg,padding:'18px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',boxShadow:T.shadow.soft}}>
          <div style={{width:52,height:52,borderRadius:T.radius.pill,background:T.bg.canvas,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <FileText size={22} color={T.text.main}/>
          </div>
          <div style={{textAlign:'left'}}>
            <p style={{color:T.text.main,fontWeight:700,fontSize:15,margin:0}}>Deck Log Entry</p>
            <p style={{color:T.text.muted,fontSize:12,fontWeight:500,margin:'3px 0 0'}}>
              {deckLog.length > 0 ? `${deckLog.length} entr${deckLog.length===1?'y':'ies'} today` : 'Type or dictate a new entry'}
            </p>
          </div>
        </button>
      </>}

      {bridgeSub==='weather'&&(
        <div style={{display:'flex',flexDirection:'column',gap:18}}>
          {wxLoading&&(
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0'}}>
              <Loader size={14} color={T.accent.primary} style={{animation:'spin 1s linear infinite'}}/>
              <span style={{fontSize:12,color:T.text.muted}}>Fetching live conditions…</span>
            </div>
          )}
          <Card className="hover-card">
            <CardHeader icon={Wind} title={`Environment · ${liveWx?.place || `${vessel.lat} ${vessel.lon}`}${liveWx?' · Live':''}`}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Stat label="Wind"
                    value={liveWx?.windSpeed!=null ? `${degToCompass(liveWx.windDir)} ${Math.round(liveWx.windSpeed)}` : activePort.wind}
                    unit={liveWx?.windSpeed!=null ? 'kt' : undefined}/>
              <Stat label="Sea Ht"
                    value={liveWx?.wave!=null ? liveWx.wave.toFixed(1) : '1.4'} unit="m"/>
              <Stat label="Swell"
                    value={liveWx?.swell!=null ? liveWx.swell.toFixed(1) : activePort.swell} unit="m"/>
              <Stat label="Vis."
                    value={liveWx?.vis!=null ? liveWx.vis : '8'} unit="NM"/>
              <Stat label="Sea Temp"
                    value={liveWx?.seaTemp!=null ? liveWx.seaTemp.toFixed(1) : '31'} unit="°C"/>
              <Stat label="Baro"
                    value={liveWx?.baro!=null ? Math.round(liveWx.baro) : '1014'} unit="hPa"/>
            </div>
          </Card>
          <Card className="hover-card">
            <CardHeader icon={Target} title="Vessel Dynamics"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Stat label="SOG"       value="13.4" unit="kts" accent={T.accent.green}/>
              <Stat label="STW"       value="13.1" unit="kts"/>
              <Stat label="Fwd Draft" value="13.42" unit="m"/>
              <Stat label="Aft Draft" value="13.78" unit="m"/>
              <Stat label="GM (Calc)" value="1.84" unit="m" accent={T.accent.green}/>
              <Stat label="Trim"      value="0.36 A"/>
            </div>
          </Card>
        </div>
      )}

      {bridgeSub==='log'&&(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <p style={{fontSize:13,color:T.text.muted,margin:0}}>{deckLog.length} {deckLog.length===1?'entry':'entries'}</p>
            <button onClick={()=>setShowLogModal(true)}
              style={{background:T.accent.soft,border:'none',borderRadius:T.radius.pill,padding:'9px 15px',display:'flex',alignItems:'center',gap:6,cursor:'pointer',color:T.accent.primary,fontSize:13,fontWeight:700}}>
              <PlusCircle size={15}/> New Entry
            </button>
          </div>
          {deckLog.length===0?(
            <Card style={{textAlign:'center',padding:'40px 20px'}}>
              <FileText size={34} color={T.text.faint} style={{margin:'0 auto 10px'}}/>
              <p style={{fontSize:14,fontWeight:600,color:T.text.muted,margin:'0 0 4px'}}>No log entries</p>
              <p style={{fontSize:12,color:T.text.faint,margin:0}}>Tap "New Entry" to record your first entry</p>
            </Card>
          ):deckLog.map((entry,i)=>(
            <Card key={i} className="hover-card" style={{animation:`fadeUp 0.4s ease-out ${i*0.04}s both`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                <p style={{fontSize:11,fontFamily:'monospace',color:T.text.muted,margin:0}}>{utcFull(entry.timestamp)}</p>
                <Badge label={entry.author} color={T.text.muted} bg={T.bg.surfaceAlt}/>
              </div>
              <p style={{fontSize:13,color:T.text.vessel,lineHeight:1.6,margin:0}}>{entry.text}</p>
            </Card>
          ))}
        </div>
      )}

      {isSearch&&(
        <div role="dialog" aria-modal="true" aria-label="Search Ports" style={{position:'absolute',inset:0,zIndex:100,background:T.bg.canvas,display:'flex',flexDirection:'column',transformOrigin:'bottom center',animation:'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'}}>
          <div style={{padding:'20px',display:'flex',alignItems:'center',gap:14,background:T.bg.surface,flexShrink:0}}>
            <Search size={18} color={T.text.muted}/>
            <input autoFocus type="search" placeholder="Search port…" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search query" style={{flex:1,background:'transparent',color:T.text.main,outline:'none',fontSize:16,border:'none'}}/>
            <button onClick={()=>{setIsSearch(false);setQuery('');}} style={{background:T.bg.surfaceAlt,border:'none',borderRadius:T.radius.pill,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><X size={18} color={T.text.main}/></button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'10px 20px'}}>
            {filtered.map((port,i)=>(
              <button key={port.id} onClick={()=>{
                if(port.blocked){triggerReroute(port);}
                else{setActivePort(port);}
                setIsSearch(false);setQuery('');
              }} className="hover-card" style={{width:'100%',background:T.bg.surface,borderRadius:T.radius.md,padding:'18px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',textAlign:'left',border:'1px solid transparent',animation:`fadeUp 0.3s ease-out ${i*0.05}s both`}}>
                <div>
                  <p style={{color:port.blocked?T.accent.coral:T.text.main,fontWeight:700,fontSize:15,margin:0}}>{port.name}</p>
                  <p style={{color:T.text.muted,fontSize:12,margin:'3px 0 0'}}>{port.country} · {fmt(port.dist)} NM</p>
                </div>
                {port.blocked&&<PriorityBadge p="critical"/>}
                {port.hra&&!port.blocked&&<Badge label="HRA" color={T.accent.amber} bg="rgba(255,176,23,0.15)"/>}
              </button>
            ))}
          </div>
        </div>
      )}

      {showReroute&&rerouteDest&&(
        <RerouteModal fromPort={activePort} toPort={rerouteDest} onConfirm={confirmReroute} onCancel={()=>{setShowReroute(false);setRerouteDest(null);}}/>
      )}
      {showLogModal&&(
        <DeckLogModal onSave={saveLogEntry} onCancel={()=>setShowLogModal(false)}/>
      )}
    </main>
  );
}

// ── ENGINE ───────────────────────────────────────────────
const EngineView = () => {
  const {scrollH} = useApp();
  const [engSub,setEngSub] = useState('plant');
  return (
    <main aria-label="Engine" style={{display:'flex',flexDirection:'column',flex:1,gap:22,padding:'22px'}}>
      <header>
        <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.03em',margin:'0 0 4px',color:T.accent.cyan}}>Engine Room</h1>
        <p style={{fontSize:13,color:T.text.muted,margin:0}}>Plant status & auxiliaries</p>
      </header>
      <SubTabs tabs={['plant','aux']} active={engSub} setActive={setEngSub}/>
      {engSub==='plant'&&(
        <div style={{display:'flex',flexDirection:'column',gap:18}}>
          <Card className="hover-card">
            <CardHeader icon={Droplets} title="Fuel & Bunkers"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Stat label="24h Consump" value="42.1" unit="MT"/>
              <Stat label="ROB VLSFO"   value="1,842" unit="MT"/>
              <Stat label="ROB LSMGO"   value="124"   unit="MT"/>
              <Stat label="Daily Cost"  value="$27.3k" accent={T.accent.amber}/>
            </div>
          </Card>
          <Card className="hover-card">
            <CardHeader icon={Zap} title="Main Engine"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Stat label="Shaft RPM"    value="84.2"/>
              <Stat label="ME Load"      value="82%"  accent={T.accent.green}/>
              <Stat label="Exhaust Temp" value="318"  unit="°C"/>
              <Stat label="Scav Air Pr"  value="3.2"  unit="bar"/>
              <Stat label="FW Temp In"   value="82"   unit="°C"/>
              <Stat label="LO Pressure"  value="5.8"  unit="bar" accent={T.accent.green}/>
            </div>
          </Card>
        </div>
      )}
      {engSub==='aux'&&(
        <div style={{display:'flex',flexDirection:'column',gap:18}}>
          <Card className="hover-card">
            <CardHeader icon={Settings} title="Auxiliary Engines"/>
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {[{n:'AE 1',load:'68%',rpm:'720',status:'Running',ok:true},{n:'AE 2',load:'72%',rpm:'720',status:'Running',ok:true},{n:'AE 3',load:'0%',rpm:'0',status:'Standby',ok:false}].map((ae,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'40px 1fr 1fr 90px',gap:10,padding:'13px 0',borderBottom:i<2?`1px solid ${T.bg.canvas}`:'none',alignItems:'center',animation:`fadeUp 0.4s ease-out ${i*0.05}s both`}}>
                  <span style={{fontSize:13,fontWeight:700,color:T.text.vessel}}>{ae.n}</span>
                  <span style={{fontFamily:'monospace',fontSize:12,color:T.text.muted}}>{ae.rpm} RPM</span>
                  <span style={{fontFamily:'monospace',fontSize:12,color:ae.ok?T.accent.green:T.text.muted}}>Load {ae.load}</span>
                  <Badge label={ae.status} color={ae.ok?T.accent.green:T.text.muted} bg={ae.ok?'rgba(0,229,143,0.1)':T.bg.surfaceAlt}/>
                </div>
              ))}
            </div>
          </Card>
          <Card className="hover-card">
            <CardHeader icon={Droplets} title="Boiler & Utilities"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Stat label="Steam Press" value="6.8" unit="bar"/>
              <Stat label="Feed Temp"   value="108"  unit="°C"/>
              <Stat label="FW Gen"      value="18"   unit="MT/day" accent={T.accent.green}/>
              <Stat label="FW Tank"     value="84"   unit="%" accent={T.accent.green}/>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
};

// ── CREW ─────────────────────────────────────────────────
const CrewView = () => {
  const {currentUser,scrollH} = useApp();
  const restricted = currentUser?.restricted;
  const depts = [...new Set(FULL_CREW.map(c=>c.dept))];
  return (
    <main aria-label="Crew" style={{display:'flex',flexDirection:'column',flex:1,gap:22,padding:'22px'}}>
      <header>
        <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.03em',margin:'0 0 4px',color:T.accent.cyan}}>Crew Roster</h1>
        <p style={{fontSize:13,color:T.text.muted,margin:0}}>{FULL_CREW.length} POB · STCW compliant</p>
      </header>
      {depts.map(dept=>(
        <Card key={dept}>
          <CardHeader title={dept}/>
          {FULL_CREW.filter(c=>c.dept===dept).map((c,i,arr)=>(
            <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:i<arr.length-1?`1px solid ${T.bg.canvas}`:'none',animation:`fadeUp 0.4s ease-out ${i*0.04}s both`}}>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <div className="hover-avatar" style={{width:34,height:34,borderRadius:'50%',background:T.accent.soft,color:T.accent.primary,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold',fontSize:12,flexShrink:0}}>
                  {c.name.charAt(0)}
                </div>
                <div>
                  <p style={{fontSize:13,fontWeight:600,margin:0,color:T.text.vessel}}>{c.name}</p>
                  <p style={{fontSize:11,color:T.text.muted,margin:'2px 0 0'}}>{c.rank}</p>
                </div>
              </div>
              {!restricted&&<Badge label="ON BOARD" color={T.accent.green} bg="rgba(0,229,143,0.1)"/>}
            </div>
          ))}
        </Card>
      ))}
      {restricted&&(
        <div style={{background:'rgba(255,176,23,0.08)',border:`1px solid rgba(255,176,23,0.25)`,borderRadius:T.radius.sm,padding:'14px',display:'flex',gap:10,alignItems:'flex-start'}}>
          <AlertTriangle size={14} color={T.accent.amber} style={{flexShrink:0,marginTop:1}}/>
          <p style={{fontSize:12,color:T.accent.amber,margin:0,lineHeight:1.5}}>Detailed crew data visible to Officers only. Contact Master for full roster access.</p>
        </div>
      )}
    </main>
  );
};

// ── MAINTENANCE ────────────────────────────────────────────
const MaintenanceView = () => {
  const {defects,setDefects,scrollH} = useApp();
  const [maintSub,    setMaintSub]    = useState('jobs');
  const [showAdd,     setShowAdd]     = useState(false);
  const [expandedDef, setExpandedDef] = useState(null);
  const [newDef,      setNewDef]      = useState({system:'',component:'',desc:'',priority:'medium',assignee:''});
  const [formError,   setFormError]   = useState('');
  const inputStyle = {background:T.bg.canvas,border:'none',borderRadius:T.radius.sm,padding:'13px',color:T.text.main,fontSize:13,width:'100%'};

  const addDefect = () => {
    if(!newDef.component.trim()){ setFormError('Component is required'); return; }
    setDefects(d=>[...d,{...newDef,id:Date.now(),loggedAt:utcNow(),updatedAt:null,status:'open',pscLinked:false}]);
    setNewDef({system:'',component:'',desc:'',priority:'medium',assignee:''});
    setFormError('');
    setShowAdd(false);
  };

  const updateStatus = (id, status) => {
    setDefects(d=>d.map(def=>def.id===id?{...def,status,updatedAt:utcNow()}:def));
    setExpandedDef(null);
  };

  const STATUS_OPTIONS = [
    {s:'open',     label:'Open',      color:T.accent.amber, bg:'rgba(255,176,23,0.15)'},
    {s:'wip',      label:'WIP',       color:T.accent.primary,bg:'rgba(82,78,250,0.15)'},
    {s:'spare_req',label:'Spare Req', color:T.accent.cyan,  bg:'rgba(18,212,255,0.15)'},
    {s:'closed',   label:'Closed',    color:T.accent.green, bg:'rgba(0,229,143,0.15)'},
  ];

  return (
    <main aria-label="Maintenance" style={{display:'flex',flexDirection:'column',flex:1,gap:22,padding:'22px',position:'relative'}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.03em',margin:'0 0 4px',color:T.accent.cyan}}>Maintenance</h1>
          <p style={{fontSize:13,color:T.text.muted,margin:0}}>{defects.filter(d=>d.status!=='closed').length} open defects</p>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{background:T.accent.soft,border:'none',borderRadius:T.radius.pill,padding:'9px 15px',display:'flex',alignItems:'center',gap:6,cursor:'pointer',color:T.accent.primary,fontSize:13,fontWeight:700}}>
          <PlusCircle size={15}/> Log
        </button>
      </header>

      <SubTabs tabs={['jobs','schedule','spares']} active={maintSub} setActive={setMaintSub}/>

      {maintSub==='jobs'&&(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {defects.filter(d=>d.status!=='closed').length===0&&(
            <Card style={{textAlign:'center',padding:'36px 20px'}}>
              <CheckCircle2 size={34} color={T.accent.green} style={{margin:'0 auto 10px'}}/>
              <p style={{fontSize:14,fontWeight:600,color:T.text.muted,margin:0}}>No open defects</p>
            </Card>
          )}
          {defects.filter(d=>d.status!=='closed').map((def,i)=>(
            <Card key={def.id} className="hover-card" style={{border:def.priority==='critical'?`1px solid ${T.accent.coral}`:def.pscLinked?`1px solid rgba(255,176,23,0.4)`:'1px solid transparent',animation:`fadeUp 0.4s ease-out ${i*0.05}s both`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1,paddingRight:10}}>
                  <p style={{fontSize:14,fontWeight:700,margin:'0 0 3px',color:T.text.vessel}}>{def.component}</p>
                  <p style={{fontSize:11,fontFamily:'monospace',color:T.text.muted,margin:0}}>{def.system} · {utcFull(def.loggedAt)}</p>
                </div>
                <PriorityBadge p={def.priority}/>
              </div>
              <p style={{fontSize:13,color:T.text.muted,lineHeight:1.5,margin:0}}>{def.desc}</p>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <StatusBadge s={def.status}/>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {def.pscLinked&&<Badge label="PSC RISK" color={T.accent.amber} bg="rgba(255,176,23,0.12)"/>}
                  <button onClick={()=>setExpandedDef(expandedDef===def.id?null:def.id)}
                    style={{background:T.bg.canvas,border:`1px solid ${T.bg.surfaceAlt}`,borderRadius:T.radius.pill,padding:'5px 12px',fontSize:11,fontWeight:600,color:T.text.muted,cursor:'pointer'}}>
                    {expandedDef===def.id?'✕':'Update'}
                  </button>
                </div>
              </div>
              {expandedDef===def.id&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:8,paddingTop:4,borderTop:`1px solid ${T.bg.canvas}`,animation:'fadeUp 0.2s ease-out'}}>
                  {STATUS_OPTIONS.map(({s,label,color,bg})=>(
                    <button key={s} onClick={()=>updateStatus(def.id,s)}
                      style={{background:def.status===s?bg:T.bg.canvas,border:`1px solid ${def.status===s?color:T.bg.surfaceAlt}`,borderRadius:T.radius.pill,padding:'7px 14px',fontSize:11,fontWeight:700,color:def.status===s?color:T.text.muted,cursor:'pointer',transition:'all 0.15s'}}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {def.updatedAt&&(
                <p style={{fontSize:10,fontFamily:'monospace',color:T.text.faint,margin:0}}>Updated {utcFull(def.updatedAt)}</p>
              )}
            </Card>
          ))}
          {defects.filter(d=>d.status==='closed').length>0&&(
            <div style={{marginTop:8}}>
              <p style={{fontSize:12,color:T.text.faint,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Closed</p>
              {defects.filter(d=>d.status==='closed').map((def,i)=>(
                <Card key={def.id} style={{opacity:0.55,animation:`fadeUp 0.4s ease-out ${i*0.05}s both`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <p style={{fontSize:13,fontWeight:600,margin:0,color:T.text.muted,textDecoration:'line-through'}}>{def.component}</p>
                      <p style={{fontSize:11,fontFamily:'monospace',color:T.text.faint,margin:'2px 0 0'}}>{utcFull(def.updatedAt||def.loggedAt)}</p>
                    </div>
                    <Badge label="CLOSED" color={T.accent.green} bg="rgba(0,229,143,0.15)"/>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {maintSub==='schedule'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {SCHEDULED_JOBS.map((job,i)=>(
            <Card key={job.id} className="hover-card" style={{border:job.urgent?`1px solid rgba(255,90,95,0.35)`:'1px solid transparent',animation:`fadeUp 0.4s ease-out ${i*0.05}s both`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1,paddingRight:10}}>
                  <p style={{fontSize:14,fontWeight:700,margin:'0 0 3px',color:T.text.vessel}}>{job.job}</p>
                  <p style={{fontSize:12,color:T.text.muted,margin:0}}>{job.system} · Every {job.interval}</p>
                </div>
                {job.urgent&&<Badge label="DUE" color={T.accent.coral} bg="rgba(255,90,95,0.12)"/>}
              </div>
              <div style={{background:T.bg.canvas,borderRadius:T.radius.sm,padding:'9px 12px'}}>
                <span style={{fontSize:12,fontFamily:'monospace',color:job.urgent?T.accent.coral:T.text.muted}}>{job.due}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {maintSub==='spares'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {SPARES_ROB.map((spare,i)=>(
            <Card key={spare.id} className="hover-card" style={{border:spare.status==='critical'?`1px solid ${T.accent.coral}`:'1px solid transparent',animation:`fadeUp 0.4s ease-out ${i*0.05}s both`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1,paddingRight:10}}>
                  <p style={{fontSize:14,fontWeight:700,margin:'0 0 3px',color:T.text.vessel}}>{spare.part}</p>
                  <p style={{fontSize:11,fontFamily:'monospace',color:T.text.muted,margin:0}}>{spare.partNo}</p>
                </div>
                <Badge label={spare.status==='critical'?'CRITICAL':spare.status==='on_order'?'ON ORDER':'IN STOCK'} color={spare.status==='critical'?T.accent.coral:spare.status==='on_order'?T.accent.amber:T.accent.green} bg={spare.status==='critical'?'rgba(255,90,95,0.12)':spare.status==='on_order'?'rgba(255,176,23,0.12)':'rgba(0,229,143,0.12)'}/>
              </div>
              <div style={{background:T.bg.canvas,borderRadius:T.radius.sm,padding:'9px 12px'}}>
                <span style={{fontSize:12,color:T.text.muted}}>{spare.eta}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showAdd&&(
        <div role="dialog" aria-modal="true" style={{position:'absolute',inset:0,zIndex:200,display:'flex',alignItems:'flex-end',animation:'backdropIn 0.3s ease-out forwards'}}>
          <div style={{width:'100%',background:T.bg.surface,borderRadius:'32px 32px 0 0',padding:'28px 24px 40px',animation:'slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',maxHeight:'85vh',overflowY:'auto'}}>
            <h2 style={{fontSize:19,fontWeight:700,margin:'0 0 22px'}}>Log New Defect</h2>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {[{key:'system',label:'System',ph:'Main Engine'},{key:'component',label:'Component *',ph:'FW Cooler'},{key:'assignee',label:'Assigned To',ph:'Smith, R.'}].map(({key,label,ph})=>(
                <div key={key}>
                  <label style={{fontSize:11,fontWeight:600,color:T.text.muted,display:'block',marginBottom:6}}>{label}</label>
                  <input value={newDef[key]} onChange={e=>{setNewDef(f=>({...f,[key]:e.target.value}));if(key==='component')setFormError('');}} placeholder={ph} style={inputStyle}/>
                </div>
              ))}
              <div>
                <label style={{fontSize:11,fontWeight:600,color:T.text.muted,display:'block',marginBottom:6}}>Priority</label>
                <select value={newDef.priority} onChange={e=>setNewDef(f=>({...f,priority:e.target.value}))} style={inputStyle}>
                  <option value="low">Low</option><option value="medium">Medium</option>
                  <option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:T.text.muted,display:'block',marginBottom:6}}>Description</label>
                <textarea value={newDef.desc} onChange={e=>setNewDef(f=>({...f,desc:e.target.value}))} placeholder="Describe the defect…" rows={3} style={{...inputStyle,resize:'none'}}/>
              </div>
              {formError&&<p style={{fontSize:12,color:T.accent.coral,margin:0}}>{formError}</p>}
            </div>
            <div style={{display:'flex',gap:12,marginTop:22}}>
              <button onClick={()=>{setShowAdd(false);setFormError('');}} style={{flex:1,background:T.bg.surfaceAlt,border:'none',borderRadius:T.radius.pill,padding:'15px',color:T.text.main,fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
              <button onClick={addDefect} style={{flex:2,background:T.accent.primary,border:'none',borderRadius:T.radius.pill,padding:'15px',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Log Defect</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

// ── OPS ────────────────────────────────────────────────────
const OpsView = () => {
  const {pscItems,setPscItems,gmdssItems,setGmdssItems,noonLogged,setNoonLogged,currentUser,scrollH} = useApp();
  const [opsSub,   setOpsSub]   = useState('psc');
  const [showBio,  setShowBio]  = useState(false);
  const [noonForm, setNoonForm] = useState({lat:'',lon:'',distRun:'',distToGo:'',meConsump:'',rob:'',remarks:''});
  const [liveTime, setLiveTime] = useState(utcTime());
  useEffect(()=>{ const id=setInterval(()=>setLiveTime(utcTime()),1000); return()=>clearInterval(id); },[]);

  const pscDone   = pscItems.filter(x=>x.done).length;
  const togglePsc = id => setPscItems(items=>items.map(item=>item.id===id?{...item,done:!item.done}:item));
  const logGmdss  = id => setGmdssItems(items=>items.map(item=>item.id===id?{...item,tested:true,testedAt:utcNow(),testedBy:currentUser?.label||'Officer'}:item));

  return (
    <main aria-label="Ops" style={{display:'flex',flexDirection:'column',flex:1,gap:22,padding:'22px',position:'relative'}}>
      <header>
        <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.03em',margin:'0 0 4px',color:T.accent.cyan}}>Ship Ops</h1>
        <p style={{fontSize:13,color:T.text.muted,margin:0}}>Compliance & records</p>
      </header>
      <SubTabs tabs={['psc','gmdss','noon','muster']} active={opsSub} setActive={setOpsSub}/>

      {opsSub==='psc'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <Card>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:12,color:T.text.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>PSC Readiness</span>
              <span style={{fontFamily:'monospace',fontSize:20,fontWeight:700,color:pscDone===pscItems.length?T.accent.green:T.accent.amber}}>{pscDone}/{pscItems.length}</span>
            </div>
            <div style={{background:T.bg.canvas,borderRadius:999,height:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${(pscDone/pscItems.length)*100}%`,background:pscDone===pscItems.length?T.accent.green:T.accent.primary,transition:'width 0.4s',borderRadius:999}}/>
            </div>
          </Card>
          {pscItems.map((item,i)=>(
            <button key={item.id} onClick={()=>togglePsc(item.id)} className="hover-card" style={{background:T.bg.surface,borderRadius:T.radius.md,padding:'16px',display:'flex',alignItems:'center',gap:14,width:'100%',border:'1px solid transparent',cursor:'pointer',textAlign:'left',animation:`fadeUp 0.4s ease-out ${i*0.05}s both`}}>
              <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${item.done?T.accent.primary:T.text.faint}`,background:item.done?T.accent.primary:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}}>
                {item.done&&<Check size={13} color="#fff" style={{animation:'scaleIn 0.2s'}}/>}
              </div>
              <div style={{flex:1}}>
                <span style={{fontSize:13,fontWeight:600,color:item.done?T.text.muted:T.text.main,textDecoration:item.done?'line-through':'none',display:'block',lineHeight:1.4}}>{item.item}</span>
                <span style={{fontSize:11,color:T.text.faint}}>{item.cat}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {opsSub==='gmdss'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {gmdssItems.map((item,i)=>(
            <Card key={item.id} className="hover-card" style={{animation:`fadeUp 0.4s ease-out ${i*0.05}s both`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1,paddingRight:10}}>
                  <p style={{fontSize:14,fontWeight:700,color:T.text.vessel,margin:'0 0 3px'}}>{item.item}</p>
                  <p style={{fontSize:12,color:T.text.muted,margin:0}}>Freq: {item.freq}</p>
                </div>
                <Badge label={item.tested?'TESTED':'PENDING'} color={item.tested?T.accent.green:T.accent.amber} bg={item.tested?'rgba(0,229,143,0.12)':'rgba(255,176,23,0.12)'}/>
              </div>
              {item.tested&&item.testedAt&&(
                <div style={{background:T.bg.canvas,borderRadius:T.radius.sm,padding:'9px 12px'}}>
                  <p style={{fontSize:11,fontFamily:'monospace',color:T.text.muted,margin:0}}>{utcFull(item.testedAt)} · {item.testedBy}</p>
                </div>
              )}
              {!item.tested&&(
                <button onClick={()=>logGmdss(item.id)} style={{background:T.accent.primary,border:'none',borderRadius:T.radius.pill,padding:'11px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',width:'100%'}}>
                  Log Test — {liveTime}
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {opsSub==='noon'&&(
        <div style={{display:'flex',flexDirection:'column',gap:14,animation:'fadeUp 0.4s ease-out'}}>
          {noonLogged?(
            <Card style={{textAlign:'center',padding:'40px 20px'}}>
              <CheckCircle2 size={44} color={T.accent.green} style={{margin:'0 auto 14px'}}/>
              <p style={{fontSize:15,fontWeight:700,color:T.text.vessel,margin:'0 0 6px'}}>Noon Report Signed</p>
              <p style={{fontSize:12,fontFamily:'monospace',color:T.text.muted,margin:0}}>{utcDate()} · Biometric verified · Pending fleet sync</p>
            </Card>
          ):(
            <>
              <Card>
                <CardHeader icon={FileText} title="Noon Report"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {[{k:'lat',l:'Latitude',ph:'24°32.1N'},{k:'lon',l:'Longitude',ph:'057°18.4E'},{k:'distRun',l:'Dist Run (NM)',ph:'312'},{k:'distToGo',l:'Dist to Go',ph:'3,888'},{k:'meConsump',l:'Consump (MT)',ph:'42.1'},{k:'rob',l:'ROB (MT)',ph:'1,842'}].map(({k,l,ph})=>(
                    <div key={k}>
                      <label style={{fontSize:11,fontWeight:600,color:T.text.muted,display:'block',marginBottom:5}}>{l}</label>
                      <input value={noonForm[k]} onChange={e=>setNoonForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} style={{background:T.bg.canvas,border:'none',borderRadius:T.radius.sm,padding:'11px',color:T.text.main,fontSize:13,width:'100%'}}/>
                    </div>
                  ))}
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:600,color:T.text.muted,display:'block',marginBottom:5}}>Remarks</label>
                  <textarea value={noonForm.remarks} onChange={e=>setNoonForm(f=>({...f,remarks:e.target.value}))} placeholder="Any observations…" rows={3} style={{background:T.bg.canvas,border:'none',borderRadius:T.radius.sm,padding:'11px',color:T.text.main,fontSize:13,width:'100%',resize:'none'}}/>
                </div>
              </Card>
              <PillButton variant="primary" onClick={()=>setShowBio(true)}>
                <Lock size={15}/> Sign & Save Report
              </PillButton>
            </>
          )}
          {showBio&&(
            <BiometricModal title="Sign Noon Report" onSuccess={()=>{setNoonLogged(true);setShowBio(false);}} onCancel={()=>setShowBio(false)}/>
          )}
        </div>
      )}

      {opsSub==='muster'&&(
        <Card style={{animation:'fadeUp 0.4s ease-out'}}>
          <CardHeader icon={Users} title={`Muster List — ${FULL_CREW.length} POB`}/>
          {FULL_CREW.map((c,i)=>(
            <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:i<FULL_CREW.length-1?`1px solid ${T.bg.canvas}`:'none'}}>
              <div>
                <p style={{fontSize:13,fontWeight:600,margin:0,color:T.text.vessel}}>{c.name}</p>
                <p style={{fontSize:11,color:T.text.muted,margin:'2px 0 0'}}>{c.rank}</p>
              </div>
              <Badge label="ON BOARD" color={T.accent.green} bg="rgba(0,229,143,0.1)"/>
            </div>
          ))}
        </Card>
      )}
    </main>
  );
};

// ── SHORE VIEWS ────────────────────────────────────────────
const ShoreMarketView = () => {
  const {activePort,scrollH}=useApp();
  const isHRA=hraActive(activePort);
  const markets=[{name:'Baltic Dry (BDI)',val:'1,842',chg:'+24',up:true},{name:'VLCC (AG–FEast)',val:'$44.2k',chg:'+$1.2k',up:true},{name:'VLSFO Singapore',val:'$648/mt',chg:'+$8',up:true}];
  const fixtures=[
    {route:'AG → Rotterdam',type:'VLCC',rate:'$44,000/day',cargo:'Crude Oil'},
    {route:'W. Africa → Med',type:'Suezmax',rate:'$28,500/day',cargo:'Crude Oil'},
    {route:'Black Sea → NW Eur',type:'Aframax',rate:'$21,200/day',cargo:'Dirty'},
  ];
  const bunkers=[
    {port:'Rotterdam',grade:'VLSFO',price:'$658/mt',chg:'+$10',up:true},
    {port:'Fujairah',grade:'VLSFO',price:'$641/mt',chg:'+$5',up:true},
    {port:'Singapore',grade:'MGO',price:'$783/mt',chg:'-$3',up:false},
  ];
  return (
    <main aria-label="Market" style={{flex:1,display:'flex',flexDirection:'column',gap:22,padding:'22px'}}>
      <header>
        <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.03em',margin:'0 0 4px',color:T.accent.cyan}}>Market Intel</h1>
        <p style={{fontSize:13,color:T.text.muted,margin:0}}>Indicative indices — not live data</p>
      </header>
      {isHRA&&(
        <section className="grad-header" style={{border:`1px solid ${T.accent.coral}`,borderRadius:T.radius.lg,padding:'20px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#dc2626,#f97316)'}}/>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <Activity size={16} color={T.accent.coral} style={{animation:'float 2s ease-in-out infinite'}}/>
            <span style={{fontSize:11,color:T.accent.coral,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>Hormuz Closure Alert</span>
            <div style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:T.accent.coral,animation:'pulse 1.5s infinite'}}/>
          </div>
          <p style={{fontFamily:'monospace',fontSize:28,color:T.text.data,fontWeight:700,letterSpacing:'-0.03em',margin:'0 0 4px'}}>{fmtUSD(1425000)}</p>
          <p style={{fontSize:12,color:T.text.muted,margin:0}}>Est. fleet demurrage — indicative only</p>
        </section>
      )}
      <Card className="hover-card">
        <CardHeader icon={BarChart2} title="Freight & Bunker"/>
        {markets.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 0',borderBottom:i<markets.length-1?`1px solid ${T.bg.canvas}`:'none',animation:`fadeUp 0.4s ease-out ${i*0.05}s both`}}>
            <span style={{fontSize:14,fontWeight:500,color:T.text.vessel}}>{m.name}</span>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontFamily:'monospace',fontSize:15,fontWeight:600,color:T.text.data}}>{m.val}</span>
              <span style={{fontSize:12,fontWeight:700,color:m.up?T.accent.green:T.accent.coral}}>{m.chg}</span>
            </div>
          </div>
        ))}
      </Card>
      <Card className="hover-card">
        <CardHeader icon={Anchor} title="Charter Activity"/>
        {fixtures.map((f,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:i<fixtures.length-1?`1px solid ${T.bg.canvas}`:'none',animation:`fadeUp 0.4s ease-out ${i*0.07}s both`}}>
            <div>
              <p style={{fontSize:13,fontWeight:600,color:T.text.vessel,margin:0}}>{f.route}</p>
              <p style={{fontSize:11,color:T.text.faint,margin:'2px 0 0'}}>{f.type} · {f.cargo}</p>
            </div>
            <span style={{fontFamily:'monospace',fontSize:13,fontWeight:700,color:T.accent.green}}>{f.rate}</span>
          </div>
        ))}
      </Card>
      <Card className="hover-card">
        <CardHeader icon={Droplets} title="Bunker Prices"/>
        {bunkers.map((b,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:i<bunkers.length-1?`1px solid ${T.bg.canvas}`:'none',animation:`fadeUp 0.4s ease-out ${i*0.07}s both`}}>
            <div>
              <p style={{fontSize:13,fontWeight:600,color:T.text.vessel,margin:0}}>{b.port}</p>
              <p style={{fontSize:11,color:T.text.faint,margin:'2px 0 0'}}>{b.grade}</p>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontFamily:'monospace',fontSize:13,fontWeight:700,color:T.text.data}}>{b.price}</span>
              <span style={{fontSize:11,fontWeight:700,color:b.up?T.accent.coral:T.accent.green}}>{b.chg}</span>
            </div>
          </div>
        ))}
      </Card>
      <div style={{marginTop:'auto',paddingTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:6,opacity:0.35}}>
        <div style={{width:5,height:5,borderRadius:'50%',background:T.accent.green}}/>
        <span style={{fontSize:11,color:T.text.faint,fontFamily:'monospace'}}>VSAT · Last sync 22:27Z</span>
      </div>
    </main>
  );
};

const FleetView = () => {
  const {scrollH}=useApp();
  const vessels=[
    {name:'MT Iron Titan',type:'VLCC',flag:'🇱🇷',pos:'24°32N 057°18E',status:'Laden',dest:'Rotterdam',eta:'Jul 14',speed:'13.2 kn',hra:true},
    {name:'MT Pacific Star',type:'Suezmax',flag:'🇬🇷',pos:'01°18N 103°52E',status:'At Anchor',dest:'Singapore',eta:'Jul 08',speed:'0.0 kn',hra:false},
    {name:'MT Aegean Pride',type:'Aframax',flag:'🇬🇷',pos:'37°56N 023°42E',status:'In Port',dest:'Piraeus',eta:'Arrived',speed:'0.0 kn',hra:false},
  ];
  return (
    <main aria-label="Fleet" style={{flex:1,display:'flex',flexDirection:'column',gap:22,padding:'22px'}}>
      <header>
        <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.03em',margin:'0 0 4px',color:T.accent.cyan}}>Fleet Overview</h1>
        <p style={{fontSize:13,color:T.text.muted,margin:0}}>Active Voyages · {vessels.length} vessels</p>
      </header>
      {vessels.map((v,i)=>(
        <Card key={i} className="hover-card" style={{border:v.hra?`1px solid rgba(255,90,95,0.4)`:'1px solid transparent',animation:`fadeUp 0.4s ease-out ${i*0.05}s both`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <p style={{fontSize:17,fontWeight:700,margin:0,color:T.text.vessel}}>{v.flag} {v.name}</p>
              <p style={{fontSize:12,color:T.text.muted,margin:'3px 0 0'}}>{v.type} · {v.pos}</p>
            </div>
            {v.hra&&<Badge label="HRA" color={T.accent.coral} bg="rgba(255,90,95,0.15)"/>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <Stat label="Status" value={v.status}/>
            <Stat label="Dest." value={v.dest}/>
            <Stat label="ETA" value={v.eta}/>
            <Stat label="Speed" value={v.speed}/>
          </div>
        </Card>
      ))}
      <div style={{marginTop:'auto',paddingTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:6,opacity:0.35}}>
        <div style={{width:5,height:5,borderRadius:'50%',background:T.accent.green}}/>
        <span style={{fontSize:11,color:T.text.faint,fontFamily:'monospace'}}>AIS · Last sync 22:27Z</span>
      </div>
    </main>
  );
};

const CarbonView = () => {
  const {activePort,scrollH}=useApp();
  const cii=ciiFor(activePort);
  const isRed=activePort?.blocked;
  const cii2={score:'3.21',rating:'B',target:'4.00',dailyCO2:18.4,note:'On track. Slow-steam approach to Singapore recommended.'};
  const totalETS=Math.round(cii.dailyCO2*74)+Math.round(cii2.dailyCO2*74);
  return (
    <main aria-label="Carbon" style={{flex:1,display:'flex',flexDirection:'column',gap:22,padding:'22px'}}>
      <header>
        <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.03em',margin:'0 0 4px',color:T.accent.cyan}}>Carbon & CII</h1>
        <p style={{fontSize:13,color:T.text.muted,margin:0}}>EU ETS Emissions</p>
      </header>
      <CiiDisclaimer/>
      <Card className="hover-card" style={{border:isRed?`1px solid ${T.accent.coral}`:'1px solid transparent'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}><Leaf size={16} color={isRed?T.accent.coral:T.accent.green}/><span style={{fontSize:13,fontWeight:700,color:isRed?T.accent.coral:T.accent.green}}>MT Iron Titan</span></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <Stat label="CII Score"    value={cii.score} accent={isRed?T.accent.coral:T.accent.amber}/>
          <Stat label="EU ETS Daily" value={fmtUSD(Math.round(cii.dailyCO2*74))} accent={isRed?T.accent.coral:T.accent.amber}/>
          <Stat label="CII Rating"   value={cii.rating} accent={isRed?T.accent.coral:T.accent.amber}/>
          <Stat label="Target Score" value={cii.target}/>
        </div>
        <div style={{background:T.bg.canvas,borderRadius:T.radius.sm,padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:10,marginTop:2}}>
          <TrendingDown size={14} color={isRed?T.accent.coral:T.accent.amber} style={{flexShrink:0,marginTop:1}}/>
          <span style={{fontSize:12,color:isRed?T.accent.coral:T.accent.amber,lineHeight:1.5}}>{cii.note}</span>
        </div>
      </Card>
      <Card className="hover-card">
        <div style={{display:'flex',alignItems:'center',gap:8}}><Leaf size={16} color={T.accent.green}/><span style={{fontSize:13,fontWeight:700,color:T.accent.green}}>MT Pacific Star</span></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <Stat label="CII Score"    value={cii2.score} accent={T.accent.green}/>
          <Stat label="EU ETS Daily" value={fmtUSD(Math.round(cii2.dailyCO2*74))} accent={T.accent.green}/>
          <Stat label="CII Rating"   value={cii2.rating} accent={T.accent.green}/>
          <Stat label="Target Score" value={cii2.target}/>
        </div>
        <div style={{background:T.bg.canvas,borderRadius:T.radius.sm,padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:10,marginTop:2}}>
          <TrendingDown size={14} color={T.accent.green} style={{flexShrink:0,marginTop:1}}/>
          <span style={{fontSize:12,color:T.accent.green,lineHeight:1.5}}>{cii2.note}</span>
        </div>
      </Card>
      <div style={{background:T.bg.surface,borderRadius:T.radius.md,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:13,color:T.text.muted,fontWeight:600}}>Fleet EU ETS Today</span>
        <span style={{fontFamily:'monospace',fontSize:16,fontWeight:700,color:T.accent.amber}}>{fmtUSD(totalETS)}</span>
      </div>
      <div style={{marginTop:'auto',paddingTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:6,opacity:0.35}}>
        <div style={{width:5,height:5,borderRadius:'50%',background:T.accent.green}}/>
        <span style={{fontSize:11,color:T.text.faint,fontFamily:'monospace'}}>EU MRV · Last sync 22:27Z</span>
      </div>
    </main>
  );
};

// ═══════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [needsSetup,  setNeedsSetup]  = useState(false);
  const [vessel,      setVessel]      = useState(DEFAULT_VESSEL);
  const [activeTab,   setActiveTab]   = useState('bridge');
  const [activePort,  setActivePort]  = useState(GLOBAL_PORTS[0]);
  const [defects,     setDefects]     = useState(DEFECTS_SEED);
  const [pscItems,    setPscItems]    = useState(PSC_SEED);
  const [gmdssItems,  setGmdssItems]  = useState(GMDSS_SEED);
  const [noonLogged,  setNoonLogged]  = useState(false);
  const [bridgeSub,   setBridgeSub]   = useState('passage');
  const [deckLog,     setDeckLog]     = useState([]);
  const [nvgMode,     setNvgMode]     = useState(false);
  const [loaded,      setLoaded]      = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [scrollH,     setScrollH]     = useState(0);
  const scrollRef = useRef(null);

  useEffect(()=>{
    (async()=>{
      try {
        const v    = store.get('vessel');
        const d    = store.get('defects');
        const p    = store.get('pscItems');
        const g    = store.get('gmdssItems');
        const n    = store.get('noonLogged');
        const port = store.get('activePort');
        const dl   = store.get('deckLog');
        const nvg  = store.get('nvgMode');
        if(v)             setVessel(v);
        if(d)             setDefects(d);
        if(p)             setPscItems(p);
        if(g)             setGmdssItems(g);
        if(n)             setNoonLogged(n);
        if(port)          setActivePort(port);
        if(dl)            setDeckLog(dl);
        if(nvg !== null)  setNvgMode(nvg);
      } catch {}
      setLoaded(true);
    })();
  },[]);

  useEffect(()=>{ if(loaded) store.set('defects',   defects);    },[defects,   loaded]);
  useEffect(()=>{ if(loaded) store.set('pscItems',  pscItems);   },[pscItems,  loaded]);
  useEffect(()=>{ if(loaded) store.set('gmdssItems',gmdssItems); },[gmdssItems,loaded]);
  useEffect(()=>{ if(loaded) store.set('noonLogged',noonLogged); },[noonLogged,loaded]);
  useEffect(()=>{ if(loaded) store.set('vessel',    vessel);     },[vessel,    loaded]);
  useEffect(()=>{ if(loaded) store.set('activePort',activePort); },[activePort,loaded]);
  useEffect(()=>{ if(loaded) store.set('deckLog',   deckLog);    },[deckLog,   loaded]);
  useEffect(()=>{ if(loaded) store.set('nvgMode',   nvgMode);    },[nvgMode,   loaded]);

  const handleLogin = useCallback(role=>{
    setCurrentUser(role);
    if(role.shell==='ship'&&vessel.name===DEFAULT_VESSEL.name) setNeedsSetup(true);
    else setActiveTab(role.shell==='shore'?'market':'bridge');
  },[vessel]);

  const handleLogout = useCallback(()=>{
    setCurrentUser(null);
    setNeedsSetup(false);
    setNoonLogged(false);
    store.del('noonLogged');
  },[]);

  const handleSetupDone = useCallback(v=>{ setVessel(v); setNeedsSetup(false); setActiveTab('bridge'); },[]);
  const handleScroll    = useCallback(e=>setScrolled(e.target.scrollTop>10),[]);

  useEffect(()=>{
    if(!scrollRef.current) return;
    const ro = new ResizeObserver(entries=>setScrollH(entries[0].contentRect.height));
    ro.observe(scrollRef.current);
    setScrollH(scrollRef.current.clientHeight);
    return()=>ro.disconnect();
  },[currentUser]);

  const ctx = {
    activePort,setActivePort,vessel,setVessel,
    defects,setDefects,pscItems,setPscItems,gmdssItems,setGmdssItems,
    noonLogged,setNoonLogged,
    deckLog,setDeckLog,
    bridgeSub,setBridgeSub,currentUser,scrollH,
  };

  const nvgFilter = nvgMode?'sepia(1) saturate(5) hue-rotate(295deg) brightness(0.52)':'none';

  return (
    <AppCtx.Provider value={ctx}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#000',padding:16}}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

          @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
          @keyframes fadeUp     { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
          @keyframes spin       { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes shimmer    { 0%{background-position:-1000px 0} 100%{background-position:1000px 0} }
          @keyframes float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
          @keyframes pulse      { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.15);opacity:0.7} }
          @keyframes popIn      { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.15);opacity:1} 100%{transform:scale(1);opacity:1} }
          @keyframes slideUp    { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
          @keyframes scaleIn    { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
          @keyframes gradShift  { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
          @keyframes backdropIn { from{opacity:0;background:transparent;backdrop-filter:blur(0px)} to{opacity:1;background:rgba(26,27,34,0.88);backdrop-filter:blur(6px)} }

          .hover-card{transition:all 0.3s cubic-bezier(0.25,0.8,0.25,1)}
          .hover-card:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(82,78,250,0.15);border-color:rgba(82,78,250,0.5)!important}
          .hover-avatar{transition:transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275)}
          .hover-avatar:hover{transform:scale(1.15);z-index:10}
          .role-card{transition:all 0.3s cubic-bezier(0.175,0.885,0.32,1.275)}
          .role-card:hover{transform:scale(1.02)}
          .role-card:active{transform:scale(0.98)}

          .shimmer-box{background:#2C2E3C;background-image:linear-gradient(to right,#2C2E3C 0%,#3a3d4f 20%,#2C2E3C 40%,#2C2E3C 100%);background-repeat:no-repeat;background-size:800px 100%;animation:shimmer 2s infinite linear forwards}
          .leaflet-container{background:#1A1B22!important;font-family:'Inter',sans-serif!important}
          .leaflet-popup-content-wrapper{background:#242630;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.4);border:1px solid #2C2E3C}
          .leaflet-popup-content{color:#E8EDF0;font-size:13px;font-weight:600;margin:10px 14px}
          .leaflet-popup-tip{background:#242630}
          .leaflet-popup-close-button{color:#8E93A6!important}
          .grad-header{background:linear-gradient(270deg,rgba(82,78,250,0.2),rgba(18,212,255,0.2),rgba(82,78,250,0.2));background-size:200% 200%;animation:gradShift 4s ease infinite}

          *{box-sizing:border-box}
          body{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}
          button,select{cursor:pointer;font-family:'Inter',sans-serif}
          textarea,input{outline:none;font-family:'Inter',sans-serif}
          ::-webkit-scrollbar{display:none}
          select option{background:#1A1B22;color:#fff}
        `}</style>

        <div style={{width:'100%',maxWidth:390,height:'100vh',maxHeight:844,background:T.bg.canvas,borderRadius:44,border:'10px solid #000',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 40px 80px rgba(0,0,0,0.6)',animation:'fadeIn 0.5s ease-out',filter:nvgFilter,transition:'filter 0.4s ease'}}>
          {!currentUser?(
            <LoginScreen onLogin={handleLogin} vesselName={vessel.name}/>
          ):needsSetup?(
            <VesselSetup onComplete={handleSetupDone}/>
          ):(
            <>
              <MobileStatusBar onLogout={handleLogout} onToggleNvg={()=>setNvgMode(m=>!m)} nvgMode={nvgMode} scrolled={scrolled}/>
              <div ref={scrollRef} onScroll={handleScroll} style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',overflowY:'auto',overflowX:'hidden',scrollbarWidth:'none',background:T.bg.canvas}}>
                {currentUser.shell==='shore'&&<>
                  {activeTab==='market'&&<ErrorBoundary><ShoreMarketView/></ErrorBoundary>}
                  {activeTab==='fleet' &&<ErrorBoundary><FleetView/></ErrorBoundary>}
                  {activeTab==='carbon'&&<ErrorBoundary><CarbonView/></ErrorBoundary>}
                </>}
                {currentUser.shell==='ship'&&<>
                  {activeTab==='bridge'&&<ErrorBoundary><BridgeViewWrapper/></ErrorBoundary>}
                  {activeTab==='engine'&&<ErrorBoundary><EngineView/></ErrorBoundary>}
                  {activeTab==='crew'  &&<ErrorBoundary><CrewView/></ErrorBoundary>}
                  {activeTab==='maint' &&<ErrorBoundary><MaintenanceView/></ErrorBoundary>}
                  {activeTab==='ops'   &&<ErrorBoundary><OpsView/></ErrorBoundary>}
                </>}
              </div>
              {currentUser.shell==='shore'
                ?<ShoreBottomBar activeTab={activeTab} setActiveTab={setActiveTab}/>
                :<ShipBottomBar  activeTab={activeTab} setActiveTab={setActiveTab} defects={defects} pscItems={pscItems} currentUser={currentUser}/>
              }
            </>
          )}
        </div>
      </div>
    </AppCtx.Provider>
  );
}