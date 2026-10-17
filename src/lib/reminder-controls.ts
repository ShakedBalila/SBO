import {db} from './db';
export async function reminderRows(userId:string,client:Pick<typeof db,"userSettings"|"task"|"calendarEvent"|"vehiclePolicy"|"vehicleReminder"|"vehicleExpense"|"reminderOverride"|"workoutLink">=db){
 const [settings,tasks,events,policies,tests,services,overrides,links]=await Promise.all([
  client.userSettings.findUnique({where:{userId}}),client.task.findMany({where:{userId,deletedAt:null,reminderMinutes:{not:null},status:{notIn:['DONE','CANCELLED']}}}),client.calendarEvent.findMany({where:{userId,reminderMinutes:{not:null}}}),
  client.vehiclePolicy.findMany({where:{userId,vehicle:{archivedAt:null},reminderDays:{not:null}},include:{vehicle:{select:{name:true,licensePlate:true}}}}),client.vehicleReminder.findMany({where:{userId,vehicle:{archivedAt:null},type:'Test',reminderDays:{not:null}},include:{vehicle:{select:{name:true,licensePlate:true}}}}),client.vehicleExpense.findMany({where:{userId,vehicle:{archivedAt:null},nextServiceDate:{not:null},reminderDays:{not:null}},include:{vehicle:{select:{name:true,licensePlate:true}}}}),client.reminderOverride.findMany({where:{userId}}),client.workoutLink.findMany({where:{userId,hidden:true}})
 ]);
 const rows=[
  {source:'water',sourceId:userId,module:'water',title:'תזכורת מים',time:settings?.waterReminderStart??'08:00',end:settings?.waterReminderEnd??'16:00',interval:settings?.waterReminderIntervalMinutes??60,enabled:settings?.waterReminderEnabled??false,lead:0,href:'/water'},
  {source:'creatine',sourceId:userId,module:'workouts',title:'קראטין',time:settings?.creatineReminderTime??'09:00',enabled:settings?.creatineReminderEnabled??false,lead:0,href:'/workouts#creatine'},
  ...tasks.map(t=>({source:'task',sourceId:t.id,module:links.some(l=>l.sourceKind==='task'&&l.sourceId===t.id)?'workouts':'tasks',title:t.title,time:t.startTime??'',enabled:true,lead:t.reminderMinutes??0,href:'/tasks',detail:t.recurrence})),
  ...events.map(t=>({source:'event',sourceId:t.id,module:links.some(l=>l.sourceKind==='event'&&l.sourceId===t.id)?'workouts':'tasks',title:t.title,time:t.time??'',enabled:true,lead:t.reminderMinutes??0,href:'/tasks',detail:t.recurrence})),
  ...policies.map(t=>({source:'policy',sourceId:t.id,module:'car',title:`ביטוח ${t.type==='Mandatory'?'חובה':t.type==='Comprehensive'?'מקיף':'צד ג׳'} · ${t.vehicle.licensePlate||t.vehicle.name}`,time:t.reminderTime,enabled:settings?.vehicleReminderEnabled??false,lead:t.reminderDays??0,href:'/car',detail:t.endDate.toISOString().slice(0,10)})),
  ...tests.map(t=>({source:'test',sourceId:t.id,module:'car',title:`טסט · ${t.vehicle.licensePlate||t.vehicle.name}`,time:t.reminderTime,enabled:settings?.vehicleReminderEnabled??false,lead:t.reminderDays??0,href:'/car',detail:t.expiryDate?.toISOString().slice(0,10)})),
  ...services.map(t=>({source:'service',sourceId:t.id,module:'car',title:`טיפול · ${t.vehicle.licensePlate||t.vehicle.name}`,time:t.reminderTime,enabled:settings?.vehicleReminderEnabled??false,lead:t.reminderDays??0,href:'/car',detail:t.nextServiceDate?.toISOString().slice(0,10)}))
 ].map(row=>{const override=overrides.find(o=>o.source===row.source&&o.sourceId===row.sourceId);return {...row,enabled:row.enabled&&(override?.enabled??true),pausedByHide:override?.pauseReason==='module_hidden'};});
 return {enabled:settings?.notificationsEnabled??true,rows};
}
