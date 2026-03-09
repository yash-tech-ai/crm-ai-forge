"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Plus,
  X,
  Zap,
  Play,
  Pause,
  Trash2,
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Clock,
  GitBranch,
  ClipboardList,
  Edit3,
} from "lucide-react";

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  triggerEvent: string;
  steps: StepConfig[];
  isActive: boolean;
  enrolledCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface StepConfig {
  type: "email" | "delay" | "condition" | "task" | "update_field";
  config: Record<string, unknown>;
}

interface PaginatedResponse {
  data: Sequence[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const STEP_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  delay: Clock,
  condition: GitBranch,
  task: ClipboardList,
  update_field: Edit3,
};

const STEP_COLORS: Record<string, string> = {
  email: "bg-blue-50 text-blue-600",
  delay: "bg-yellow-50 text-yellow-600",
  condition: "bg-purple-50 text-purple-600",
  task: "bg-green-50 text-green-600",
  update_field: "bg-orange-50 text-orange-600",
};

const TRIGGER_LABELS: Record<string, string> = {
  contact_created: "Contact Created",
  deal_stage_changed: "Deal Stage Changed",
  form_submitted: "Form Submitted",
  tag_added: "Tag Added",
  manual: "Manual Enrollment",
};

export default function SequencesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [steps, setSteps] = useState<StepConfig[]>([]);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["sequences", page],
    queryFn: () =>
      apiFetch<PaginatedResponse>(
        `/api/v1/sequences?page=${page}&limit=${limit}`
      ),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/sequences", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      setShowCreate(false);
      setSteps([]);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/sequences/${id}/toggle`, { method: "POST" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["sequences"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/sequences/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["sequences"] }),
  });

  function addStep(type: StepConfig["type"]) {
    const defaultConfigs: Record<string, Record<string, unknown>> = {
      email: { subject: "", templateId: "" },
      delay: { days: 1, hours: 0, minutes: 0 },
      condition: { field: "leadScore", operator: "greater_than", value: "50" },
      task: { title: "Follow up", dueDays: 1 },
      update_field: { field: "lifecycleStage", value: "ENGAGED" },
    };
    setSteps((prev) => [
      ...prev,
      { type, config: defaultConfigs[type] ?? {} },
    ]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Automation Sequences
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {data?.meta.total ?? 0} sequences
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Sequence
        </button>
      </div>

      {/* Sequence List */}
      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg bg-gray-100"
              />
            ))
          : data?.data.map((seq) => (
              <div
                key={seq.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap
                        className={`h-4 w-4 ${
                          seq.isActive
                            ? "text-green-500"
                            : "text-gray-400"
                        }`}
                      />
                      <h3 className="text-base font-semibold text-gray-900">
                        {seq.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          seq.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {seq.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {seq.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {seq.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                      <span>
                        Trigger:{" "}
                        {TRIGGER_LABELS[seq.triggerEvent] ?? seq.triggerEvent}
                      </span>
                      <span>{seq.steps.length} steps</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleMutation.mutate(seq.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        seq.isActive
                          ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                          : "bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {seq.isActive ? (
                        <Pause className="inline h-3 w-3 mr-1" />
                      ) : (
                        <Play className="inline h-3 w-3 mr-1" />
                      )}
                      {seq.isActive ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this sequence?")) {
                          deleteMutation.mutate(seq.id);
                        }
                      }}
                      className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Step visualizer */}
                <div className="mt-4 flex items-center gap-1 overflow-x-auto">
                  {seq.steps.map((step, i) => {
                    const Icon = STEP_ICONS[step.type] ?? Zap;
                    const color =
                      STEP_COLORS[step.type] ?? "bg-gray-50 text-gray-600";
                    return (
                      <div key={i} className="flex items-center gap-1">
                        {i > 0 && (
                          <div className="h-px w-4 bg-gray-300" />
                        )}
                        <div
                          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${color}`}
                          title={step.type}
                        >
                          <Icon className="h-3 w-3" />
                          {step.type}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stats */}
                <div className="mt-3 flex items-center gap-6 border-t border-gray-100 pt-3 text-xs">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Users className="h-3 w-3" />
                    {seq.enrolledCount} enrolled
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <CheckCircle2 className="h-3 w-3" />
                    {seq.completedCount} completed
                  </span>
                  <span className="text-gray-400">
                    Created {new Date(seq.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
      </div>

      {!isLoading && data?.data.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <Zap className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No sequences yet. Create your first automation sequence.
          </p>
        </div>
      )}

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

      {/* Create Sequence Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                New Automation Sequence
              </h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setSteps([]);
                }}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createMutation.error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {createMutation.error.message}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                createMutation.mutate({
                  name: fd.get("name") as string,
                  description:
                    (fd.get("description") as string) || undefined,
                  triggerEvent: fd.get("triggerEvent") as string,
                  steps,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sequence Name *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g. Welcome Drip"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  name="description"
                  type="text"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Trigger Event *
                </label>
                <select
                  name="triggerEvent"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="manual">Manual Enrollment</option>
                  <option value="contact_created">Contact Created</option>
                  <option value="deal_stage_changed">
                    Deal Stage Changed
                  </option>
                  <option value="tag_added">Tag Added</option>
                  <option value="form_submitted">Form Submitted</option>
                </select>
              </div>

              {/* Step Builder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Steps
                </label>

                {steps.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {steps.map((step, i) => {
                      const Icon = STEP_ICONS[step.type] ?? Zap;
                      const color =
                        STEP_COLORS[step.type] ?? "bg-gray-50 text-gray-600";
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-md border border-gray-200 p-3"
                        >
                          <span className="text-xs font-medium text-gray-400 w-5">
                            {i + 1}
                          </span>
                          <div
                            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${color}`}
                          >
                            <Icon className="h-3 w-3" />
                            {step.type}
                          </div>
                          <div className="flex-1 text-xs text-gray-500">
                            {step.type === "email" &&
                              `Subject: ${(step.config.subject as string) || "(template)"}`}
                            {step.type === "delay" &&
                              `Wait ${step.config.days || 0}d ${step.config.hours || 0}h ${step.config.minutes || 0}m`}
                            {step.type === "condition" &&
                              `If ${step.config.field} ${step.config.operator} ${step.config.value}`}
                            {step.type === "task" &&
                              `Create: ${step.config.title}`}
                            {step.type === "update_field" &&
                              `Set ${step.config.field} = ${step.config.value}`}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStep(i)}
                            className="rounded p-1 text-gray-400 hover:text-red-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {(
                    ["email", "delay", "condition", "task", "update_field"] as const
                  ).map((type) => {
                    const Icon = STEP_ICONS[type] ?? Zap;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addStep(type)}
                        className="flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
                      >
                        <Icon className="h-3 w-3" />+ {type.replace("_", " ")}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setSteps([]);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || steps.length === 0
                  }
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50"
                >
                  {createMutation.isPending
                    ? "Creating..."
                    : "Create Sequence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
