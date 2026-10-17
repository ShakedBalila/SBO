import {requireUser} from '@/lib/auth';
import {SettingsWorkspace} from '@/components/settings-workspace';
export default async function Page(){const user=await requireUser();return <SettingsWorkspace role={user.role}/>;}
