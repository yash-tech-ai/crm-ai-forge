"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Mail,
  Send,
  Clock,
  Pause,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  complianceStatus: string;
  scheduledAt: string | null;
  sentAt: string | null;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  _count?: { recipients: number };
  createdAt: string;
}

interface PaginatedResponse {
  data: Campaign[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const STATUS_BADGE: Record<string, { icon: typeof Mail; color: string; label: string }> = {
  DRAFT: { icon: Mail, color: "bg-gray-100 text-gray-600", label: "Draft" },
  PENDING_COMPLIANCE: { icon: AlertCircle, color: "bg-yellow-100 text-yellow-700", label: "Pending Review" },
  SCHEDULED: { icon: Clock, color: "bg-blue-100 text-blue-700", label: "Scheduled" },
  SENDING: { icon: Send, color: "bg-indigo-100 text-indigo-700", label: "Sending" },
  SENT: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Sent" },
  PAUSED: { icon: Pause, color: "bg-orange-100 text-orange-700", label: "Paused" },
  CANCELLED: { icon: AlertCircle, color: "bg-red-100 text-red-600", label: "Cancelled" },
  FAILED: { icon: AlertCircle, color: "bg-red-100 text-red-700", label: "Failed" },
};

function rate(num: number, denom: number) {
  if (!denom) return "0%";
  return `${((num / denom) * 100).toFixed(1)}%`;
}

export default function CampaignsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", page, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter) params.set("status", statusFilter);
      return apiFetch<PaginatedResponse>(
        `/api/v1/campaigns?${params.toString()}`
      );
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data?.meta.total ?? 0} campaigns
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors opacity-50 cursor-not-allowed" disabled>
          <Plus className="h-4 w-4" />
          New Campaign (Phase 2)
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="SENDING">Sending</option>
          <option value="SENT">Sent</option>
          <option value="PAUSED">Paused</option>
        </select>
      </div>

      {/* Campaign Cards */}
      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg bg-gray-100"
              />
            ))
          : data?.data.map((campaign) => {
              const badge = STATUS_BADGE[campaign.status] ?? STATUS_BADGE.DRAFT;
              const BadgeIcon = badge.icon;
              const m = campaign.metrics;

              return (
                <div
                  key={campaign.id}
                  className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {campaign.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        <span className="uppercase">{campaign.type}</span>
                        {campaign.scheduledAt && (
                          <span>
                            Scheduled:{" "}
                            {new Date(campaign.scheduledAt).toLocaleDateString()}
                          </span>
                        )}
                        {campaign.sentAt && (
                          <span>
                            Sent:{" "}
                            {new Date(campaign.sentAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badge.color}`}
                    >
                      <BadgeIcon className="h-3 w-3" />
                      {badge.label}
                    </span>
                  </div>

                  {/* Metrics */}
                  {m.sent > 0 && (
                    <div className="mt-4 grid grid-cols-5 gap-4 border-t border-gray-100 pt-4">
                      <div>
                        <p className="text-xs text-gray-400">Sent</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {m.sent}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Delivered</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {rate(m.delivered, m.sent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Opened</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {rate(m.opened, m.delivered)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Clicked</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {rate(m.clicked, m.opened)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Bounced</p>
                        <p className="text-sm font-semibold text-red-600">
                          {rate(m.bounced, m.sent)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

        {!isLoading && data?.data.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
            <Mail className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              No campaigns yet. Campaign creation will be available in Phase 2.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {data.meta.page} of {data.meta.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.meta.totalPages}
              className="rounded-md border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
