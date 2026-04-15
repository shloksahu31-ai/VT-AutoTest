import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface dark:bg-slate-950 font-sans antialiased text-on-surface dark:text-slate-200">
      <Sidebar />
      <div className="ml-[192px] min-h-screen flex flex-col transition-all duration-300">
        <Topbar />
        <main className="flex-1 pt-24 px-8 pb-12 overflow-x-hidden animate-page-in">
          {children}
        </main>
      </div>
    </div>
  );
}
