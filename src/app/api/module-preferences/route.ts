import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {accountSession} from '@/lib/account-security';
import {apiError,checkOrigin,jsonBody,HttpError} from '@/lib/http';
import {moduleIds,visibleModules,orderedModules} from '@/lib/module-preferences';
import {reminderRows} from '@/lib/reminder-controls';
const moduleId=z.enum(['tasks','work','water','nutrition','car','workouts']);
export async function GET(){try{const {user}=await accountSession();return NextResponse.json({enabled:visibleModules(user.settings),dashboardOrder:orderedModules(user.settings?.dashboardOrder),navigationOrder:orderedModules(user.settings?.navigationOrder),pausedModules:user.settings?.pausedModules??[],reminders:(await reminderRows(user.id)).rows.filter(r=>r.enabled||r.pausedByHide).map(r=>({module:r.module,paused:r.pausedByHide}))},{headers:{'Cache-Control':'no-store'}});}catch(error){return apiError(error);}}
export async function POST(request:Request){try{
 checkOrigin(request);const {user}=await accountSession(),input=z.discriminatedUnion('action',[
  z.object({action:z.literal('visibility'),module:moduleId,enabled:z.boolean(),reminders:z.enum(['keep','pause','resume','leave']).optional()}).strict(),
  z.object({action:z.literal('order'),target:z.enum(['dashboardOrder','navigationOrder']),order:z.array(moduleId).length(6)}).strict(),
  z.object({action:z.literal('onboarding'),modules:z.array(moduleId).max(6)}).strict()
 ]).parse(await jsonBody(request));
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
  const reminders=await reminderRows(user.id,tx);
  const settings=await tx.userSettings.findUnique({where:{userId:user.id}});
  if(input.action==='order'){if(new Set(input.order).size!==moduleIds.length)throw new HttpError(400,'כל מודול צריך להופיע פעם אחת.');await tx.userSettings.upsert({where:{userId:user.id},create:{userId:user.id,[input.target]:input.order},update:{[input.target]:input.order}});return;}
  if(input.action==='onboarding'){if(settings?.onboardingStatus==='complete')throw new HttpError(409,'ההיכרות כבר הושלמה. אפשר לערוך במנהל המודולים.');const data={enabledModules:[...new Set(input.modules)],modulePreferencesInitialized:true,onboardingStatus:'complete'};await tx.userSettings.upsert({where:{userId:user.id},create:{userId:user.id,...data},update:data});return;}
  const active=visibleModules(settings),relevant=reminders.rows.filter(r=>r.module===input.module),paused=settings?.pausedModules??[];
  if(!input.enabled&&relevant.some(r=>r.enabled)&&!['keep','pause'].includes(input.reminders??''))throw new HttpError(409,'יש לבחור אם לשמור או להשהות את התזכורות.');
  if(input.enabled&&relevant.some(r=>r.pausedByHide)&&!['resume','leave'].includes(input.reminders??''))throw new HttpError(409,'יש לבחור אם להחזיר את התזכורות שהושהו.');
  if(!input.enabled&&input.reminders==='pause'){for(const r of relevant.filter(r=>r.enabled))await tx.reminderOverride.upsert({where:{userId_source_sourceId:{userId:user.id,source:r.source,sourceId:r.sourceId}},create:{userId:user.id,source:r.source,sourceId:r.sourceId,enabled:false,pauseReason:'module_hidden'},update:{enabled:false,pauseReason:'module_hidden'}});}
  if(input.enabled&&input.reminders==='resume'){for(const r of relevant.filter(r=>r.pausedByHide))await tx.reminderOverride.updateMany({where:{userId:user.id,source:r.source,sourceId:r.sourceId,pauseReason:'module_hidden'},data:{enabled:true,pauseReason:null,resumedAt:new Date()}});}
  const data={modulePreferencesInitialized:true,enabledModules:input.enabled?[...new Set([...active,input.module])]:active.filter(id=>id!==input.module),pausedModules:input.reminders==='pause'?[...new Set([...paused,input.module])]:input.reminders==='resume'?paused.filter(id=>id!==input.module):paused,...(input.enabled&&!active.includes(input.module)?{dashboardOrder:[...orderedModules(settings?.dashboardOrder).filter(id=>id!==input.module),input.module],navigationOrder:[...orderedModules(settings?.navigationOrder).filter(id=>id!==input.module),input.module]}:{})};
  await tx.userSettings.upsert({where:{userId:user.id},create:{userId:user.id,...data},update:data});
 });return NextResponse.json({ok:true});
}catch(error){return apiError(error);}}
