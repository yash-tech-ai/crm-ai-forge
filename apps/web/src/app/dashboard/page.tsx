"use client";

import {
  Users,
  Briefcase,
  Mail,
  CheckSquare,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

// Placeholder dashboard — will be connected to API in Phase 2
const stats = [
  { name: "Total Contacts", value: "—", icon: Users, color: "bg-blue-500" },
  { name: "Active Deals", value: "—", icon: Briefcase, color: "bg-green-500" },
  { name: "Campaigns", value: "—", icon: Mail, color: "bg-purple-500" },
  { name: "Pending Tasks", value: "—", icon: CheckSquare, color: "bg-yellow-500" },
  { name: "Pipeline Value", value: "—", icon: TrendingUp, color: "bg-indigo-500" },
  { name: "Overdue Tasks", value: "—", icon: AlertTriangle, color: "bg-red-500" },
];

export default function DashboardPage() {
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
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <p className="mt-2 text-sm text-gray-500">
          Activity feed will be connected to the API in Phase 2.
        </p>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-md bg-gray-50 p-3"
            >
              <div className="h-2 w-2 rounded-full bg-gray-300" />
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
              <div className="ml-auto h-4 w-20 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Agent Status */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">AI Agent Status</h2>
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
              <span className="text-xs font-medium text-gray-700">{agent}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
