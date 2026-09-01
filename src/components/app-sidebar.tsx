import * as React from "react";
import {
  IconLayoutDashboard,
  IconClipboardList,
  IconListDetails,
  IconUsers,
  IconBox,
  IconCash,
  IconShoppingCart,
  IconCalculator,
  IconFileInvoice,
  IconCashBanknote,
  IconUserShield,
  IconBuildingStore,
} from "@tabler/icons-react";
import { Building, SquareUser } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { OrganizationPermission } from "@/app/entities/OrganizationAccess";
import { useAuth } from "@/app/hooks/useAuth";
import { PlatformBrand } from "@/components/PlatformBrand";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { EntityModal } from "@/view/modals/EntityModal";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/view/components/ui/sidebar";
import { EntitySwitcher } from "./entity-switcher";

const navMain: Array<{
  title: string;
  url: string;
  icon: typeof IconLayoutDashboard;
  permission: OrganizationPermission;
}> = [
  {
    title: "Painel",
    url: "/dashboard",
    icon: IconLayoutDashboard,
    permission: "dashboard.read",
  },
  {
    title: "Cotacoes",
    url: "/quotations",
    icon: IconFileInvoice,
    permission: "quotations.read",
  },
  {
    title: "Ordens de compra",
    url: "/orders",
    icon: IconClipboardList,
    permission: "orders.read",
  },
  {
    title: "Itens operacionais",
    url: "/items",
    icon: IconListDetails,
    permission: "orders.read",
  },
  {
    title: "Pedidos a fornecedores",
    url: "/purchases",
    icon: IconShoppingCart,
    permission: "purchases.read",
  },
  {
    title: "Clientes",
    url: "/customers",
    icon: IconUsers,
    permission: "customers.read",
  },
  {
    title: "Produtos",
    url: "/products",
    icon: IconBox,
    permission: "products.read",
  },
  {
    title: "Precificacao",
    url: "/pricing",
    icon: IconCalculator,
    permission: "products.read",
  },
  {
    title: "Contas a receber",
    url: "/receivables",
    icon: IconCashBanknote,
    permission: "finance.read",
  },
  {
    title: "Financeiro",
    url: "/finance",
    icon: IconCash,
    permission: "finance.read",
  },
  {
    title: "Organizacao",
    url: "/settings/organization",
    icon: IconBuildingStore,
    permission: "organization.read",
  },
  {
    title: "Equipe",
    url: "/settings/team",
    icon: IconUserShield,
    permission: "members.read",
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate();
  const {
    user,
    signout,
    handleChangeSelectedEntityId,
    selectedEntityId,
    can,
  } = useAuth();
  const [isCreateEntityModalOpen, setIsCreateEntityModalOpen] =
    React.useState(false);
  const entities =
    user?.entities.map((entity) => ({
      ...entity,
      icon: entity.type === "PF" ? SquareUser : Building,
    })) ?? [];

  return (
    <>
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex min-h-11 items-center px-2 py-1.5">
                <PlatformBrand />
              </div>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <div className="mt-4 space-y-2 px-2">
                <div className="text-sidebar-foreground/70 text-xs font-medium uppercase tracking-wide">
                  Organizacao ativa
                </div>
                <EntitySwitcher
                  entities={entities}
                  activeEntityId={selectedEntityId ?? undefined}
                  onChange={handleChangeSelectedEntityId}
                  onCreateEntity={() => setIsCreateEntityModalOpen(true)}
                  onEditActiveEntity={
                    can("organization.update")
                      ? () => navigate("/settings/organization")
                      : undefined
                  }
                />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <NavMain items={navMain.filter((item) => can(item.permission))} />
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={user!} onLogout={signout} />
        </SidebarFooter>
      </Sidebar>

      <EntityModal
        isOpen={isCreateEntityModalOpen}
        onClose={() => setIsCreateEntityModalOpen(false)}
        action="create"
      />
    </>
  );
}
