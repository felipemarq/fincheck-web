import * as React from "react";
import {
  IconChartBar,
  IconDashboard,
  IconFolder,
  IconListDetails,
  IconRepeat,
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
  SidebarMenuButton,
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
    title: "Contatos (em desenvolvimento)",
    url: "#",
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
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <div className="flex items-center gap-2 self-center font-medium">
                <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                  <img src={icon} alt="icon" className="h-6 w-6 rounded-md" />
                </div>
                <img src={wordmark} alt="wordmark" className="h-8" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <div className="mt-4 flex items-center gap-2 self-center border-2 font-medium">
                Entidade:
                <EntitySwitcher
                  entities={entities}
                  activeEntityId={selectedEntityId ?? undefined}
                  onChange={handleChangeSelectedEntityId}
                />
              </div>
            </SidebarMenuButton>
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
