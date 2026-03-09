"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Users,
  Briefcase,
  Mail,
  CheckSquare,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface DashboardData {
  contacts: { total: number; newThisMonth: number };
  deals: { active: number; totalValue: number };
  campaigns: { active: number };
  tasks: { pending: number; overdue: number };
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    contact?: { id: string; firstName: string; lastName: string } | null;
    user?: { id: string; firstName: string; lastName: string } | null;
  }>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function activityLabel(type: string) {
  const labels: Record<string, string> = {
    CONTACT_CREATED: "New contact",
    DEAL_CREATED: "Deal created",
    DEAL_STAGE_CHANGED: "Deal moved",
    DEAL_WON: "Deal won",
    DEAL_LOST: "Deal lost",
    EMAIL_SENT: "Email sent",
    CALL_MADE: "Call made",
    TASK_COMPLETED: "Task completed",
    NOTE_ADDED: "Note added",
    AGENT_ACTION: "AI action",
  };
  return labels[type] || type.replace(/_/g, " ").toLowerCase();
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () =>
      apiFetch<{ data: DashboardData }>("/api/v1/analytics/dashboard").then(
        (r) => r.data
      ),
  });

  const stats = [
    {
      name: "Total Contacts",
      value: data?.contacts.total ?? "—",
      sub: data ? `+${data.contacts.newThisMonth} this month` : "",
      icon: Users,
      color: "bg-blue-500",
    },
    {
      name: "Active Deals",
      value: data?.deals.active ?? "—",
      sub: "",
      icon: Briefcase,
      color: "bg-green-500",
    },
    {
      name: "Pipeline Value",
      value: data ? formatCurrency(data.deals.totalValue) : "—",
      sub: "",
      icon: TrendingUp,
      color: "bg-indigo-500",
    },
    {
      name: "Active Campaigns",
      value: data?.campaigns.active ?? "—",
      sub: "",
      icon: Mail,
      color: "bg-purple-500",
    },
    {
      name: "Pending Tasks",
      value: data?.tasks.pending ?? "—",
      sub: "",
      icon: CheckSquare,
      color: "bg-yellow-500",
    },
    {
      name: "Overdue Tasks",
      value: data?.tasks.overdue ?? "—",
      sub: "",
      icon: AlertTriangle,
      color: "bg-red-500",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your CRM overview at a glance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}
              >
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? (
                    <span className="inline-block h-7 w-16 animate-pulse rounded bg-gray-200" />
                  ) : (
                    stat.value
                  )}
                </p>
                {stat.sub && (
                  <p className="text-xs text-green-600">{stat.sub}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Recent Activity
        </h2>
        <div className="mt-4 space-y-3">
          {isLoading
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-md bg-gray-50 p-3"
                >
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                  <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                  <div className="ml-auto h-4 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              ))
            : data?.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 rounded-md bg-gray-50 p-3"
                >
                  <div className="h-2 w-2 rounded-full bg-primary-400" />
                  <div className="flex-1 text-sm text-gray-700">
                    <span className="font-medium">
                      {activityLabel(activity.type)}
                    </span>
                    {" — "}
                    {activity.description}
                    {activity.contact && (
                      <span className="text-gray-500">
                        {" "}
                        ({activity.contact.firstName}{" "}
                        {activity.contact.lastName})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {timeAgo(activity.createdAt)}
                  </div>
                </div>
              ))}
          {!isLoading && (!data?.recentActivities || data.recentActivities.length === 0) && (
            <p className="text-sm text-gray-500">No recent activity yet.</p>
          )}
        </div>
      </div>

      {/* Agent Status */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          AI Agent Status
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          8 agents monitoring your CRM — powered by OpenClaw.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            "Orchestrator",
            "Lead Agent",
            "Campaign Agent",
            "Sales Agent",
            "Insight Agent",
            "Enrichment Agent",
            "Compliance Agent",
            "Support Agent",
          ].map((agent) => (
            <div
              key={agent}
              className="flex items-center gap-2 rounded-md border border-gray-200 p-3"
            >
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-xs font-medium text-gray-700">
                {agent}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
