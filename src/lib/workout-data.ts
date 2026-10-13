import {db} from './db';
import {todayIn} from './tasks';
import {builtInExercises,planContent} from './workouts';
export async function workoutData(userId:string,timezone:string){
 const [plans,sessions,exercises,links,tasks,events]=await Promise.all([
 db.workoutPlan.findMany({where:{userId},orderBy:{updatedAt:'desc'}}),
 db.workoutSession.findMany({where:{userId},orderBy:{localDate:'desc'}}),
 db.workoutExercise.findMany({where:{userId},select:{id:true,name:true,details:true,favorite:true,imageMime:true}}),
 db.workoutLink.findMany({where:{userId}}),
 db.task.findMany({where:{userId,deletedAt:null},select:{id:true,title:true,startDate:true,recurrence:true,recurrenceDays:true,showOnCalendar:true}}),
 db.calendarEvent.findMany({where:{userId},select:{id:true,title:true,date:true,recurrence:true,recurrenceDays:true}})
 ]);
 return {today:todayIn(timezone),timezone,plans:plans.map(p=>({...p,content:planContent.parse(p.content)})),sessions,exercises:[...builtInExercises,...exercises.map(({imageMime,...e})=>({...e,hasImage:!!imageMime}))],links,
 candidates:[...tasks.filter(t=>/אימון|חדר כושר|workout|gym/i.test(t.title)).map(t=>({id:t.id,kind:'task',title:t.title,date:t.startDate?.toISOString().slice(0,10)??null,recurrence:t.recurrence,recurrenceDays:t.recurrenceDays})),...events.filter(t=>/אימון|חדר כושר|workout|gym/i.test(t.title)).map(t=>({id:t.id,kind:'event',title:t.title,date:t.date.toISOString().slice(0,10),recurrence:t.recurrence,recurrenceDays:t.recurrenceDays}))]};
}
