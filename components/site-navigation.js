"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteNavigation({ navigation }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {navigation.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link key={item.href} href={item.href} className={`top-nav-link ${active ? "top-nav-link-active" : ""}`}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
