"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { RestaurantAvatar } from "@/components/app/restaurant-avatar";
import { switchRestaurant } from "@/lib/actions/restaurant";
import type { ShellMembership, ShellRestaurant } from "@/components/app/sidebar";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({ restaurant, memberships, collapsed }: { restaurant: ShellRestaurant; memberships: ShellMembership[]; collapsed?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Dropdown>
      <DropdownTrigger className={cn("flex min-w-0 items-center gap-2 rounded-md p-1.5 text-left hover:bg-surface-3", !collapsed && "w-full", pending && "opacity-60")}>
        <RestaurantAvatar name={restaurant.name} logoUrl={restaurant.logo_url} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{restaurant.name}</span>
              <span className="block truncate text-[11px] text-ink-3">{restaurant.is_demo ? "Demonstração" : "Forkly"}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-ink-3" />
          </>
        )}
      </DropdownTrigger>
      <DropdownContent align="start" className="w-60">
        <DropdownLabel>Seus restaurantes</DropdownLabel>
        {memberships.map((m) => (
          <DropdownItem key={m.restaurant_id} onSelect={() => start(async () => { await switchRestaurant(m.restaurant_id); router.push("/dashboard"); router.refresh(); })}>
            <RestaurantAvatar name={m.name} logoUrl={m.logo_url} className="size-5 text-[9px]" />
            <span className="flex-1 truncate">{m.name}</span>
            {m.restaurant_id === restaurant.id && <Check className="!text-brand" />}
          </DropdownItem>
        ))}
        <DropdownSeparator />
        <DropdownItem onSelect={() => router.push("/onboarding?new=1")}><Plus /> Adicionar restaurante</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
