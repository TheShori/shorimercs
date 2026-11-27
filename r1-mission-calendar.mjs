import React,{useEffect,useState} from 'react';
import {dayKey,shiftMonth,calendarRows,timelineDays,barSpan,workerColor} from './r1-calendar-model.mjs?v=21';
const h=React.createElement,ADMIN='victorsoripar@gmail.com';
const labelDate=day=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
const monthLabel=month=>new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'));
const css=`.mc-time{color:#e2e8f0;min-width:0}.mc-time button,.mc-time select,.mc-time input{font:inherit}.mc-time button:focus-visible,.mc-time select:focus-visible,.mc-time input:focus-visible{outline:2px solid #a5b4fc;outline-offset:-2px}.mc-time-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px}.mc-time-control{background:#020617;border:1px solid #334155;border-radius:9px;padding:8px 10px;color:#e2e8f0;min-width:0;font-size:13px!important}.mc-time-scroll{overflow:auto;max-height:650px;border:1px solid #1e293b;border-radius:12px;isolation:isolate}.mc-time-table{display:grid;grid-template-columns:220px repeat(var(--days),minmax(30px,1fr));min-width:calc(220px + var(--days)*30px)}.mc-time-head{position:sticky;top:0;z-index:3;background:#172033;padding:10px 0;text-align:center;border-bottom:1px solid #334155;font-size:11px}.mc-time-corner{left:0;z-index:5;text-align:left;padding-left:14px}.mc-time-label{position:sticky;left:0;z-index:2;background:#0f172a;border-bottom:1px solid #1e293b;padding:10px 14px;height:64px;min-width:0}.mc-time-name{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700;font-size:12px}.mc-time-worker{display:block;font-size:11px;margin-top:4px;color:var(--merc)}.mc-time-cell{height:64px;border-bottom:1px solid #1e293b;border-left:1px solid #172033;background:#080f20}.mc-time-cell[data-weekend=true]{background:#10192b}.mc-time-cell[data-today=true],.mc-time-head[data-today=true]{background:#24264a;border-left:1px solid #818cf8}.mc-time-bar{z-index:1;align-self:center;margin:0 2px;height:30px;border:0;border-radius:6px;background:var(--merc);color:#071021;padding:0 8px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px!important;font-weight:800!important;cursor:pointer;min-width:0}.mc-time-bar[data-open=true]{background:linear-gradient(90deg,var(--merc),var(--merc));border-right:3px dotted #0f172a}.mc-time-bar[data-before=true]{border-top-left-radius:0;border-bottom-left-radius:0}.mc-time-bar[data-after=true]{border-top-right-radius:0;border-bottom-right-radius:0}.mc-time-bar[aria-pressed=true]{outline:2px solid white;outline-offset:1px}.mc-time-detail{margin-top:14px;background:#020617;border-left:4px solid var(--merc);border-radius:9px;padding:14px;font-size:13px}.mc-time-subtle{color:#94a3b8;font-size:12px}.mc-time-detail p{margin-top:5px}.mc-time-close{float:right;background:transparent;color:#94a3b8;border:0;cursor:pointer;padding:4px 8px}@media(max-width:640px){.mc-time-table{grid-template-columns:140px repeat(var(--days),30px);min-width:calc(140px + var(--days)*30px)}.mc-time-label{padding:10px 8px}.mc-time-corner{padding-left:8px}.mc-time-name{font-size:11px}.mc-time-scroll{max-height:550px}}`;
export function R1MissionCalendar({authUser,missions=[],workers=[]}){
 const [today,setToday]=useState(()=>dayKey(Date.now()));
 const [month,setMonth]=useState(()=>dayKey(Date.now()).slice(0,7));
 const [workerId,setWorkerId]=useState('all'),[status,setStatus]=useState('all'),[selected,setSelected]=useState(null);
 useEffect(()=>{const t=setInterval(()=>setToday(dayKey(Date.now())),60000);return()=>clearInterval(t);},[]);
 if(authUser?.email?.toLowerCase()!==ADMIN)return null;
 const all=calendarRows(missions,workers,today),days=timelineDays(month);
 const filtered=all.filter(r=>(workerId==='all'||(r.mission.workerId||'unassigned')===workerId)&&(status==='all'||(status==='open'?r.mission.status!=='Completada':r.mission.status==='Completada')));
 const rows=filtered.map(r=>({...r,span:barSpan(r.range,days)})).filter(r=>r.span).sort((a,b)=>a.workerName.localeCompare(b.workerName,'es')||a.range.start.localeCompare(b.range.start)||a.mission.missionTitle.localeCompare(b.mission.missionTitle,'es'));
 const choices=[...new Map(all.map(r=>[r.mission.workerId||'unassigned',r.workerName])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'es'));
 const detail=rows.find(r=>r.mission.id===selected),missing=filtered.filter(r=>r.range.error);
 const navigate=value=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return;setMonth(value);setSelected(null);};
 const weekend=day=>[0,6].includes(new Date(day+'T12:00:00Z').getUTCDay());
 return h('section',{className:'mc-time bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6','aria-label':'Calendario de misiones'},
  h('style',null,css),
  h('div',{className:'mc-time-toolbar'},h('h2',{className:'text-lg font-extrabold text-white',style:{marginRight:'auto'}},'Calendario'),
   h('select',{className:'mc-time-control','aria-label':'Mercenario',value:workerId,onChange:e=>{setWorkerId(e.target.value);setSelected(null);}},h('option',{value:'all'},'Todos los mercenarios'),...choices.map(([id,name])=>h('option',{key:id,value:id},name))),
   h('select',{className:'mc-time-control','aria-label':'Estado actual',value:status,onChange:e=>{setStatus(e.target.value);setSelected(null);}},h('option',{value:'all'},'Todas las misiones'),h('option',{value:'open'},'Abiertas'),h('option',{value:'done'},'Completadas'))),
  h('div',{className:'mc-time-toolbar'},
   h('button',{type:'button',className:'mc-time-control','aria-label':'Mes anterior',onClick:()=>navigate(shiftMonth(month,-1))},'‹'),
   h('h3',{className:'font-bold capitalize',style:{flex:1}},monthLabel(month)),
   h('button',{type:'button',className:'mc-time-control','aria-label':'Mes siguiente',onClick:()=>navigate(shiftMonth(month,1))},'›'),
   h('button',{type:'button',className:'mc-time-control',onClick:()=>navigate(today.slice(0,7))},'Hoy'),
   h('input',{type:'month',value:month,className:'mc-time-control','aria-label':'Elegir mes',onChange:e=>navigate(e.target.value)})),
  h('div',{className:'mc-time-scroll',tabIndex:0,'aria-label':'Misiones por días; desplaza horizontalmente para ver el mes'},h('div',{className:'mc-time-table',style:{'--days':days.length}},
   h('div',{className:'mc-time-head mc-time-corner',style:{gridRow:1,gridColumn:1}},'Misión / Mercenario'),
   ...days.map((day,i)=>h('div',{key:day,className:'mc-time-head','data-today':day===today,style:{gridRow:1,gridColumn:i+2},title:labelDate(day)},Number(day.slice(-2)))),
   ...rows.flatMap((r,index)=>{const row=index+2,color=workerColor(r.worker?.color);return [
    h('div',{key:r.mission.id+'label',className:'mc-time-label',style:{gridRow:row,gridColumn:1,'--merc':color}},h('span',{className:'mc-time-name',title:r.mission.missionTitle},r.mission.missionTitle),h('span',{className:'mc-time-worker'},'● '+r.workerName)),
    ...days.map((day,i)=>h('div',{key:r.mission.id+day,className:'mc-time-cell','data-weekend':weekend(day),'data-today':day===today,style:{gridRow:row,gridColumn:i+2},'aria-hidden':true})),
    h('button',{key:r.mission.id+'bar',type:'button',className:'mc-time-bar',style:{gridRow:row,gridColumn:`${r.span.start+2} / span ${r.span.length}`,'--merc':color},'data-open':!r.range.completed,'data-before':r.span.continuesBefore,'data-after':r.span.continuesAfter,'aria-pressed':selected===r.mission.id,'aria-label':`${r.mission.missionTitle} · ${r.workerName} · ${labelDate(r.range.start)} · ${r.range.completed?'Finalizada '+labelDate(r.range.end):'Sigue abierta'}`,title:r.mission.missionTitle+' · '+r.workerName,onClick:()=>setSelected(selected===r.mission.id?null:r.mission.id)},r.mission.missionTitle+(r.range.completed?' ✓':' →'))];}))),
  !rows.length&&h('p',{className:'mc-time-subtle',style:{padding:'20px 0'}},'No hay misiones en este mes con estos filtros.'),
  h('p',{className:'mc-time-subtle',style:{marginTop:10}},'Color del mercenario · ✓ Finalizada · → Abierta hasta hoy. Toca una barra para ver el detalle.'),
  detail&&h('div',{className:'mc-time-detail',style:{'--merc':workerColor(detail.worker?.color)},'aria-live':'polite'},
   h('button',{type:'button',className:'mc-time-close','aria-label':'Cerrar detalle',onClick:()=>setSelected(null)},'✕'),
   h('h4',{className:'font-bold',style:{overflowWrap:'anywhere'}},detail.mission.missionTitle),
   h('p',null,detail.workerName+' · '+(detail.mission.clientName||'Sin cliente')),
   h('p',null,'Creada: '+labelDate(detail.range.start)+' · '+(detail.range.completed?'Finalizada: '+labelDate(detail.range.end):'Sigue abierta')),
   h('p',null,'Estado actual: '+(detail.mission.status==='En Progreso'?'En curso':detail.mission.status))),
  h('p',{className:'mc-time-subtle',style:{marginTop:10}},'Asignación actual del mercenario. Fechas en hora de Madrid.'),
  missing.length>0&&h('details',{className:'text-sm text-amber-300',style:{marginTop:12}},h('summary',null,missing.length+' misiones sin fechas suficientes'),...missing.map(r=>h('p',{key:r.mission.id},r.mission.missionTitle+' · '+r.range.error)))
 );
}
