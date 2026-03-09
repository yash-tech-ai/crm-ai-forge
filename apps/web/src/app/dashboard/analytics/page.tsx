"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { TrendingUp, Users, BarChart3, Bot } from "lucide-react";

interface LeadDistribution {
  distribution: { cold: number; warm: number; hot: number; scorching: number };
  byStage: Record<string, number>;
}

interface PipelineStageSummary {
  id: string;
  name: string;
  position: number;
  probability: number;
  dealCount: number;
  totalValue: number;
  weightedValue: number;
}

interface PipelineSummary {
  id: string;
  name: string;
  stages: PipelineStageSummary[];
}

interface AgentStat {
  agentType: string;
  totalActions: number;
  avgDurationMs: number;
  avgConfidence: number;
  totalTokens: number;
}

export default function AnalyticsPage() {
  const { data: leads } = useQuery({
    queryKey: ["analytics-leads"],
    queryFn: () =>
      apiFetch<{ data: LeadDistribution }>("/api/v1/analytics/leads/distribution").then(
        (r) => r.data
      ),
  });

  const { data: pipelineData } = useQuery({
    queryKey: ["analytics-pipeline"],
    queryFn: () =>
      apiFetch<{ data: PipelineSummary[] }>("/api/v1/analytics/pipeline/summary").then(
        (r) => r.data
      ),
  });

  const { data: agentsData } = useQuery({
    queryKey: ["analytics-agents"],
    queryFn: () =>
      apiFetch<{ data: { agentStats: AgentStat[] } }>("/api/v1/analytics/agents/activity").then(
        (r) => r.data
      ),
  });

  const pipeline = pipelineData?.[0];
  const totalWeighted =
    pipeline?.stages.reduce((s, st) => s + st.weightedValue, 0) ?? 0;

  const leadDist = leads?.distribution;
  const totalLeads = leadDist
    ? leadDist.cold + leadDist.warm + leadDist.hot + leadDist.scorching
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Insights across your CRM data
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lead Distribution */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Lead Temperature
            </h2>
          </div>
          {leadDist ? (
            <div className="space-y-3">
              {[
                { label: "Scorching (80+)", value: leadDist.scorching, color: "bg-red-500" },
                { label: "Hot (60-79)", value: leadDist.hot, color: "bg-orange-500" },
                { label: "Warm (30-59)", value: leadDist.warm, color: "bg-yellow-500" },
                { label: "Cold (<30)", value: leadDist.cold, color: "bg-blue-400" },
              ].map((tier) => (
                <div key={tier.label} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-gray-600">
                    {tier.label}
                  </span>
                  <div className="flex-1 h-5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${tier.color}`}
                      style={{
                        width: totalLeads
                          ? `${(tier.value / totalLeads) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-gray-700">
                    {tier.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 animate-pulse rounded bg-gray-100" />
          )}

          {/* Lifecycle stages */}
          {leads?.byStage && Object.keys(leads.byStage).length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">
                By Lifecycle Stage
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(leads.byStage).map(([stage, count]) => (
                  <div
                    key={stage}
                    className="rounded-md bg-gray-50 px-3 py-1.5 text-center"
                  >
                    <p className="text-xs text-gray-400">
                      {stage.replace(/_/g, " ")}
                    </p>
                    <p className="text-lg font-bold text-gray-900">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pipeline Funnel */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h2 className="text-base font-semibold text-gray-900">
                Pipeline Funnel
              </h2>
            </div>
            <span className="text-sm text-gray-400">
              Weighted: ${totalWeighted.toLocaleString()}
            </span>
          </div>
          {pipeline ? (
            <div className="space-y-2">
              {pipeline.stages
                .sort((a, b) => a.position - b.position)
                .map((stage) => {
                  const maxVal = Math.max(
                    ...pipeline.stages.map((s) => s.totalValue),
                    1
                  );
                  return (
                    <div
                      key={stage.id}
                      className="flex items-center gap-3"
                    >
                      <span className="w-28 truncate text-sm text-gray-600">
                        {stage.name}
                      </span>
                      <div className="flex-1 h-6 overflow-hidden rounded bg-gray-100">
                        <div
                          className="h-full rounded bg-primary-400"
                          style={{
                            width: `${(stage.totalValue / maxVal) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="w-28 text-right">
                        <span className="text-sm font-semibold text-gray-700">
                          ${stage.totalValue.toLocaleString()}
                        </span>
                        <span className="ml-1 text-xs text-gray-400">
                          ({stage.dealCount})
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="h-48 animate-pulse rounded bg-gray-100" />
          )}
        </div>

        {/* Agent Activity */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            <h2 className="text-base font-semibold text-gray-900">
              AI Agent Activity
            </h2>
          </div>
          {agentsData?.agentStats && agentsData.agentStats.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Agent
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Avg Duration
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Avg Confidence
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Tokens
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {agentsData.agentStats.map((agent) => (
                    <tr key={agent.agentType}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {agent.agentType}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-gray-700">
                        {agent.totalActions}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-gray-700">
                        {agent.avgDurationMs}ms
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-gray-700">
                        {(agent.avgConfidence * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-gray-700">
                        {agent.totalTokens.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <Bot className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No agent activity recorded yet. Agent intelligence will be
                available in Phase 3.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
