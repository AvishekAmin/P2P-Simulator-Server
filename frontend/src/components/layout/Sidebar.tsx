"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package } from "lucide-react";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-white">
      {/* Logo / App title */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Package className="h-6 w-6 text-primary" />
        <span className="text-base font-semibold tracking-tight">
          Supplysphere
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navigation.map((group) => (
          <div key={group.title} className="mb-3">
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {group.title}
            </p>

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <p className="text-xs text-muted">Supplysphere</p>
      </div>
    </aside>
  );
}
