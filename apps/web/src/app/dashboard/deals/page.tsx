"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Plus, X, DollarSign, Calendar, User } from "lucide-react";

interface PipelineStage {
  id: string;
  name: string;
  position: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
}

interface Deal {
  id: string;
  title: string;
  value: string;
  currency: string;
  probability: number;
  expectedCloseDate: string | null;
  stageId: string;
  contact?: { id: string; firstName: string; lastName: string } | null;
  company?: { id: string; name: string } | null;
  owner?: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: PipelineStage[];
}

interface DealsResponse {
  data: Deal[];
  meta: { total: number };
}

interface PipelinesResponse {
  data: Pipeline[];
}

const STAGE_COLORS = [
  "border-t-blue-400",
  "border-t-cyan-400",
  "border-t-teal-400",
  "border-t-yellow-400",
  "border-t-orange-400",
  "border-t-purple-400",
  "border-t-green-500",
  "border-t-red-400",
];

export default function DealsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: pipelinesData } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () =>
      apiFetch<PipelinesResponse>("/api/v1/pipelines").then((r) => r.data),
  });

  const pipeline = pipelinesData?.[0]; // Use first (default) pipeline

  const { data: dealsData, isLoading } = useQuery({
    queryKey: ["deals", pipeline?.id],
    queryFn: () =>
      apiFetch<DealsResponse>(
        `/api/v1/deals?pipelineId=${pipeline!.id}&limit=100`
      ),
    enabled: !!pipeline,
  });

  const updateDealMutation = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      apiFetch(`/api/v1/deals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ stageId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/deals", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setShowCreate(false);
    },
  });

  // Group deals by stageId
  const dealsByStage: Record<string, Deal[]> = {};
  if (pipeline) {
    for (const stage of pipeline.stages) {
      dealsByStage[stage.id] = [];
    }
  }
  if (dealsData?.data) {
    for (const deal of dealsData.data) {
      if (dealsByStage[deal.stageId]) {
        dealsByStage[deal.stageId].push(deal);
      }
    }
  }

  const totalValue =
    dealsData?.data.reduce((s, d) => s + Number(d.value), 0) ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            {dealsData?.meta.total ?? 0} deals &middot; Total value:{" "}
            <span className="font-semibold text-green-700">
              ${totalValue.toLocaleString()}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Deal
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {isLoading || !pipeline
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-96 w-72 flex-shrink-0 animate-pulse rounded-lg bg-gray-100"
              />
            ))
          : pipeline.stages
              .sort((a, b) => a.position - b.position)
              .map((stage, idx) => {
                const deals = dealsByStage[stage.id] ?? [];
                const stageValue = deals.reduce(
                  (s, d) => s + Number(d.value),
                  0
                );
                return (
                  <div
                    key={stage.id}
                    className={`flex w-72 flex-shrink-0 flex-col rounded-lg border-t-4 bg-gray-50 ${STAGE_COLORS[idx % STAGE_COLORS.length]}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const dealId = e.dataTransfer.getData("dealId");
                      if (dealId) {
                        updateDealMutation.mutate({
                          id: dealId,
                          stageId: stage.id,
                        });
                      }
                    }}
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700">
                          {stage.name}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {deals.length} deal{deals.length !== 1 ? "s" : ""}{" "}
                          &middot; ${stageValue.toLocaleString()}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500 shadow-sm">
                        {stage.probability}%
                      </span>
                    </div>

                    {/* Deal Cards */}
                    <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
                      {deals.map((deal) => (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) =>
                            e.dataTransfer.setData("dealId", deal.id)
                          }
                          className="cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow active:cursor-grabbing"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {deal.title}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-semibold text-green-700">
                              ${Number(deal.value).toLocaleString()}
                            </span>
                          </div>
                          {deal.contact && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                              <User className="h-3 w-3" />
                              {deal.contact.firstName} {deal.contact.lastName}
                            </div>
                          )}
                          {deal.company && (
                            <p className="mt-0.5 text-xs text-gray-400">
                              {deal.company.name}
                            </p>
                          )}
                          {deal.expectedCloseDate && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                              <Calendar className="h-3 w-3" />
                              {new Date(
                                deal.expectedCloseDate
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
      </div>

      {/* Create Deal Modal */}
      {showCreate && pipeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                New Deal
              </h2>
              <button
                onClick={() => setShowCreate(false)}
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
                  title: fd.get("title") as string,
                  value: Number(fd.get("value")) || 0,
                  pipelineId: pipeline.id,
                  stageId:
                    (fd.get("stageId") as string) || pipeline.stages[0]?.id,
                  expectedCloseDate: fd.get("expectedCloseDate") || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Deal Title *
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g. Enterprise SaaS License"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Value ($)
                  </label>
                  <input
                    name="value"
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Stage
                  </label>
                  <select
                    name="stageId"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  >
                    {pipeline.stages
                      .sort((a, b) => a.position - b.position)
                      .map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expected Close Date
                </label>
                <input
                  name="expectedCloseDate"
                  type="date"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
