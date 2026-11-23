// Production entry point. No credentials, tokens or command bodies are persisted by this module.
export const NAS_ORIGIN='https://najovisunas.synology.me:18443';
export const SCOPE='gm_r1_commercial/live';
export const VERSION='commercial-live-v1';
export const ADMIN='victorsoripar@gmail.com';
export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const isManaged=m=>!!m&&m.r1Managed===true&&typeof m.id==='string'&&Number.isSafeInteger(m.r1Revision)&&m.r1Revision>0;
const fail=message=>{throw Error(message);};
export function money(value){
 const s=String(value??'').trim().replace(',','.');
 if(s!==''&&!/^\d+(\.\d{1,6})?$/.test(s))fail('Usa un importe positivo con hasta seis decimales.');
 const n=s===''?0:Number(s);if(!Number.isFinite(n)||n>1000000)fail('Importe fuera de límite.');return n;
}
export function missionData(f,checklist){
 
 return {clientName:f.clientName.trim(),clientPhone:f.clientPhone||f.clientContact||'',missionTitle:f.missionTitle.trim(),gameCategory:f.gameCategory||'Exploración de Actos',loginMethod:f.loginMethod||'Kabam ID',instructions:f.instructions||'',priority:f.priority||'Normal',workerId:f.workerId||'unassigned',priceTotalEUR:money(f.priceTotalEUR),workerPayUSD:money(f.workerPayUSD),paymentMethod:f.paymentMethod||'Bizum',tags:f.tags||[],checklist:(checklist||[]).map(i=>({id:i.id,text:i.text,done:i.done===true}))};
}
export function credentialData(mode,f){
 if(['keep','remove'].includes(mode))return {mode};
 if(mode!=='replace'||!f.accountUser||!f.accountPass)fail('Introduce usuario y contraseña.');
 return {mode,username:f.accountUser,password:f.accountPass};
}
export function monthLabel(value){const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('es-ES',{month:'long',timeZone:'Europe/Madrid'}).format(d).replace(/^./,s=>s.toUpperCase())+' '+new Intl.DateTimeFormat('es-ES',{year:'numeric',timeZone:'Europe/Madrid'}).format(d):'';}
export function viewMission(m){return {...m,monthYear:monthLabel(m.createdAt)};}
export function makeTransport({getUser,isCurrent,fetcher=fetch,locationCheck=()=>location.origin==='https://theshori.github.io'&&['/shorimercs/','/shorimercs/index.html'].includes(location.pathname)}){
 return async body=>{
  if(!locationCheck())fail('Abre esta página desde la web de GestiónMercenarios.');
  const u=getUser();if(!u?.getIdToken||!isCurrent())fail('Inicia sesión de nuevo.');
  const token=await u.getIdToken();if(!isCurrent()||getUser()?.uid!==u.uid)fail('La sesión cambió.');
  const text=JSON.stringify(body);if(new TextEncoder().encode(text).length>9000)fail('Formulario demasiado grande: reduce textos o subtareas.');
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),30000);let response,data;
  try{response=await fetcher(NAS_ORIGIN+'/api/r1/commercial-live',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:text,cache:'no-store',redirect:'error',signal:c.signal});data=await response.json();}
  catch{const e=Error('Resultado no confirmado. Usa «Reanudar la misma petición» sin cerrar esta pestaña.');e.uncertain=true;throw e;}finally{clearTimeout(timer);}
  if(!isCurrent()||getUser()?.uid!==u.uid)fail('La sesión cambió.');
  if(!response.ok){const messages={DB_QUOTA:'La base de datos ha alcanzado su cuota. Se reintentará automáticamente cuando vuelva a estar disponible.',STALE_VERSION:'La misión cambió. Actualiza y revisa el formulario antes de guardar.',STALE_BATCH:'Las misiones cambiaron. Actualiza y revisa de nuevo la liquidación.',STALE_WORKER:'El perfil cambió. Actualiza antes de continuar.',UNPAID_WORKER:'Liquida primero el saldo de este perfil.',RUN_COUNT_LIMIT:'Se alcanzó el límite de misiones. No crees otro; conserva este identificador.',KEY:'El NAS no puede cargar la clave de servicio comercial.',NO_CREDENTIAL:'La credencial ya no está disponible.',RATE_LIMIT:'Espera un minuto y reanuda la misma petición.',RUN_UNAVAILABLE:'El servicio aún no está activado. Completa la migración en el NAS.',TWO_LINKED_WORKERS_REQUIRED:'Se necesitan al menos dos perfiles activos y vinculados.'};const e=Error(messages[data.code]||data.error||'Consulta rechazada: '+response.status);e.code=data.code;e.retryAfterMs=data.code==='DB_QUOTA'?900000:0;e.uncertain=response.status>=500||response.status===429;throw e;}
  if(typeof data.willSend!=='boolean'||data.commercialWrites!==true){const e=Error('Respuesta fuera del servicio comercial. No continúes.');e.uncertain=true;throw e;}
  return data;
 };
}
export class RehearsalClient{
 constructor({send,runId='',uuid=()=>crypto.randomUUID(),onChange=()=>{},onRun=()=>{},seedRequestId=''}){this.send=send;this.uuid=uuid;this.onChange=onChange;this.onRun=onRun;this.seedRequestId=seedRequestId;this.active=true;this.readSequence=0;this.syncing=false;this.state={runId,missions:[],workers:[],tags:[],connected:false,busy:false,refreshing:false,lastUpdated:null,syncError:'',pending:null,last:null,result:null,error:''};}
 emit(patch){if(!this.active)return;Object.assign(this.state,patch);this.onChange({...this.state});}
 dispose(){this.active=false;this.readSequence++;this.state.pending=null;this.state.last=null;this.state.missions=[];}
 setRun(id){if(this.state.busy||this.state.pending)fail('Resuelve primero la petición pendiente.');if(id&&!UUID.test(id))fail('El identificador de servicio comercial no es válido.');this.seedRequestId='';this.onRun(id,'');this.emit({runId:id,missions:[],workers:[],tags:[],connected:false,last:null,result:null,error:''});}
 async refresh(){const sequence=++this.readSequence;let r;
  try{r=await this.send({action:'list',runId:this.state.runId});}catch(e){if(!this.active||sequence!==this.readSequence)return;throw e;}
  if(!this.active||sequence!==this.readSequence)return;
  if(r.status!=='listed'||r.apiVersion!==VERSION||r.scope!==SCOPE||r.runId!==this.state.runId||!Array.isArray(r.missions)||!r.missions.every(isManaged)||!Array.isArray(r.workers)||!Array.isArray(r.tags))fail('Respuesta de listado no válida.');
  this.emit({missions:r.missions.map(viewMission),workers:r.workers,tags:r.tags,templates:r.templates||[],notifications:r.notifications||[],automationSettings:r.automationSettings||{},dispatchEnabled:r.dispatchEnabled===true,delivery:r.delivery||[],connected:true,lastUpdated:Date.now(),syncError:''});return r;
 }
 async sync(){
  if(!this.active||this.syncing||this.state.busy||this.state.pending)return;
  this.syncing=true;this.state.runId='00000000-0000-4000-8000-000000000001';this.emit({refreshing:true});
  try{return await this.refresh();}catch(e){
   const auth=['AUTH','FORBIDDEN'].includes(e.code);
   this.emit({connected:false,syncError:e.code==='DB_QUOTA'?e.message:auth?'La sesión no permite actualizar. Vuelve a iniciar sesión.':'No se pudo actualizar. Se reintentará automáticamente.',...(auth?{missions:[],workers:[],tags:[],templates:[],notifications:[],delivery:[]}:{} )});throw e;
  }finally{this.syncing=false;this.emit({refreshing:false});}
 }
 async load(admin){if(this.state.busy)return;if(this.state.pending)fail('Reanuda primero la petición pendiente.');
  this.state.runId='00000000-0000-4000-8000-000000000001';
  this.emit({busy:true,error:''});try{return await this.refresh();}catch(e){this.emit({error:e.message,connected:false});throw e;}finally{this.emit({busy:false});}
 }
 async execute(command){if(!this.active)fail('La sesión cambió.');if(this.state.busy)fail('Hay otra operación en curso.');if(this.state.pending&&this.state.pending.requestId!==command.requestId)fail('Resuelve primero la petición pendiente.');
  this.readSequence++;this.emit({busy:true,error:'',result:null});
  try{const r=await this.send(command);if(!this.active)return;
   const expected=command.action==='seed'?['seeded','duplicate']:['committed','duplicate','no_change'];
   if(!expected.includes(r.status)||r.apiVersion!==VERSION||r.scope!==SCOPE||r.runId!==command.runId||(command.action!=='seed'&&(r.requestId!==command.requestId||r.action!==command.action))){const e=Error('Respuesta no reconocida. Reanuda la misma petición.');e.uncertain=true;throw e;}
   this.emit({pending:null,last:command,result:r});if(command.action==='seed'){this.seedRequestId='';this.onRun(this.state.runId,'');}
   try{await this.refresh();}catch(e){this.emit({connected:false,error:'El cambio está confirmado; falta actualizar la vista. '+e.message});}return r;
  }catch(e){this.emit({pending:e.uncertain?command:null,error:e.message,connected:e.uncertain?this.state.connected:false});throw e;}finally{this.emit({busy:false});}
 }
 mutate(action,mission,data){if(!this.state.connected)fail('Conecta o actualiza el servicio comercial antes de guardar.');if(mission&&!isManaged(mission))fail('Solo se admiten misiones de este servicio comercial.');
  if(mission&&!this.state.missions.some(x=>x.id===mission.id))fail('La misión ya no está en este servicio comercial.');
  const payload=action==='status'?{status:data.status,completionNotes:data.completionNotes||''}:data;
  return this.execute({action,runId:this.state.runId,requestId:this.uuid(),data:payload,...(mission?{missionId:mission.id,expectedRevision:mission.r1Revision}:{})});
 }
 save(m,f,list,mode){return this.mutate(m?'edit':'create',m,{mission:missionData(f,list),credential:credentialData(mode,f)});}
 async batch(action,id,data={}){if(!this.state.connected)fail('Conecta o actualiza el servicio comercial.');const tag=['tagDelete','tagUpdate'].includes(action),entity=(tag?this.state.tags:this.state.workers).find(x=>x.id===id);if(!entity)fail('No existe en la copia de servicio comercial.');
  let selected=this.state.missions.filter(m=>tag?m.tags.includes(id):m.workerId===id);
  if(action==='settle')selected=selected.filter(m=>m.status==='Completada'&&!m.isPaidToWorker&&m.workerPayUSD>0);
  if(action==='settle'&&!selected.length)fail('No hay saldo pendiente.');
  const payload=action==='workerUpdate'?{workerId:id,name:data.name,active:data.active,...(data.color!==undefined?{color:data.color}:{}),...(data.specialty!==undefined?{specialty:data.specialty}:{})}:action==='tagUpdate'?{tagId:id,name:data.name,color:data.color}:{[tag?'tagId':'workerId']:id,missionVersions:selected.map(m=>({id:m.id,revision:m.r1Revision}))};
  return this.execute({action,runId:this.state.runId,requestId:this.uuid(),expectedRevision:entity.revision,data:payload});
 }
 retry(){const c=this.state.pending||this.state.last;if(!c)fail('No hay una petición anterior.');return this.execute(c);}
 async reveal(m){if(!isManaged(m)||!this.state.connected||this.state.busy||this.state.pending)fail('Actualiza el servicio comercial y resuelve cualquier petición pendiente.');this.emit({busy:true,error:''});try{const r=await this.send({action:'reveal',runId:this.state.runId,missionId:m.id});if(!this.active)return;if(r.status!=='revealed'||!r.credential)fail('Credencial no disponible.');return r.credential;}catch(e){this.emit({error:e.message});throw e;}finally{this.emit({busy:false});}}
}

