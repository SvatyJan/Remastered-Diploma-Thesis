import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
