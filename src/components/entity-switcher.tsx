"use client";

import * as React from "react";
import { ChevronDown, Plus } from "lucide-react";
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
  logo: React.ElementType;
}

interface EntitySwitcherProps {
  entities: EntityWithLogo[];
  onChange: (entityId: string) => void;
  activeEntityId?: string;
}

export function EntitySwitcher({ entities, onChange }: EntitySwitcherProps) {
  const [activeEntity, setActiveEntity] = React.useState(entities[0]);

  if (!activeEntity) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-fit px-1.5">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-5 items-center justify-center rounded-md">
                <activeEntity.logo className="size-3" />
              </div>
              <span className="truncate font-medium">{activeEntity.name}</span>
              <ChevronDown className="opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Entities
            </DropdownMenuLabel>
            {entities.map((entity, index) => (
              <DropdownMenuItem
                key={entity.name}
                onClick={() => {
                  setActiveEntity(entity);
                  onChange?.(entity.id);
                }}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-xs border">
                  <entity.logo className="size-4 shrink-0" />
                </div>
                {entity.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">
                Adicionar conta PJ
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
