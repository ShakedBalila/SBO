import {requireUser} from '@/lib/auth';
import {ModuleManager} from '@/components/module-manager';
export default async function Page(){const user=await requireUser();return <div className='utility-workspace utility-card'><ModuleManager onboarding={user.settings?.onboardingStatus!=='complete'}/></div>;}
