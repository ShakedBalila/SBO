export type NotificationSchedule={date:string;time:string;timeZone:string;leadMinutes?:number};

export function notificationLocalParts(date:Date,timeZone:string){
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
}

export function localClockInstant(date:string,time:string,timeZone:string){
  const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number),wanted=Date.UTC(year,month-1,day,hour,minute);
  let value=wanted;
  for(let attempt=0;attempt<4;attempt++){
    const shown=notificationLocalParts(new Date(value),timeZone);
    value+=wanted-Date.UTC(Number(shown.year),Number(shown.month)-1,Number(shown.day),Number(shown.hour),Number(shown.minute));
  }
  const shown=notificationLocalParts(new Date(value),timeZone);
  return shown.year===String(year)&&shown.month===String(month).padStart(2,'0')&&shown.day===String(day).padStart(2,'0')&&shown.hour===String(hour).padStart(2,'0')&&shown.minute===String(minute).padStart(2,'0')?new Date(value):new Date(NaN);
}

export function scheduledNotification({date,time,timeZone,leadMinutes=0}:NotificationSchedule){
  return new Date(localClockInstant(date,time,timeZone).getTime()-leadMinutes*60000);
}

export function notificationIsDue(now:Date,scheduledAt:Date,graceMs=120000){
  const lateBy=now.getTime()-scheduledAt.getTime();
  return lateBy>=0&&lateBy<graceMs;
}

export function notificationDiagnosticLocal(date:string,time:string,timeZone:string,leadMinutes=0){
  const scheduledAt=scheduledNotification({date,time,timeZone,leadMinutes});
  if(Number.isNaN(scheduledAt.valueOf()))return `${date}T${time}[${timeZone}]:invalid`;
  const parts=notificationLocalParts(scheduledAt,timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}[${timeZone}]`;
}
