import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Navigation } from "@/components/navigation";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <><a href="#main" className="skip-link">Skip to content</a><Navigation name={user.name}/><main className="workspace" id="main">{children}</main></>;
}