// Automatic reads only: never replay a mutation or a pending command.
export function startAutoSync(client,{windowTarget=window,documentTarget=document,online=()=>navigator.onLine!==false,intervalMs=30000,setTimer=setTimeout,clearTimer=clearTimeout,now=Date.now}={}){
 let stopped=false,timer=null,running=false,failures=0,nextAllowed=0;
 const visible=()=>documentTarget.visibilityState!=='hidden';
 const cancel=()=>{if(timer!==null)clearTimer(timer);timer=null;};
 function schedule(delay){cancel();if(!stopped&&visible()&&online())timer=setTimer(tick,delay);}
 async function tick(){timer=null;if(stopped||!client.active||running||!visible()||!online())return;
  if(now()<nextAllowed){schedule(nextAllowed-now());return;}
  if(client.state.busy||client.state.pending||client.syncing){schedule(intervalMs);return;}
  running=true;
  try{await client.sync();failures=0;nextAllowed=0;}catch(e){failures++;nextAllowed=now()+Math.max(e?.code==='DB_QUOTA'?900000:0,Math.min(120000,intervalMs*Math.pow(2,Math.min(failures-1,2))));}
  finally{running=false;schedule(Math.max(intervalMs,nextAllowed-now()));}
 }
 const wake=()=>{cancel();if(!stopped&&!running&&visible()&&online())schedule(Math.max(200,nextAllowed-now()));};
 for(const event of ['focus','online','offline'])windowTarget.addEventListener(event,wake);
 documentTarget.addEventListener('visibilitychange',wake);
 void tick();
 return ()=>{stopped=true;cancel();for(const event of ['focus','online','offline'])windowTarget.removeEventListener(event,wake);documentTarget.removeEventListener('visibilitychange',wake);};
}
