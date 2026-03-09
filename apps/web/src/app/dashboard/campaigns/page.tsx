"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  X,
  ArrowRight,
  BarChart3,
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

interface Template {
  id: string;
  name: string;
  subject: string;
}

interface Segment {
  id: string;
  name: string;
  contactCount: number;
}

interface PaginatedResponse {
  data: Campaign[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const STATUS_BADGE: Record<
  string,
  { icon: typeof Mail; color: string; label: string }
> = {
  DRAFT: { icon: Mail, color: "bg-gray-100 text-gray-600", label: "Draft" },
  PENDING_COMPLIANCE: {
    icon: AlertCircle,
    color: "bg-yellow-100 text-yellow-700",
    label: "Pending Review",
  },
  SCHEDULED: {
    icon: Clock,
    color: "bg-blue-100 text-blue-700",
    label: "Scheduled",
  },
  SENDING: {
    icon: Send,
    color: "bg-indigo-100 text-indigo-700",
    label: "Sending",
  },
  SENT: {
    icon: CheckCircle2,
    color: "bg-green-100 text-green-700",
    label: "Sent",
  },
  PAUSED: {
    icon: Pause,
    color: "bg-orange-100 text-orange-700",
    label: "Paused",
  },
  CANCELLED: {
    icon: AlertCircle,
    color: "bg-red-100 text-red-600",
    label: "Cancelled",
  },
  FAILED: {
    icon: AlertCircle,
    color: "bg-red-100 text-red-700",
    label: "Failed",
  },
};

function rate(num: number, denom: number) {
  if (!denom) return "0%";
  return `${((num / denom) * 100).toFixed(1)}%`;
}

export default function CampaignsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showWizard, setShowWizard] = useState(false);
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

  // Action mutations
  const sendMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/campaigns/${id}/send`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/campaigns/${id}/approve-compliance`, {
        method: "POST",
        body: JSON.stringify({ notes: "Approved via dashboard" }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
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
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Campaign
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
          <option value="PENDING_COMPLIANCE">Pending Review</option>
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
              const badge =
                STATUS_BADGE[campaign.status] ?? STATUS_BADGE.DRAFT;
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
                            {new Date(
                              campaign.scheduledAt
                            ).toLocaleDateString()}
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
                    <div className="flex items-center gap-2">
                      {/* Action buttons based on status */}
                      {campaign.status === "PENDING_COMPLIANCE" &&
                        campaign.complianceStatus === "PENDING" && (
                          <button
                            onClick={() => approveMutation.mutate(campaign.id)}
                            className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                          >
                            Approve
                          </button>
                        )}
                      {(campaign.status === "DRAFT" ||
                        campaign.complianceStatus === "APPROVED") &&
                        campaign.status !== "SENT" &&
                        campaign.status !== "SENDING" && (
                          <button
                            onClick={() => sendMutation.mutate(campaign.id)}
                            disabled={sendMutation.isPending}
                            className="flex items-center gap-1 rounded-md bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100"
                          >
                            <Send className="h-3 w-3" />
                            Send
                          </button>
                        )}
                      <span
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badge.color}`}
                      >
                        <BadgeIcon className="h-3 w-3" />
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  {m.sent > 0 && (
                    <div className="mt-4 grid grid-cols-6 gap-4 border-t border-gray-100 pt-4">
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
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/campaigns/${campaign.id}`
                            )
                          }
                          className="flex items-center gap-1 rounded-md text-xs font-medium text-primary-600 hover:text-primary-800"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          Analytics
                        </button>
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
              No campaigns yet. Click &quot;New Campaign&quot; to create your
              first one.
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

      {/* Campaign Creation Wizard */}
      {showWizard && (
        <CampaignWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => {
            setShowWizard(false);
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
          }}
        />
      )}
    </div>
  );
}

