"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Bot, Activity, Clock, Zap } from "lucide-react";

interface AgentStat {
  agentType: string;
  totalActions: number;
  avgDurationMs: number;
  avgConfidence: number;
  totalTokens: number;
}

interface AgentAction {
  id: string;
  agentType: string;
  action: string;
  status: string;
  durationMs: number | null;
  tokensUsed: number | null;
  confidence: number | null;
  triggeredBy: string;
  createdAt: string;
}

const AGENT_INFO: Record<string, { desc: string; tier: string }> = {
  ORCHESTRATOR: { desc: "Routes requests to specialist agents", tier: "Opus" },
  LEAD: { desc: "Scoring, qualification, assignment", tier: "Sonnet" },
  CAMPAIGN: { desc: "Campaign creation, A/B testing", tier: "Sonnet" },
  SALES: { desc: "Call prep, coaching, deal management", tier: "Sonnet" },
  INSIGHT: { desc: "Analytics, trends, anomaly detection", tier: "Sonnet" },
  ENRICHMENT: { desc: "Data enrichment, LinkedIn lookup", tier: "Haiku" },
  COMPLIANCE: { desc: "Mandatory gate, consent checking", tier: "Haiku" },
  SUPPORT: { desc: "Customer inquiry handling", tier: "Sonnet" },
};

export default function AgentsPage() {
  const { data } = useQuery({
    queryKey: ["agents-activity"],
    queryFn: () =>
      apiFetch<{
        data: { recentActions: AgentAction[]; agentStats: AgentStat[] };
      }>("/api/v1/analytics/agents/activity").then((r) => r.data),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
        <p className="mt-1 text-sm text-gray-500">
          8 specialist agents powered by OpenClaw
        </p>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(AGENT_INFO).map(([type, info]) => {
          const stat = data?.agentStats.find((s) => s.agentType === type);
          return (
            <div
              key={type}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                  <Bot className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </h3>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                    {info.tier}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">{info.desc}</p>
              {stat ? (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                  <div>
                    <p className="text-[10px] text-gray-400">Actions</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {stat.totalActions}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Confidence</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {(stat.avgConfidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-3 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  No activity yet
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent Actions */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Recent Agent Actions
        </h2>
        {data?.recentActions && data.recentActions.length > 0 ? (
          <div className="space-y-2">
            {data.recentActions.map((action) => (
              <div
                key={action.id}
                className="flex items-center gap-4 rounded-md bg-gray-50 p-3"
              >
                <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">
                  {action.agentType}
                </span>
                <span className="flex-1 text-sm text-gray-700">
                  {action.action}
                </span>
                <span
                  className={`text-xs font-medium ${action.status === "completed" ? "text-green-600" : action.status === "failed" ? "text-red-600" : "text-yellow-600"}`}
                >
                  {action.status}
                </span>
                {action.durationMs && (
                  <span className="text-xs text-gray-400">
                    {action.durationMs}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <Activity className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              Agent actions will appear here once AI agents are active (Phase
              3).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
