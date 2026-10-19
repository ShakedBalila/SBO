import {requireUser} from '@/lib/auth';
import {SettingsWorkspace} from '@/components/settings-workspace';
import {notFound,redirect} from 'next/navigation';
export default async function Page({params}:{params:Promise<{section:string}>}){const user=await requireUser(),{section}=await params;if(section==='notifications')redirect('/notifications');if(!['profile','account','security','preferences','privacy','about','admin'].includes(section)||section==='admin'&&user.role!=='admin')notFound();return <SettingsWorkspace key={user.id+section} section={section} role={user.role} reducedMotion={user.settings?.reducedMotion} textScale={user.settings?.textScale}/>;}