// ─── Campaign Creation Wizard ─────────────────────────
function CampaignWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    type: "EMAIL",
    objective: "",
    templateId: "",
    segmentId: "",
    subjectLine: "",
    previewText: "",
    fromName: "",
    fromEmail: "",
  });
  const [error, setError] = useState("");

  const { data: templates } = useQuery({
    queryKey: ["templates-list"],
    queryFn: () =>
      apiFetch<{ data: Template[] }>("/api/v1/templates?limit=50").then(
        (r) => r.data
      ),
  });

  const { data: segments } = useQuery({
    queryKey: ["segments-list"],
    queryFn: () =>
      apiFetch<{ data: Segment[] }>("/api/v1/segments?limit=50").then(
        (r) => r.data
      ),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/campaigns", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          templateId: form.templateId || undefined,
          segmentId: form.segmentId || undefined,
          subjectLine: form.subjectLine || undefined,
          previewText: form.previewText || undefined,
          fromName: form.fromName || undefined,
          fromEmail: form.fromEmail || undefined,
        }),
      }),
    onSuccess: () => onCreated(),
    onError: (err) => setError(err.message),
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const STEPS = ["Details", "Audience", "Content", "Review"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Create Campaign
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex border-b border-gray-200 px-6">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => i + 1 < step && setStep(i + 1)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
                step === i + 1
                  ? "border-primary-600 text-primary-600"
                  : i + 1 < step
                    ? "border-transparent text-gray-500 hover:text-gray-700"
                    : "border-transparent text-gray-300"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  step === i + 1
                    ? "bg-primary-600 text-white"
                    : i + 1 < step
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {i + 1 < step ? "✓" : i + 1}
              </span>
              {s}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g. March Newsletter"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => update("type", e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Objective
                  </label>
                  <input
                    type="text"
                    value={form.objective}
                    onChange={(e) => update("objective", e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="e.g. Re-engage inactive users"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Audience */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Audience Segment
                </label>
                <select
                  value={form.segmentId}
                  onChange={(e) => update("segmentId", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="">All contacts (no segment filter)</option>
                  {segments?.map((seg) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.name} ({seg.contactCount} contacts)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Select a segment to target specific contacts, or send to all.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Content */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Template
                </label>
                <select
                  value={form.templateId}
                  onChange={(e) => update("templateId", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="">Select a template...</option>
                  {templates?.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} — {tpl.subject}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={form.subjectLine}
                  onChange={(e) => update("subjectLine", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Override template subject (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Preview Text
                </label>
                <input
                  type="text"
                  value={form.previewText}
                  onChange={(e) => update("previewText", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Shows after subject in inbox"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={form.fromName}
                    onChange={(e) => update("fromName", e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="e.g. Yash from CRM Forge"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    From Email
                  </label>
                  <input
                    type="email"
                    value={form.fromEmail}
                    onChange={(e) => update("fromEmail", e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="e.g. yash@company.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Campaign Summary
              </h3>
              <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium text-gray-900">{form.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-gray-900">{form.type}</span>
                </div>
                {form.objective && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Objective</span>
                    <span className="text-gray-900">{form.objective}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Audience</span>
                  <span className="text-gray-900">
                    {form.segmentId
                      ? segments?.find((s) => s.id === form.segmentId)?.name ??
                        "Selected segment"
                      : "All contacts"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Template</span>
                  <span className="text-gray-900">
                    {form.templateId
                      ? templates?.find((t) => t.id === form.templateId)
                          ?.name ?? "Selected template"
                      : "None"}
                  </span>
                </div>
                {form.subjectLine && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subject</span>
                    <span className="text-gray-900">{form.subjectLine}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">
                The campaign will be created as a Draft. You can then submit for
                compliance review, schedule, or send immediately.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <button
            onClick={step === 1 ? onClose : () => setStep((s) => s - 1)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 4 ? (
            <button
              onClick={() => {
                if (step === 1 && !form.name.trim()) {
                  setError("Campaign name is required");
                  return;
                }
                setError("");
                setStep((s) => s + 1);
              }}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50"
            >
              {createMutation.isPending
                ? "Creating..."
                : "Create Campaign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
