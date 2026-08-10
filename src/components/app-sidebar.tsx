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
} from "@tabler/icons-react";
import { Building, SquareUser } from "lucide-react";

import type { Entity } from "@/app/entities/Entity";
import wordmark from "@/assets/jc-materiais-wordmark.png";
import { useAuth } from "@/app/hooks/useAuth";
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

const navMain = [
  {
    title: "Painel",
    url: "/dashboard",
    icon: IconLayoutDashboard,
  },
  {
    title: "Cotacoes",
    url: "/quotations",
    icon: IconFileInvoice,
  },
  {
    title: "Ordens de compra",
    url: "/orders",
    icon: IconClipboardList,
  },
  {
    title: "Itens operacionais",
    url: "/items",
    icon: IconListDetails,
  },
  {
    title: "Pedidos a fornecedores",
    url: "/purchases",
    icon: IconShoppingCart,
  },
  {
    title: "Clientes",
    url: "/customers",
    icon: IconUsers,
  },
  {
    title: "Produtos",
    url: "/products",
    icon: IconBox,
  },
  {
    title: "Precificacao",
    url: "/pricing",
    icon: IconCalculator,
  },
  {
    title: "Financeiro",
    url: "/finance",
    icon: IconCash,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, signout, handleChangeSelectedEntityId, selectedEntityId } =
    useAuth();
  const [isCreateEntityModalOpen, setIsCreateEntityModalOpen] =
    React.useState(false);
  const [entityBeingEdited, setEntityBeingEdited] =
    React.useState<Entity | null>(null);

  const entities =
    user?.entities.map((entity) => ({
      ...entity,
      logo: entity.type === "PF" ? SquareUser : Building,
    })) ?? [];

  const activeEntity =
    user?.entities.find((entity) => entity.id === selectedEntityId) ??
    user?.entities[0] ??
    null;

  return (
    <>
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex min-h-11 items-center px-2 py-1.5">
                <img
                  src={wordmark}
                  alt="JC Materiais Hospitalares"
                  className="h-10 w-auto max-w-full object-contain"
                />
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
                  onEditActiveEntity={() => {
                    if (activeEntity) {
                      setEntityBeingEdited(activeEntity);
                    }
                  }}
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

      <EntityModal
        isOpen={isCreateEntityModalOpen}
        onClose={() => setIsCreateEntityModalOpen(false)}
        action="create"
      />

      <EntityModal
        isOpen={Boolean(entityBeingEdited)}
        onClose={() => setEntityBeingEdited(null)}
        action="update"
        entity={entityBeingEdited}
      />
    </>
  );
}
