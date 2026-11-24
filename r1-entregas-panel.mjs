import React,{useEffect,useState} from 'react';
const h=React.createElement;
const ADMIN='victorsoripar@gmail.com';
const endpoint='https://najovisunas.synology.me:18443/api/r1/nas-test/delivery-status';
const types={mission_started:'Inicio',mission_paused:'Pausa',mission_resumed:'Reanudación',checklist_step:'Avance',mission_completed:'Finalización'};
const labels={accepted:'Aceptado · entrega sin confirmar',delivered:'Entregado',read:'Leído',error:'WhatsApp informó de un error',queued:'Pendiente de envío',attempting:'Intento en curso o sin confirmar',unknown:'Resultado sin confirmar',not_sent:'No enviado',expired:'Aviso caducado',held:'Aviso retenido',disabled:'Aviso desactivado',invalid_phone:'Teléfono no válido'};
const date=ms=>Number.isFinite(ms)&&ms>0?new Date(ms).toLocaleString('es-ES'):'Sin fecha';
export function R1ReceiptPanel({authUser}){
 const [view,setView]=useState(null);
 useEffect(()=>{
  setView(null);
  if(authUser?.email!==ADMIN)return;
  let active=true,busy=false,controller=null;
  const refresh=async()=>{
   if(!active||busy||document.visibilityState==='hidden')return;
   busy=true;const request=new AbortController();controller=request;
   const timeout=setTimeout(()=>request.abort(),10000);
   try{
    const token=await authUser.getIdToken();
    if(!active||request.signal.aborted)return;
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({mode:'receipt-test-v17'}),signal:request.signal,cache:'no-store'});
    if(!response.ok)throw Error('unavailable');
    const data=await response.json();
    if(data.version!=='receipt-test-v17'||data.scope!=='production-read-only'||!Array.isArray(data.rows))throw Error('invalid');
    if(active)setView({owner:authUser,data,at:Date.now(),error:false});
   }catch{
    if(active)setView(previous=>({owner:authUser,data:previous?.owner===authUser?previous.data:null,at:previous?.owner===authUser?previous.at:null,error:true}));
   }finally{clearTimeout(timeout);busy=false;if(controller===request)controller=null;}
  };
  refresh();const timer=setInterval(refresh,30000);
  document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
 },[authUser]);
 if(authUser?.email!==ADMIN)return null;
 const current=view?.owner===authUser?view:null;
 const rows=current?.data?.rows||[];
 return h('section',{className:'bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4','aria-label':'Entregas de WhatsApp'},
  h('div',null,h('h3',{className:'text-lg font-extrabold text-white'},'Entregas de WhatsApp'),h('p',{className:'text-sm text-slate-400 mt-1'},'Avisos de producción · Solo consulta. Actualización automática.')),
  h('p',{role:'status',className:current?.error?'text-amber-300 text-sm':'text-slate-400 text-sm'},current?.error?'No se pudo actualizar el seguimiento. Los datos anteriores pueden estar desactualizados. Se reintentará automáticamente.':current?'Última consulta: '+date(current.at):'Consultando entregas…'),
  current?.data?.tracking?.available===false&&h('p',{role:'alert',className:'text-amber-300 text-sm'},'El seguimiento ha detectado un fallo. Las confirmaciones pueden estar incompletas.'),
  current?.data&&rows.length===0&&h('p',{className:'text-slate-400'},'Todavía no hay avisos para mostrar.'),
  ...rows.map(row=>{
   const trace=row.trace,state=trace?.state||row.status;
   const detail=trace?.readAt?'Confirmación de lectura recibida: '+date(trace.readAt):trace?.deliveredAt?'Confirmación de entrega recibida: '+date(trace.deliveredAt):trace?(state==='error'?'WhatsApp notificó un error. Este panel no reintenta el envío.':'Todavía no hay confirmación de entrega. No significa que haya fallado.'):row.status==='accepted'?'Sin registro de seguimiento para este aviso. No se puede deducir su entrega.':'Este panel no envía ni reintenta mensajes.';
   const color=state==='read'?'text-cyan-300':state==='delivered'?'text-emerald-300':state==='error'||state==='not_sent'?'text-rose-300':'text-amber-300';
   return h('article',{key:row.id,className:'bg-slate-950 rounded-xl p-4 space-y-2'},
    h('div',{className:'flex flex-wrap justify-between items-center gap-2'},h('h4',{className:'font-bold text-white break-words'},row.mission||'Aviso'),h('span',{className:'text-sm font-bold '+color},labels[state]||'Sin seguimiento')),
    h('p',{className:'text-sm text-slate-400'},(types[row.type]||'Aviso')+' · '+date(row.at)),
    h('p',{className:'text-sm text-slate-300'},detail));
  })
 );
}
