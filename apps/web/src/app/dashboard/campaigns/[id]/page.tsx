"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  Mail,
  MousePointerClick,
  Eye,
  UserMinus,
  AlertTriangle,
  XCircle,
  Send,
  ExternalLink,
} from "lucide-react";

interface CampaignAnalytics {
  campaign: {
    id: string;
    name: string;
    type: string;
    status: string;
    subject: string;
    fromName: string | null;
    sentAt: string | null;
    scheduledAt: string | null;
    template: { id: string; name: string } | null;
    segment: { id: string; name: string; contactCount: number } | null;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  };
  metrics: {
    totalRecipients: number;
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    failed: number;
    openRate: string;
    clickRate: string;
    clickToOpenRate: string;
    bounceRate: string;
    unsubscribeRate: string;
  };
  statusBreakdown: Record<string, number>;
  topLinks: { url: string; clicks: number }[];
  timeline: { date: string; opens: number; clicks: number }[];
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_COMPLIANCE: "bg-yellow-100 text-yellow-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  SENDING: "bg-indigo-100 text-indigo-700",
  SENT: "bg-green-100 text-green-700",
  PAUSED: "bg-orange-100 text-orange-700",
  CANCELLED: "bg-red-100 text-red-700",
  FAILED: "bg-red-100 text-red-700",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ["campaign-analytics", id],
    queryFn: () =>
      apiFetch<{ data: CampaignAnalytics }>(`/api/v1/analytics/campaigns/${id}`),
  });

  const analytics = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">Campaign not found.</p>
      </div>
    );
  }

  const { campaign, metrics, statusBreakdown, topLinks, timeline } = analytics;
  const maxBarValue = Math.max(...timeline.map((t) => t.opens + t.clicks), 1);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboard/campaigns")}
          className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {campaign.name}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[campaign.status] ?? "bg-gray-100 text-gray-700"}`}
              >
                {campaign.status.replace(/_/g, " ")}
              </span>
              {campaign.subject && (
                <span>Subject: {campaign.subject}</span>
              )}
              {campaign.sentAt && (
                <span>
                  Sent {new Date(campaign.sentAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          label="Sent"
          value={metrics.sent}
          icon={<Send className="h-5 w-5 text-blue-500" />}
          color="blue"
        />
        <MetricCard
          label="Opened"
          value={metrics.opened}
          subtext={`${metrics.openRate}%`}
          icon={<Eye className="h-5 w-5 text-green-500" />}
          color="green"
        />
        <MetricCard
          label="Clicked"
          value={metrics.clicked}
          subtext={`${metrics.clickRate}%`}
          icon={<MousePointerClick className="h-5 w-5 text-purple-500" />}
          color="purple"
        />
        <MetricCard
          label="Bounced"
          value={metrics.bounced}
          subtext={`${metrics.bounceRate}%`}
          icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
          color="orange"
        />
        <MetricCard
          label="Unsubscribed"
          value={metrics.unsubscribed}
          subtext={`${metrics.unsubscribeRate}%`}
          icon={<UserMinus className="h-5 w-5 text-red-500" />}
          color="red"
        />
        <MetricCard
          label="Failed"
          value={metrics.failed}
          icon={<XCircle className="h-5 w-5 text-gray-500" />}
          color="gray"
        />
      </div>

      {/* Engagement Funnel + Click-to-Open */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Funnel */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Engagement Funnel
          </h3>
          <div className="space-y-3">
            <FunnelBar
              label="Sent"
              value={metrics.sent}
              max={metrics.totalRecipients || 1}
              color="bg-blue-500"
            />
            <FunnelBar
              label="Opened"
              value={metrics.opened}
              max={metrics.totalRecipients || 1}
              color="bg-green-500"
            />
            <FunnelBar
              label="Clicked"
              value={metrics.clicked}
              max={metrics.totalRecipients || 1}
              color="bg-purple-500"
            />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
            <span>Click-to-Open Rate</span>
            <span className="font-semibold text-gray-800">
              {metrics.clickToOpenRate}%
            </span>
          </div>
        </div>

        {/* Recipient Status Breakdown */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Recipient Status
          </h3>
          <div className="space-y-2">
            {Object.entries(statusBreakdown).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-600">
                  {status.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-primary-500"
                      style={{
                        width: `${Math.min(100, (count / (metrics.totalRecipients || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right font-medium text-gray-800">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
            Total Recipients: {metrics.totalRecipients}
          </div>
        </div>
      </div>

      {/* Timeline + Top Links */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Activity Timeline */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Activity Timeline (7 Days)
          </h3>
          {timeline.length > 0 ? (
            <div className="space-y-2">
              {timeline.map((day) => (
                <div key={day.date} className="flex items-center gap-3 text-sm">
                  <span className="w-20 text-xs text-gray-400">
                    {new Date(day.date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                  <div className="flex flex-1 gap-1">
                    <div
                      className="h-5 rounded bg-green-400"
                      style={{
                        width: `${(day.opens / maxBarValue) * 100}%`,
                        minWidth: day.opens > 0 ? "4px" : "0",
                      }}
                      title={`${day.opens} opens`}
                    />
                    <div
                      className="h-5 rounded bg-purple-400"
                      style={{
                        width: `${(day.clicks / maxBarValue) * 100}%`,
                        minWidth: day.clicks > 0 ? "4px" : "0",
                      }}
                      title={`${day.clicks} clicks`}
                    />
                  </div>
                  <span className="w-16 text-right text-xs text-gray-500">
                    {day.opens}o / {day.clicks}c
                  </span>
                </div>
              ))}
              <div className="mt-2 flex gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded bg-green-400" />
                  Opens
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded bg-purple-400" />
                  Clicks
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No activity data yet.
            </p>
          )}
        </div>

        {/* Top Clicked Links */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Top Clicked Links
          </h3>
          {topLinks.length > 0 ? (
            <div className="space-y-3">
              {topLinks.map((link, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <span
                      className="truncate text-gray-600"
                      title={link.url}
                    >
                      {link.url}
                    </span>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                    {link.clicks} clicks
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No link clicks yet.</p>
          )}
        </div>
      </div>

      {/* Campaign Info */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          Campaign Details
        </h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-gray-400">Type</dt>
            <dd className="font-medium text-gray-800">{campaign.type}</dd>
          </div>
          <div>
            <dt className="text-gray-400">From</dt>
            <dd className="font-medium text-gray-800">
              {campaign.fromName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Template</dt>
            <dd className="font-medium text-gray-800">
              {campaign.template?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Segment</dt>
            <dd className="font-medium text-gray-800">
              {campaign.segment
                ? `${campaign.segment.name} (${campaign.segment.contactCount})`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Created By</dt>
            <dd className="font-medium text-gray-800">
              {campaign.createdBy
                ? `${campaign.createdBy.firstName} ${campaign.createdBy.lastName}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Scheduled</dt>
            <dd className="font-medium text-gray-800">
              {campaign.scheduledAt
                ? new Date(campaign.scheduledAt).toLocaleString()
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Sent</dt>
            <dd className="font-medium text-gray-800">
              {campaign.sentAt
                ? new Date(campaign.sentAt).toLocaleString()
                : "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  icon,
}: {
  label: string;
  value: number;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        {icon}
        {subtext && (
          <span className="text-xs font-medium text-gray-400">{subtext}</span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function FunnelBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-800">
          {value.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-gray-100">
        <div
          className={`h-3 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
