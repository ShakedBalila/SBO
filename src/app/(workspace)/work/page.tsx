import {requireUser} from '@/lib/auth';
import {workData} from '@/lib/work-data';
import {WorkWorkspace} from '@/components/work-workspace';
export default async function WorkPage({searchParams}:{searchParams:Promise<{employment?:string}>}){const user=await requireUser();const query=await searchParams;return <WorkWorkspace key={user.id+(query.employment??'')} initial={await workData(user.id,user.settings?.timezone??'Asia/Jerusalem',query.employment)}/>;}
