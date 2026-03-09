"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Globe,
  Users,
  Building2,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  country: string | null;
  city: string | null;
  owner: { id: string; firstName: string; lastName: string } | null;
  _count?: { contacts: number; deals: number };
  createdAt: string;
}

interface PaginatedResponse {
  success: boolean;
  data: Company[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const SIZE_LABELS: Record<string, string> = {
  SOLO: "Solo",
  SMALL: "1-50",
  MEDIUM: "51-200",
  LARGE: "201-1000",
  ENTERPRISE: "1000+",
  CORPORATION: "10000+",
};

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const limit = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["companies", page, search],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      return apiFetch<PaginatedResponse>(
        `/api/v1/companies?${params.toString()}`
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch("/api/v1/companies", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setShowCreate(false);
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data?.meta.total ?? 0} total companies
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Company
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 flex gap-3">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or domain..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setPage(1);
              }}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-lg border border-gray-200 bg-white"
              />
            ))
          : data?.data.map((company) => (
              <div
                key={company.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                      <Building2 className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {company.name}
                      </h3>
                      {company.domain && (
                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          <Globe className="h-3 w-3" />
                          {company.domain}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                  {company.industry && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5">
                      {company.industry}
                    </span>
                  )}
                  {company.size && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5">
                      {SIZE_LABELS[company.size] ?? company.size}
                    </span>
                  )}
                  {company.country && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5">
                      {company.city ? `${company.city}, ` : ""}
                      {company.country}
                    </span>
                  )}
                </div>
                {company.owner && (
                  <p className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                    <Users className="h-3 w-3" />
                    {company.owner.firstName} {company.owner.lastName}
                  </p>
                )}
              </div>
            ))}
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

      {/* Create Company Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Add New Company
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
                const body: Record<string, string> = {};
                fd.forEach((val, key) => {
                  if (val) body[key] = val as string;
                });
                createMutation.mutate(body);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Domain
                  </label>
                  <input
                    name="domain"
                    type="text"
                    placeholder="example.com"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Industry
                  </label>
                  <input
                    name="industry"
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <input
                    name="country"
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Size
                  </label>
                  <select
                    name="size"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="SOLO">Solo</option>
                    <option value="SMALL">Small (1-50)</option>
                    <option value="MEDIUM">Medium (51-200)</option>
                    <option value="LARGE">Large (201-1000)</option>
                    <option value="ENTERPRISE">Enterprise (1000+)</option>
                  </select>
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
                  {createMutation.isPending ? "Creating..." : "Create Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
