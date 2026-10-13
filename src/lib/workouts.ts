import {z} from 'zod';
export const dateOnly=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'תאריך אינו תקין.');
const text=(max:number)=>z.string().trim().max(max);
export const safeVideo=z.string().max(1000).refine(v=>!v||(()=>{try{const u=new URL(v);return u.protocol==='https:'&&['youtube.com','www.youtube.com','youtu.be','vimeo.com','www.vimeo.com'].includes(u.hostname);}catch{return false;}})(),'יש לצרף קישור HTTPS ל־YouTube או Vimeo.');
export const exerciseDetails=z.object({nameEn:text(150).default(''),muscles:text(150).default(''),equipment:text(150).default(''),instructions:text(2000).default(''),caution:text(1000).default(''),videoUrl:safeVideo.default(''),notes:text(2000).default(''),source:text(300).default('')}).strict();
export const prescription=z.object({id:text(80).min(1),exerciseId:text(80).min(1),name:text(150).min(1),targetSets:z.number().int().min(1).max(20),repTargets:z.array(text(40)).max(20),plannedWeightKg:z.number().min(0).max(1000).nullable(),restSeconds:z.number().int().min(0).max(1800),notes:text(2000).default('')}).strict();
export const planContent=z.object({startDate:dateOnly.nullable().default(null),endDate:dateOnly.nullable().default(null),walking:z.boolean().default(false),days:z.array(z.object({id:text(80).min(1),weekday:z.number().int().min(0).max(6),name:text(100).min(1),exercises:z.array(prescription).max(40)}).strict()).min(1).max(14)}).strict().refine(v=>!v.startDate||!v.endDate||v.endDate>=v.startDate,'תאריך סיום מוקדם מתאריך התחלה.').refine(v=>new Set(v.days.map(d=>d.id)).size===v.days.length,'מזהי ימים חייבים להיות ייחודיים.');
export const planInput=z.object({name:text(120).min(1),content:planContent,active:z.boolean().default(false),draft:z.boolean().default(true),archived:z.boolean().default(false)}).strict();
export const performedInput=z.array(z.object({exerciseId:text(80).min(1),name:text(150).min(1),sets:z.array(z.object({id:text(80).min(1),reps:z.number().int().min(0).max(1000).nullable(),weightKg:z.number().min(0).max(1000).nullable(),completed:z.boolean(),warmup:z.boolean().default(false),rir:z.number().min(0).max(10).nullable().default(null),notes:text(500).default('')}).strict()).max(40)}).strict()).max(50);
export type PlanContent=z.infer<typeof planContent>;
export type Prescription=z.infer<typeof prescription>;
export type Performed=z.infer<typeof performedInput>;
export const weekdays=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
export function shiftDate(date:string,days:number){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function weekDates(date:string){return Array.from({length:7},(_,i)=>shiftDate(date,i-new Date(date+'T00:00:00Z').getUTCDay()));}
export function prescribedDay(content:PlanContent,date:string){if(content.startDate&&date<content.startDate||content.endDate&&date>content.endDate)return null;return content.days.find(d=>d.weekday===new Date(date+'T00:00:00Z').getUTCDay())??null;}
export function nextWorkout(content:PlanContent,today:string,sessions:Array<{localDate:string;status:string;snapshot:unknown}>){
 for(let i=0;i<14;i++){const date=shiftDate(today,i),record=sessions.find(s=>s.localDate===date),snapshot=record?.snapshot as {day?:PlanContent['days'][number]}|undefined;
  if(record&&['COMPLETED','SKIPPED'].includes(record.status))continue;
  if(record&&snapshot?.day)return {date,day:snapshot.day};
  if(sessions.some(s=>(s.snapshot as {originalDate?:string})?.originalDate===date&&s.localDate!==date))continue;
  const day=prescribedDay(content,date);if(day)return {date,day};
 }return null;
}
export const builtInExercises=[
 ['chest','לחיצת חזה במכונה','Chest press','חזה','מכונת לחיצת חזה'],
 ['pulldown','משיכה עליונה','Lat pulldown','גב','פולי עליון'],
 ['incline','לחיצת משקולות בשיפוע','Incline dumbbell press','חזה','משקולות וספסל'],
 ['row','חתירה בישיבה','Seated cable row','גב','כבל חתירה'],
 ['lateral','הרחקת כתפיים','Lateral raise','כתפיים','משקולות'],
 ['legpress','לחיצת רגליים','Leg press','רגליים','מכונת לחיצת רגליים'],
 ['rdl','דדליפט רומני','Romanian deadlift','רגליים','מוט או משקולות'],
 ['legcurl','כפיפת ברכיים','Leg curl','ירך אחורית','מכונת כפיפת ברכיים'],
 ['split','סקוואט מפוצל','Split squat','רגליים','משקל גוף או משקולות'],
 ['calf','הרמת עקבים','Calf raise','שוקיים','משקל גוף או מכונה'],
 ['plank','פלאנק','Plank','ליבה','מזרן'],
 ['squat','סקוואט','Squat','רגליים','משקל גוף או מוט']
].map(([id,name,nameEn,muscles,equipment])=>({id:'builtin:'+id,name,favorite:false,hasImage:false,details:{nameEn,muscles,equipment,instructions:'כוון את הציוד למבנה הגוף. בצע תנועה מבוקרת בטווח נוח ובקש הדגמה ממדריך לפני שימוש ראשון.',caution:'עצור במקרה של כאב או סחרחורת. בחר עומס שמתאים ליכולת שלך.',videoUrl:'',notes:'',source:'דוגמאות תרגילים מהאפיון · ההנחיות כלליות'}}));
export function starterPlan(){
 const day=(id:string,weekday:number,name:string,keys:string[])=>({id,weekday,name,exercises:keys.map(key=>{const e=builtInExercises.find(e=>e.id==='builtin:'+key)!;return {id:id+'-'+key,exerciseId:e.id,name:e.name,targetSets:3,repTargets:['8–12','8–12','8–12'],plannedWeightKg:null,restSeconds:['lateral','calf','legcurl'].includes(key)?60:120,notes:'דוגמה מוצעת לבדיקה · לא מרשם אישי שאושר'};})});
 const lower=day('lower',2,'רגליים וליבה',['legpress','rdl','legcurl','split','calf','plank']);lower.exercises.find(e=>e.exerciseId==='builtin:plank')!.repTargets=['זמן לבחירה','זמן לבחירה','זמן לבחירה'];
 return {name:'טיוטה מהשיחה — דרושה בדיקה',active:false,draft:true,archived:false,content:{startDate:null,endDate:null,walking:false,days:[day('upper',0,'פלג גוף עליון',['chest','pulldown','incline','row','lateral']),lower,day('full',4,'כל הגוף',['squat','chest','row','lateral'])]}};
}
export function initialPerformed(day:PlanContent['days'][number]):Performed{return day.exercises.map(e=>({exerciseId:e.id,name:e.name,sets:Array.from({length:e.targetSets},(_,i)=>({id:e.id+'-'+i,reps:null,weightKg:null,completed:false,warmup:false,rir:null,notes:''}))}));}
