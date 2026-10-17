import {visibleModules,orderedModules} from '@/lib/module-preferences';
import {ModuleReminderPanel} from '@/components/reminder-controls';
import {AccountBoundary} from '@/components/account-boundary';
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Navigation } from "@/components/navigation";
import { AutoSync } from "@/components/auto-sync";
import {ConnectionStatus} from '@/components/connection-status';
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <><a href="#main" className="skip-link">דילוג לתוכן</a><AutoSync/><ConnectionStatus/><AccountBoundary userId={user.id} textScale={user.settings?.textScale??100} reducedMotion={user.settings?.reducedMotion??false}/><Navigation name={user.name} enabled={visibleModules(user.settings)} order={orderedModules(user.settings?.navigationOrder)}/><main key={user.id} className="workspace" id="main">{children}<ModuleReminderPanel/></main></>;
}
