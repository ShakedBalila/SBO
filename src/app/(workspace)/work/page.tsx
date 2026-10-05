import {requireUser} from '@/lib/auth';
import {workData} from '@/lib/work-data';
import {WorkWorkspace} from '@/components/work-workspace';
export default async function WorkPage(){const user=await requireUser();return <WorkWorkspace initial={await workData(user.id,user.settings?.timezone??'Asia/Jerusalem')}/>;}
