import {requireUser} from '@/lib/auth';
import {NotificationsWorkspace} from '@/components/notifications-workspace';
export default async function NotificationsPage(){const user=await requireUser(),s=user.settings;return <NotificationsWorkspace water={s?.waterReminderEnabled??false} vehicle={s?.vehicleReminderEnabled??false} creatine={s?.creatineReminderEnabled??false}/>;}
