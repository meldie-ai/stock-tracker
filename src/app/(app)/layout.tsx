import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLastStockUpdateTime } from "@/lib/data";
import NavBar from "@/components/NavBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lastStockUpdate = await getLastStockUpdateTime();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <NavBar
        username={user.username}
        role={user.role}
        initialLastUpdated={lastStockUpdate ? lastStockUpdate.toISOString() : null}
      />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
