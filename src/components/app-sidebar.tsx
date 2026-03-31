import * as React from "react";
import {
  IconChartBar,
  IconDashboard,
  IconFolder,
  IconListDetails,
  IconRepeat,
  IconReceipt2,
  IconUsers,
} from "@tabler/icons-react";
import wordmark from "@/assets/moneystack_wordmark.png";
import icon from "@/assets/moneystack_maskable_512.png";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/view/components/ui/sidebar";
import { useAuth } from "@/app/hooks/useAuth";
import { EntitySwitcher } from "./entity-switcher";
import { Building, SquareUser } from "lucide-react";

const navMain = [
  {
    title: "Dashboard",
    url: "/",
    icon: IconDashboard,
  },
  {
    title: "Recorrências",
    url: "/recurring-transactions",
    icon: IconRepeat,
  },
  {
    title: "Cartões",
    url: "/credit-cards",
    icon: IconChartBar,
  },
  {
    title: "Impostos",
    url: "/taxes",
    icon: IconReceipt2,
  },
  {
    title: "Relatórios (em desenvolvimento)",
    url: "#",
    icon: IconListDetails,
  },
  {
    title: "Investimentos (em desenvolvimento)",
    url: "#",
    icon: IconFolder,
  },
  {
    title: "Contatos",
    url: "/contacts",
    icon: IconUsers,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, signout, handleChangeSelectedEntityId, selectedEntityId } =
    useAuth();

  const entities =
    user?.entities.map((entity) => ({
      ...entity,
      logo: entity.type === "PF" ? SquareUser : Building,
    })) ?? [];

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5 font-medium">
              <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                <img src={icon} alt="icon" className="h-6 w-6 rounded-md" />
              </div>
              <img src={wordmark} alt="wordmark" className="h-8" />
            </div>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <div className="mt-4 space-y-2 px-2">
              <div className="text-sidebar-foreground/70 text-xs font-medium uppercase tracking-wide">
                Entidade
              </div>
              <EntitySwitcher
                entities={entities}
                activeEntityId={selectedEntityId ?? undefined}
                onChange={handleChangeSelectedEntityId}
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user!} onLogout={signout} />
      </SidebarFooter>
    </Sidebar>
  );
}
