import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="pl-64 flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 p-6 bg-slate-50/60">
          {children}
        </main>
      </div>
    </div>
  );
}
