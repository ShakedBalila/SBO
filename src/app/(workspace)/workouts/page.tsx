import {requireUser} from '@/lib/auth';
import {workoutData} from '@/lib/workout-data';
import {moduleData} from '@/lib/module-data';
import {WorkoutsWorkspace} from '@/components/workouts-workspace';
export default async function WorkoutsPage(){const user=await requireUser(),zone=user.settings?.timezone??'Asia/Jerusalem';const [data,summary]=await Promise.all([workoutData(user.id,zone),moduleData(user.id,zone)]);return <WorkoutsWorkspace initial={JSON.parse(JSON.stringify(data))} nutrition={{calories:summary.calories,proteinG:summary.proteinG,calorieGoal:summary.settings?.calorieGoal??null,proteinGoal:summary.settings?.proteinGoalG??null}} creatine={{enabled:summary.settings?.creatineReminderEnabled??false,time:user.settings?.creatineReminderTime??'09:00',dosage:user.settings?.creatineDosageText??''}}/>;}
