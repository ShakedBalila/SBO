import {requireUser} from '@/lib/auth';
import {SettingsWorkspace} from '@/components/settings-workspace';
import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{section:string}>}){const user=await requireUser(),{section}=await params;if(!['profile','account','security','notifications','preferences','privacy','about','admin'].includes(section)||section==='admin'&&user.role!=='admin')notFound();return <SettingsWorkspace key={user.id+section} section={section} role={user.role} reducedMotion={user.settings?.reducedMotion} textScale={user.settings?.textScale}/>;}
