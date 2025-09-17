import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "../components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { Outlet, useLocation } from "react-router-dom";

export default function AppLayout() {
  const location = useLocation();
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="floating" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <Outlet key={location.key} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
