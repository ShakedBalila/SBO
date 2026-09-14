function localParts(date:Date,timeZone:string){
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
}

function localInstant(date:string,time:string,timeZone:string){
  const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number),wanted=Date.UTC(year,month-1,day,hour,minute);
  let value=wanted;
  for(let attempt=0;attempt<3;attempt++){const shown=localParts(new Date(value),timeZone);value+=wanted-Date.UTC(Number(shown.year),Number(shown.month)-1,Number(shown.day),Number(shown.hour),Number(shown.minute));}
  return value;
}

function shift(value:string,days:number){const date=new Date(`${value}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}

export function vehicleReminderDue(now:Date,expiryDate:string,reminderDays:number,reminderTime:string,timeZone:string){
  const reminderDate=shift(expiryDate,-reminderDays),notifyAt=localInstant(reminderDate,reminderTime,timeZone),current=now.getTime();
  return current>=notifyAt&&current-notifyAt<120000;
}
