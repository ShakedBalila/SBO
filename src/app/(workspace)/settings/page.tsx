import {requireUser} from '@/lib/auth';
import {SettingsWorkspace} from '@/components/settings-workspace';
export default async function SettingsPage(){const user=await requireUser();return <SettingsWorkspace name={user.name} email={user.email} timezone={user.settings?.timezone??'Asia/Jerusalem'} currency={user.settings?.currency??'ILS'}/>;}
