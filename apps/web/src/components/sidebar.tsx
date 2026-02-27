"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Mail,
  FileText,
  CheckSquare,
  BarChart3,
  Bot,
  Settings,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users },
  { name: "Companies", href: "/dashboard/companies", icon: Building2 },
  { name: "Deals", href: "/dashboard/deals", icon: Briefcase },
  { name: "Campaigns", href: "/dashboard/campaigns", icon: Mail },
  { name: "Templates", href: "/dashboard/templates", icon: FileText },
  { name: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
  { name: "Sequences", href: "/dashboard/sequences", icon: Zap },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "AI Agents", href: "/dashboard/agents", icon: Bot },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[260px] flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900">AI Forge</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon
                    className={clsx(
                      "h-5 w-5",
                      isActive ? "text-primary-600" : "text-gray-400"
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="h-2 w-2 rounded-full bg-green-400" />
          OpenClaw Connected
        </div>
      </div>
    </aside>
  );
}
