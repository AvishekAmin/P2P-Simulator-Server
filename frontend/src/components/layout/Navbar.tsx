"use client";

import { usePathname } from "next/navigation";
import { navigation } from "@/lib/navigation";

function getPageTitle(pathname: string): string {
  for (const group of navigation) {
    for (const item of group.items) {
      if (
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href))
      ) {
        return item.label;
      }
    }
  }
  return "Dashboard";
}

export function Navbar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border bg-white px-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-muted">Demo Manufacturing Pvt Ltd</span>
      </div>
    </header>
  );
}
