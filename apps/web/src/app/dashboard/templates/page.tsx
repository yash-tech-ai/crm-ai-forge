"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Plus,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Edit3,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  subject: string;
  category: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  performance: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse {
  data: Template[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface PreviewData {
  subject: string;
  html: string;
  text?: string;
  variables: string[];
}

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const limit = 12;

  const { data, isLoading } = useQuery({
    queryKey: ["templates", page],
    queryFn: () =>
      apiFetch<PaginatedResponse>(
        `/api/v1/templates?page=${page}&limit=${limit}`
      ),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/templates", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setShowCreate(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/templates/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ["template-preview", previewId],
    queryFn: () =>
      apiFetch<{ data: PreviewData }>(
        `/api/v1/templates/${previewId}/render`,
        { method: "POST", body: JSON.stringify({}) }
      ),
    enabled: !!previewId,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Email Templates
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {data?.meta.total ?? 0} templates
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-lg bg-gray-100"
              />
            ))
          : data?.data.map((tpl) => (
              <div
                key={tpl.id}
                className="group rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {tpl.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-400 truncate">
                      Subject: {tpl.subject}
                    </p>
                  </div>
                </div>
                {tpl.category && (
                  <span className="mt-3 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {tpl.category}
                  </span>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] text-gray-300">
                    Updated {new Date(tpl.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setPreviewId(tpl.id)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Preview"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this template?")) {
                          deleteMutation.mutate(tpl.id);
                        }
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {!isLoading && data?.data.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No templates yet. Create your first email template.
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

      {/* Preview Modal */}
      {previewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Template Preview
                </h2>
                {previewData?.data && (
                  <p className="mt-0.5 text-sm text-gray-400">
                    Subject: {previewData.data.subject}
                  </p>
                )}
              </div>
              <button
                onClick={() => setPreviewId(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {previewLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                </div>
              ) : previewData?.data ? (
                <div>
                  {previewData.data.variables.length > 0 && (
                    <div className="mb-4 rounded-lg bg-blue-50 p-3">
                      <p className="text-xs font-medium text-blue-700 mb-1">
                        Template Variables:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {previewData.data.variables.map((v) => (
                          <span
                            key={v}
                            className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-mono text-blue-700"
                          >
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border border-gray-200 bg-white">
                    <iframe
                      srcDoc={previewData.data.html}
                      className="h-[500px] w-full rounded-lg"
                      sandbox=""
                      title="Email Preview"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-gray-400">
                  Failed to load preview.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                New Email Template
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
                const tagsStr = (fd.get("tags") as string) || "";
                createMutation.mutate({
                  name: fd.get("name") as string,
                  subject: fd.get("subject") as string,
                  htmlBody: fd.get("htmlBody") as string,
                  textBody: (fd.get("textBody") as string) || undefined,
                  category: (fd.get("category") as string) || undefined,
                  tags: tagsStr
                    ? tagsStr.split(",").map((t) => t.trim())
                    : [],
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Template Name *
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="e.g. Welcome Email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <input
                    name="category"
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="e.g. Onboarding"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <input
                  name="tags"
                  type="text"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g. welcome, onboarding, marketing"
                />
                <p className="mt-0.5 text-xs text-gray-400">
                  Comma-separated tags
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subject Line *
                </label>
                <input
                  name="subject"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g. Welcome to {{company_name}}!"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  HTML Body *
                </label>
                <textarea
                  name="htmlBody"
                  required
                  rows={10}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="<html><body>Hello {{first_name}}!</body></html>"
                />
                <p className="mt-0.5 text-xs text-gray-400">
                  Use {"{{variable}}"} syntax for dynamic content
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Plain Text Body
                </label>
                <textarea
                  name="textBody"
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Hello {{first_name}}! (plain text fallback)"
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
                  {createMutation.isPending
                    ? "Creating..."
                    : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
