"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import * as D from "@radix-ui/react-dialog";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { NavLinks, type ShellMembership, type ShellRestaurant } from "@/components/app/sidebar";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";
import { NAV } from "@/components/app/nav";
import { initials } from "@/lib/utils";
import type { PermissionMap } from "@/lib/permissions";

export function Topbar({ restaurant, memberships, permissions, user, roleLabel }: {
  restaurant: ShellRestaurant; memberships: ShellMembership[]; permissions: PermissionMap; user: { fullName: string; email: string }; roleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur lg:px-6">
      <D.Root open={open} onOpenChange={setOpen}>
        <D.Trigger className="-ml-1 rounded-md p-1.5 text-ink-2 hover:bg-surface-3 lg:hidden" aria-label="Open menu"><Menu className="size-5" /></D.Trigger>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-40 bg-ink/30 data-[state=open]:animate-fade-in lg:hidden" />
          <D.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface shadow-pop data-[state=open]:animate-fade-in lg:hidden">
            <D.Title className="sr-only">Navigation</D.Title>
            <D.Description className="sr-only">Main navigation</D.Description>
            <div className="flex h-14 items-center gap-2 border-b border-line px-3">
              <div className="min-w-0 flex-1"><WorkspaceSwitcher restaurant={restaurant} memberships={memberships} /></div>
              <D.Close className="rounded-md p-1.5 text-ink-3 hover:bg-surface-3" aria-label="Close menu"><X className="size-4" /></D.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-2"><NavLinks permissions={permissions} onNavigate={() => setOpen(false)} /></div>
          </D.Content>
        </D.Portal>
      </D.Root>
      <p className="truncate text-sm font-medium text-ink-2 lg:hidden">{current?.label}</p>
      <div className="ml-auto flex items-center gap-2">
        <Dropdown>
          <DropdownTrigger className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-surface-3" aria-label="Account menu">
            <span className="flex size-7 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">{initials(user.fullName || user.email) || <UserRound className="size-4" />}</span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-36 truncate text-[13px] font-medium leading-4">{user.fullName}</span>
              <span className="block text-[11px] leading-4 text-ink-3">{roleLabel}</span>
            </span>
          </DropdownTrigger>
          <DropdownContent className="w-56">
            <DropdownLabel className="truncate">{user.email}</DropdownLabel>
            <DropdownSeparator />
            <form action="/auth/signout" method="post">
              <DropdownItem asChild><button type="submit" className="w-full"><LogOut /> Sign out</button></DropdownItem>
            </form>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  );
}
