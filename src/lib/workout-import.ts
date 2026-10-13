import {createHash} from 'node:crypto';
import {z} from 'zod';
import {db} from './db';
import {HttpError} from './http';
import {audit} from './audit';
import {workoutData} from './workout-data';
import {dateOnly,planContent,planInput,performedInput,exerciseDetails,weekdays,starterPlan} from './workouts';
function safeArchive(bytes:Buffer){let total=0,count=0;for(let i=0;i+46<bytes.length;i++){if(bytes.readUInt32LE(i)===0x02014b50){total+=bytes.readUInt32LE(i+24);count++;if(total>25*1024*1024||count>500)throw new HttpError(400,'הקובץ מכיל יותר מדי מידע דחוס.');}}}
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function parseText(text:string,name:string){
 const days:z.infer<typeof planContent>['days']=[];let current:typeof days[number]|undefined;
 for(const [index,line] of text.split(/\r?\n/).entries()){
 const trimmed=line.trim();if(!trimmed)continue;
 const weekday=weekdays.findIndex(d=>trimmed.includes(d)),english=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].findIndex(d=>new RegExp(d,'i').test(trimmed)),day=weekday>=0?weekday:english;
 if(day>=0){current={id:'import-day-'+index,weekday:day,name:trimmed.slice(0,100),exercises:[]};days.push(current);continue;}
 const cols=trimmed.split(/[,;\t]/).map(x=>x.trim()),match=trimmed.match(/^(.+?)\s+(\d{1,2})\s*[x×]\s*(\d+(?:\s*[-–]\s*\d+)?)(.*)$/);
 if(!match&&!(cols.length>=3&&/^\d{1,2}$/.test(cols[1])))continue;
 if(!current){current={id:'import-day-default',weekday:0,name:'יום אימון — יש לבדוק',exercises:[]};days.push(current);}
 const title=match?match[1]:cols[0],sets=Number(match?match[2]:cols[1]),reps=match?match[3]:cols[2],tail=match?match[4]:'',weight=match?tail.match(/(\d+(?:\.\d+)?)\s*(?:kg|ק[״"]?ג)/i)?.[1]:cols[3],rest=match?tail.match(/(\d+)\s*(?:s|sec|שניות)/i)?.[1]:cols[4];
 current.exercises.push({id:'import-'+index,exerciseId:'import:'+index,name:title.slice(0,150),targetSets:sets,repTargets:Array.from({length:sets},()=>reps),plannedWeightKg:weight&&Number.isFinite(Number(weight))?Number(weight):null,restSeconds:rest&&Number.isFinite(Number(rest))?Number(rest):0,notes:'יובא מהקובץ · יש לבדוק תרגיל, יחידות ומנוחה'});
 }
 if(!days.some(d=>d.exercises.length))throw new HttpError(400,'לא זוהו שורות תרגילים. נדרש טקסט כמו: תרגיל,סטים,חזרות,משקל,מנוחה. PDF סרוק דורש תמלול; אין OCR זמין.');
 return planInput.parse({name:name.replace(/\.[^.]+$/,'').slice(0,120),draft:true,active:false,archived:false,content:{startDate:null,endDate:null,walking:false,days}});
}
export async function previewWorkoutImport(file:File){
 const bytes=Buffer.from(await file.arrayBuffer()),ext=file.name.split('.').at(-1)?.toLowerCase();let text='';
 try{
 if(ext==='json'){const parsed=JSON.parse(bytes.toString('utf8'));if(parsed.schemaVersion===1){if(parsed.units!=='kg')throw new HttpError(400,'גיבוי האימונים חייב להשתמש ביחידות קילוגרם. יש להמיר יחידות לפני הייבוא.');const plans=z.array(z.object({name:z.string(),content:planContent})).max(50).parse(parsed.plans);if(!plans.length)throw new Error();return {plans:plans.map(p=>({...p,active:false,draft:true,archived:false})),backup:parsed,warnings:['ייבוא גיבוי ייצור עותקים נפרדים וישמור ביצועים בנפרד מתכנון. תמונות פרטיות יש לצרף מחדש.']};}return {plans:[planInput.parse(parsed)],warnings:['יש לבדוק את כל השדות לפני אישור.']};}
 if(ext==='pdf'){if(bytes.subarray(0,5).toString()!=='%PDF-')throw new Error();const {getData,CanvasFactory}=await import('pdf-parse/worker');const {PDFParse}=await import('pdf-parse');PDFParse.setWorker(getData());const parser=new PDFParse({data:bytes,CanvasFactory});try{text=(await parser.getText({first:30})).text;}finally{await parser.destroy();}}
 else if(ext==='docx'){safeArchive(bytes);const mammoth=await import('mammoth');text=(await mammoth.extractRawText({buffer:bytes})).value;}
 else if(ext==='xlsx'){safeArchive(bytes);const {default:ExcelJS}=await import('exceljs');const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes as never);for(const sheet of workbook.worksheets){text+='\n'+sheet.name+'\n';if(sheet.rowCount>1000)throw new Error();sheet.eachRow(row=>{text+=(row.values as unknown[]).slice(1).map(v=>typeof v==='object'&&v!==null?'':String(v??'')).join(',')+'\n';});}}
 else if(ext==='csv')text=bytes.toString('utf8');
 else throw new HttpError(400,'ניתן לייבא PDF, DOCX, XLSX, CSV או JSON.');
 if(text.length>100000)throw new HttpError(400,'התוכנית ארוכה מדי.');
 return {plans:[parseText(text,file.name)],warnings:['תצוגה מקדימה בלבד. שדות שלא זוהו נשארו ריקים או מסומנים לבדיקה. יש לאמת ימים, סטים, חזרות ומשקל לפני שמירה.'],extractedText:text.slice(0,8000)};
 }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'לא ניתן לקרוא את תוכנית האימון. בדוק את מבנה הקובץ; לא נשמרו רשומות.');}
}
const restoreSession=z.object({id:z.string(),planId:z.string(),dayId:z.string().max(80),localDate:dateOnly,status:z.enum(['SCHEDULED','IN_PROGRESS','COMPLETED','SKIPPED','RESCHEDULED']),snapshot:z.object({planName:z.string().max(120),version:z.number().int(),originalDate:dateOnly.optional(),day:planContent.shape.days.element}),performed:performedInput,startedAt:z.iso.datetime().nullable(),endedAt:z.iso.datetime().nullable(),pausedAt:z.iso.datetime().nullable().optional(),pausedSeconds:z.number().int().min(0).default(0),notes:z.string().max(2000).default('')});
export async function confirmWorkoutImport(userId:string,body:unknown){
 const input=z.object({confirmed:z.literal(true),plans:z.array(planInput).min(1).max(50),backup:z.unknown().optional()}).strict().parse(body);
 const backup=input.backup?z.object({schemaVersion:z.literal(1),units:z.literal('kg'),timezone:z.string().max(80),plans:z.array(z.object({id:z.string(),name:z.string(),content:planContent})).max(50),sessions:z.array(restoreSession).max(2000),exercises:z.array(z.object({id:z.string(),name:z.string().max(150),details:exerciseDetails,favorite:z.boolean().default(false)})).max(500)}).parse(input.backup):null;
 const importKey=hash({plans:input.plans,backup});
 const duplicate=await db.workoutPlan.findFirst({where:{userId,importKey}});if(duplicate)return {ok:true,duplicate:true,id:duplicate.id};
 const result=await db.$transaction(async tx=>{
 const exerciseMap=new Map<string,string>();
 if(backup)for(const e of backup.exercises){const row=await tx.workoutExercise.create({data:{userId,name:e.name,details:e.details,favorite:e.favorite}});exerciseMap.set(e.id,row.id);}
 const planMap=new Map<string,string>(),ids:string[]=[];
 for(const [i,p] of input.plans.entries()){const content=structuredClone(p.content);for(const d of content.days)for(const e of d.exercises)e.exerciseId=exerciseMap.get(e.exerciseId)??e.exerciseId;const saved=await tx.workoutPlan.create({data:{...p,active:false,draft:true,userId,content,importKey:i===0?importKey:hash({importKey,i})}});ids.push(saved.id);if(backup?.plans[i])planMap.set(backup.plans[i].id,saved.id);}
 if(backup)for(const row of backup.sessions){const planId=planMap.get(row.planId);if(!planId)throw new HttpError(400,'גיבוי מכיל אימון ללא תוכנית.');await tx.workoutSession.create({data:{userId,planId,dayId:row.dayId,localDate:row.localDate,status:row.status==='IN_PROGRESS'?'SCHEDULED':row.status,snapshot:row.snapshot,performed:row.performed,startedAt:row.startedAt?new Date(row.startedAt):null,endedAt:row.endedAt?new Date(row.endedAt):null,pausedSeconds:row.pausedSeconds,notes:row.notes,importKey:hash({importKey,id:row.id})}});}
 return ids;
 },{timeout:20000});
 await audit({userId,action:'WORKOUT_IMPORT_CONFIRMED',entityType:'WORKOUT_PLAN',metadata:{count:result.length}});
 return {ok:true,ids:result};
}
export async function exportWorkouts(userId:string,timezone:string,format:string){
 const data=await workoutData(userId,timezone),backup={schemaVersion:1,timezone,units:'kg',plans:data.plans,sessions:data.sessions,exercises:data.exercises.filter(e=>!e.id.startsWith('builtin:'))};
 await audit({userId,action:'WORKOUT_EXPORTED',entityType:'WORKOUT'});
 const headers={'Cache-Control':'private, no-store'};
 if(format==='csv'||format==='xlsx'){
 const rows:unknown[][]=[['kind','date','program','day','exercise','set','targetReps','targetWeightKg','actualReps','actualWeightKg','completed']];
 for(const p of data.plans)for(const day of p.content.days)for(const e of day.exercises)for(let i=0;i<e.targetSets;i++)rows.push(['PLAN','',p.name,day.name,e.name,i+1,e.repTargets[i]??'',e.plannedWeightKg??'','','','']);
 for(const s of data.sessions){const snapshot=s.snapshot as {planName:string;day:{name:string;exercises:Array<{id:string;repTargets:string[];plannedWeightKg:number|null}>}};for(const e of performedInput.parse(s.performed))for(const [i,set] of e.sets.entries()){const target=snapshot.day.exercises.find(x=>x.id===e.exerciseId);rows.push(['ACTUAL',s.localDate,snapshot.planName,snapshot.day.name,e.name,i+1,target?.repTargets[i]??'',target?.plannedWeightKg??'',set.reps??'',set.weightKg??'',set.completed]);}}
 if(format==='xlsx'){const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();book.addWorksheet('Workouts').addRows(rows);return new Response(new Uint8Array(await book.xlsx.writeBuffer()),{headers:{...headers,'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="SBO-workouts.xlsx"'}});}
 const csv=(v:unknown)=>{let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return new Response('\uFEFF'+rows.map(r=>r.map(csv).join(',')).join('\n'),{headers:{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="SBO-workouts.csv"'}});
 }
 return new Response(JSON.stringify(backup,null,2),{headers:{...headers,'Content-Type':'application/json','Content-Disposition':'attachment; filename="SBO-workouts.json"'}});
}
