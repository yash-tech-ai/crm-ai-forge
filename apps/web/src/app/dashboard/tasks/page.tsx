"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Plus,
  X,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  createdByAgent: boolean;
  agentType: string | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  deal: { id: string; title: string } | null;
  createdAt: string;
}

interface PaginatedResponse {
  data: Task[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  LOW: { bg: "bg-gray-100", text: "text-gray-600" },
  MEDIUM: { bg: "bg-blue-50", text: "text-blue-700" },
  HIGH: { bg: "bg-orange-50", text: "text-orange-700" },
  URGENT: { bg: "bg-red-50", text: "text-red-700" },
};

const STATUS_ICON: Record<string, typeof Circle> = {
  PENDING: Circle,
  IN_PROGRESS: Clock,
  COMPLETED: CheckCircle2,
  CANCELLED: X,
};

const TYPE_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  FOLLOW_UP: "Follow-up",
  DEMO: "Demo",
  CUSTOM: "Custom",
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", page, statusFilter, priorityFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      return apiFetch<PaginatedResponse>(
        `/api/v1/tasks?${params.toString()}`
      );
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "COMPLETED" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowCreate(false);
    },
  });

  function isOverdue(task: Task) {
    return (
      task.dueDate &&
      task.status !== "COMPLETED" &&
      task.status !== "CANCELLED" &&
      new Date(task.dueDate) < new Date()
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data?.meta.total ?? 0} tasks
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-gray-100"
              />
            ))
          : data?.data.map((task) => {
              const StatusIcon = STATUS_ICON[task.status] ?? Circle;
              const priority = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.MEDIUM;
              const overdue = isOverdue(task);

              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm ${overdue ? "border-red-200" : "border-gray-200"}`}
                >
                  {/* Complete button */}
                  <button
                    onClick={() => {
                      if (
                        task.status !== "COMPLETED" &&
                        task.status !== "CANCELLED"
                      ) {
                        completeMutation.mutate(task.id);
                      }
                    }}
                    disabled={
                      task.status === "COMPLETED" ||
                      task.status === "CANCELLED"
                    }
                    className="flex-shrink-0"
                  >
                    <StatusIcon
                      className={`h-5 w-5 ${
                        task.status === "COMPLETED"
                          ? "text-green-500"
                          : task.status === "CANCELLED"
                            ? "text-gray-300"
                            : "text-gray-400 hover:text-green-500"
                      }`}
                    />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${task.status === "COMPLETED" ? "text-gray-400 line-through" : "text-gray-900"}`}
                      >
                        {task.title}
                      </p>
                      {task.createdByAgent && (
                        <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">
                          AI
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">
                        {TYPE_LABELS[task.type] ?? task.type}
                      </span>
                      {task.assignedTo && (
                        <span>
                          {task.assignedTo.firstName} {task.assignedTo.lastName}
                        </span>
                      )}
                      {task.contact && (
                        <span>
                          {task.contact.firstName} {task.contact.lastName}
                        </span>
                      )}
                      {task.deal && <span>{task.deal.title}</span>}
                    </div>
                  </div>

                  {/* Priority */}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${priority.bg} ${priority.text}`}
                  >
                    {task.priority}
                  </span>

                  {/* Due Date */}
                  <div className="flex items-center gap-1 text-xs">
                    {task.dueDate ? (
                      <span
                        className={`flex items-center gap-1 ${overdue ? "font-medium text-red-600" : "text-gray-500"}`}
                      >
                        {overdue && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-300">No due date</span>
                    )}
                  </div>
                </div>
              );
            })}
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

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                New Task
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
                  description: (fd.get("description") as string) || undefined,
                  type: fd.get("type") as string,
                  priority: fd.get("priority") as string,
                  dueDate: fd.get("dueDate")
                    ? new Date(fd.get("dueDate") as string).toISOString()
                    : undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title *
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g. Follow up with John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <select
                    name="type"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  >
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="CALL">Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="MEETING">Meeting</option>
                    <option value="DEMO">Demo</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    name="priority"
                    defaultValue="MEDIUM"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <input
                    name="dueDate"
                    type="date"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
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
                  {createMutation.isPending ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
