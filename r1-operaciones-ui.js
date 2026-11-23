import React,{useState,useRef,useEffect,useCallback} from 'react';
import {RehearsalClient,makeTransport,isManaged,ADMIN,UUID,startAutoSync} from './r1-operaciones-client.mjs?v=2-auto';
const h=React.createElement;
const button='rounded-lg px-3 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40';
const EMPTY={runId:'',missions:[],workers:[],tags:[],busy:false,connected:false,pending:null,last:null,result:null,error:''};
const STORAGE='gm-r1-operaciones-v1';
function stored(){try{const x=JSON.parse(sessionStorage.getItem(STORAGE)||'{}');return UUID.test(x.runId)?{runId:x.runId,seedRequestId:UUID.test(x.seedRequestId)?x.seedRequestId:''}:{};}catch{return {};}}
export function useMissionR1(authUser,enabled){
 const [state,setState]=useState(EMPTY),[secrets,setSecrets]=useState({}),[error,setError]=useState('');
 const engine=useRef(null),current=useRef(authUser),timers=useRef(new Map());current.current=authUser;
 const clearSecrets=useCallback(()=>{for(const t of timers.current.values())clearTimeout(t);timers.current.clear();setSecrets({});},[]);
 useEffect(()=>{
  clearSecrets();setError('');if(!enabled||!authUser){setState(EMPTY);return;}
  let alive=true;const uid=authUser.uid;
  const client=new RehearsalClient({...stored(),send:makeTransport({getUser:()=>current.current,isCurrent:()=>alive&&current.current?.uid===uid}),onChange:s=>{if(alive&&current.current?.uid===uid)setState({...s,owner:uid});},onRun:(runId,seedRequestId)=>{try{sessionStorage.setItem(STORAGE,JSON.stringify({runId,seedRequestId}));}catch{}}});
  engine.current=client;setState({...client.state,owner:uid});
  const stopSync=startAutoSync(client);
  return()=>{alive=false;stopSync();client.dispose();if(engine.current===client)engine.current=null;};
 },[authUser?.uid,enabled,clearSecrets]);
 useEffect(()=>{const hide=()=>clearSecrets();const unload=e=>{if(engine.current?.state.pending||engine.current?.state.busy){e.preventDefault();e.returnValue='';}};window.addEventListener('blur',hide);document.addEventListener('visibilitychange',hide);window.addEventListener('beforeunload',unload);return()=>{window.removeEventListener('blur',hide);document.removeEventListener('visibilitychange',hide);window.removeEventListener('beforeunload',unload);for(const t of timers.current.values())clearTimeout(t);};},[clearSecrets]);
 useEffect(()=>{setSecrets(previous=>{const next={...previous};let changed=false;for(const id of Object.keys(next)){const m=state.missions.find(m=>m.id===id);if(!m||m.r1Revision!==next[id].revision||m.credentialState!=='stored'){clearTimeout(timers.current.get(id));timers.current.delete(id);delete next[id];changed=true;}}return changed?next:previous;});},[state.missions]);
 async function call(method,...args){setError('');clearSecrets();try{if(!engine.current)throw Error('Espera a que se confirme tu sesión.');return await engine.current[method](...args);}catch(e){setError(e.message);throw e;}}
 async function reveal(m){setError('');const client=engine.current;try{if(!client)throw Error('Inicia sesión.');const c=await client.reveal(m);if(!c||engine.current!==client||!client.active)return;setSecrets(s=>({...s,[m.id]:{...c,revision:m.r1Revision}}));clearTimeout(timers.current.get(m.id));timers.current.set(m.id,setTimeout(()=>hide(m.id),15000));return c;}catch(e){setError(e.message);throw e;}}
 function hide(id){clearTimeout(timers.current.get(id));timers.current.delete(id);setSecrets(s=>{const n={...s};delete n[id];return n;});}
 const view=state.owner===authUser?.uid?state:EMPTY;
 return {...view,error:error||view.error||view.syncError,pending:!!view.pending,hasLast:!!view.last,secrets:view===EMPTY?{}:secrets,isAdmin:authUser?.email?.toLowerCase()===ADMIN,load:()=>call('load',authUser?.email?.toLowerCase()===ADMIN),setRun:id=>call('setRun',id),retry:()=>call('retry'),save:(...a)=>call('save',...a),mutate:(...a)=>call('mutate',...a),batch:(...a)=>call('batch',...a),extra:(action,data,expectedRevision)=>call('execute',{action,data,expectedRevision,runId:'00000000-0000-4000-8000-000000000001',requestId:crypto.randomUUID()}),reveal,hide,clearSecrets,isManaged};
}
export function R1IntegrationBar({r1}){
 const safe=fn=>()=>Promise.resolve().then(fn).catch(()=>{});
 if(!r1.isAdmin){
  if(!r1.pending)return null;
  return h('div',{role:'alert',className:'max-w-3xl mx-auto px-4 py-3 text-sm'},h('p',null,'No se ha confirmado tu último cambio.'),h('button',{className:button,disabled:r1.busy,onClick:safe(r1.retry)},'Comprobar guardado'));
 }
 return h('section',{className:'max-w-7xl mx-auto px-4 pt-4'},h('div',{className:'rounded-xl border border-amber-500 bg-slate-900 p-4 space-y-3'},
 h('h2',{className:'text-lg font-bold text-amber-300'},r1.isAdmin?'Operaciones comerciales':'Misiones'),
 r1.isAdmin?h('p',null,'Los cambios afectan a las misiones reales. WhatsApp: '+(r1.dispatchEnabled?'activo para eventos nuevos.':'pausado; los avisos retenidos no se enviarán al activarlo.')):null,
 r1.isAdmin?h('button',{className:button,disabled:r1.busy||r1.pending||r1.refreshing,onClick:safe(r1.load)},'Actualizar ahora'):null,
 r1.error?h('p',{role:'alert',className:'text-rose-300'},r1.error):null,
 h('p',{role:'status'},r1.pending?'Actualización automática en pausa: resuelve la petición pendiente.':r1.connected?'Conectado · '+r1.missions.length+' misiones · Actualización automática cada 30 s':r1.error?'Pendiente de reconexión automática.':'Conectando automáticamente…'),
 r1.pending?h('button',{className:button,disabled:r1.busy,onClick:safe(r1.retry)},'Reanudar la misma petición'):null,
 r1.isAdmin&&r1.delivery?.length?h('details',null,h('summary',null,'Últimos avisos'),...r1.delivery.map(d=>h('p',{key:d.id,className:'text-sm'},d.missionId+' · '+d.type+' · '+({held:'Retenido',queued:'Pendiente',attempting:'Sin confirmación; no se reenvía',accepted:'Aceptado por WhatsApp',unknown:'Sin confirmación; revisar',not_sent:'No enviado',expired:'Caducado',disabled:'Desactivado',invalid_phone:'Teléfono no válido'}[d.status]||d.status)))):null,
 r1.result?h('p',{role:'status'},'Confirmado: '+r1.result.status+' · '+r1.result.action):null));
}
export function R1CredentialCard({r1,mission}){
 if(!isManaged(mission))return null;const c=r1.secrets[mission.id];
 const copy=value=>navigator.clipboard.writeText(value).catch(()=>alert('No se pudo copiar. Selecciona el valor visible.'));
 return h('div',{className:'rounded-xl border border-indigo-500/40 bg-slate-950 p-3 space-y-2 text-sm'},
  h('strong',{className:'inline-block mr-3'},r1.isAdmin?'Credencial · '+mission.credentialState:'Correo y Contraseña'),
  c?h('div',{className:'space-y-2'},h('p',{className:'break-all font-mono'},c.username),h('p',{className:'break-all font-mono text-amber-200'},c.password),h('div',{className:'flex flex-wrap gap-2'},h('button',{className:button,type:'button',onClick:()=>copy(c.username)},'Copiar usuario'),h('button',{className:button,type:'button',onClick:()=>copy(c.password)},'Copiar contraseña'),h('button',{className:button,type:'button',onClick:()=>r1.hide(mission.id)},'Ocultar'))):h('button',{className:button,type:'button',disabled:r1.busy||r1.pending||!r1.connected||mission.credentialState!=='stored'||mission.status==='Completada',onClick:()=>r1.reveal(mission).catch(()=>{})},r1.isAdmin?'Revelar durante 15 s':'Revelar'),
  r1.isAdmin?h('p',{className:'text-xs text-slate-400'},'Se oculta al perder el foco o en 15 segundos. El portapapeles no se borra automáticamente.'):null);
}
