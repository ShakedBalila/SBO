import {db} from '@/lib/db';
import {planContent,nextWorkout,weekDates} from '@/lib/workouts';
import {TransitionLink as Link} from './transition-link';
import {DashboardArt} from './dashboard-art';
export async function WorkoutOverviewCard({userId,today,order=5}:{userId:string;today:string;order?:number}){
 const [plan,completed]=await Promise.all([db.workoutPlan.findFirst({where:{userId,active:true,archived:false}}),db.workoutSession.count({where:{userId,status:'COMPLETED',localDate:{gte:weekDates(today)[0],lte:weekDates(today)[6]}}})]);
 const content=plan?planContent.parse(plan.content):null,sessions=plan?await db.workoutSession.findMany({where:{userId,planId:plan.id},select:{localDate:true,status:true,snapshot:true}}):[],next=content?nextWorkout(content,today,sessions):null;
 return <Link style={{order}} href="/workouts" className="overview-card overview-workouts"><DashboardArt kind="workouts"/><div className="overview-content"><h2>אימונים</h2><strong className="overview-workout-title">{next?.day?.name??'התוכנית שלך'}</strong><p>{next?new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'numeric',timeZone:'UTC'}).format(new Date(next.date)): 'הגדרת תוכנית אימונים'}</p><strong className="workout-week-count">{completed}<small> הושלמו השבוע</small></strong></div></Link>;
}
