export function clockMinutes(value:string){const [hour,minute]=value.split(':').map(Number);return hour*60+minute;}

export function waterTimeMarks(startTime:string,endTime:string,intervalHours:2|4){
  const start=clockMinutes(startTime),end=clockMinutes(endTime),marks:number[]=[];
  for(let minute=start;minute<=end;minute+=intervalHours*60)marks.push(minute);
  if(marks.at(-1)!==end)marks.push(end);
  return marks;
}

export function expectedWaterAt(goal:number,currentMinute:number,startTime:string,endTime:string){
  const start=clockMinutes(startTime),end=clockMinutes(endTime);
  if(currentMinute<=start)return 0;
  if(currentMinute>=end)return goal;
  return goal*(currentMinute-start)/(end-start);
}
