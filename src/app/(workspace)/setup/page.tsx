import {requireUser} from '@/lib/auth';
import {SetupWorkspace} from '@/components/onboarding';
export default async function SetupPage(){const user=await requireUser();return <SetupWorkspace status={user.settings?.onboardingStatus??'pending'}/>;}
