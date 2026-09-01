"use client";

import * as React from "react";
import { ChevronDown, PencilLine, Plus } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/view/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/view/components/ui/dropdown-menu";
import type { Entity } from "@/app/entities/Entity";

interface EntityWithLogo extends Entity {
  icon: React.ElementType;
}

interface EntitySwitcherProps {
  entities: EntityWithLogo[];
  onChange: (entityId: string) => void;
  activeEntityId?: string;
  onCreateEntity?: () => void;
  onEditActiveEntity?: () => void;
}

const ENTITY_TYPE_LABELS: Record<Entity["type"], string> = {
  PF: "Pessoa física",
  PJ: "Pessoa jurídica",
};

export function EntitySwitcher({
  entities,
  onChange,
  activeEntityId,
  onCreateEntity,
  onEditActiveEntity,
}: EntitySwitcherProps) {
  const activeEntity = React.useMemo(
    () => entities.find((entity) => entity.id === activeEntityId) ?? entities[0],
    [activeEntityId, entities]
  );

  if (!activeEntity) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            className="h-auto w-full justify-start gap-2 px-2 py-2"
            onClick={onCreateEntity}
            disabled={!onCreateEntity}
          >
            <div className="bg-background flex size-8 items-center justify-center rounded-md border">
              <Plus className="size-4" />
            </div>
            <div className="min-w-0 text-left">
              <div className="font-medium">Criar organizacao</div>
              <div className="text-sidebar-foreground/70 truncate text-xs">
                Configure a primeira entidade
              </div>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-auto w-full justify-between px-2 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="flex aspect-square size-8 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: activeEntity.color }}
                >
                  {activeEntity.profile.logo ? (
                    <img
                      src={activeEntity.profile.logo.url}
                      alt=""
                      className="size-7 rounded-sm object-contain"
                    />
                  ) : (
                    <activeEntity.icon className="size-4" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <div className="truncate font-medium">{activeEntity.name}</div>
                  <div className="text-sidebar-foreground/70 truncate text-xs">
                    {ENTITY_TYPE_LABELS[activeEntity.type]}
                  </div>
                </div>
              </div>
              <ChevronDown className="opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-72 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Alternar entidade
            </DropdownMenuLabel>
            {entities.map((entity, index) => (
              <DropdownMenuItem
                key={entity.id}
                onClick={() => {
                  onChange(entity.id);
                }}
                className="gap-2 p-2"
              >
                <div
                  className="flex size-8 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: entity.color }}
                >
                  {entity.profile.logo ? (
                    <img
                      src={entity.profile.logo.url}
                      alt=""
                      className="size-7 rounded-sm object-contain"
                    />
                  ) : (
                    <entity.icon className="size-4 shrink-0" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{entity.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {ENTITY_TYPE_LABELS[entity.type]}
                  </div>
                </div>
                <DropdownMenuShortcut>
                  {entity.id === activeEntity.id ? "Ativa" : `⌘${index + 1}`}
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={onEditActiveEntity}
              disabled={!onEditActiveEntity}
            >
              <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                <PencilLine className="size-4" />
              </div>
              <div className="font-medium">Editar entidade atual</div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 p-2" onClick={onCreateEntity}>
              <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                <Plus className="size-4" />
              </div>
              <div className="font-medium">Nova entidade</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
