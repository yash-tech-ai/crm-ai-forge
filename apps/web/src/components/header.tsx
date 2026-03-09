"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, MessageSquare, LogOut, Users, Building2, Briefcase } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface SearchResults {
  contacts: Array<{ id: string; firstName: string; lastName: string; email: string }>;
  companies: Array<{ id: string; name: string; domain: string | null }>;
  deals: Array<{ id: string; title: string; value: string; stage: { name: string } }>;
}

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults(null);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch<{ data: SearchResults }>(
          `/api/v1/search?q=${encodeURIComponent(value)}`
        );
        setResults(res.data);
        setShowResults(true);
      } catch {
        setResults(null);
      }
    }, 300);
  }

  function navigate(path: string) {
    setShowResults(false);
    setQuery("");
    router.push(path);
  }

  const hasResults = results && (
    results.contacts.length > 0 ||
    results.companies.length > 0 ||
    results.deals.length > 0
  );

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Search */}
      <div ref={containerRef} className="relative flex flex-1 items-center gap-2">
        <Search className="h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results && setShowResults(true)}
          placeholder="Search contacts, deals, companies..."
          className="w-full max-w-md border-none bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
        />

        {/* Search Results Dropdown */}
        {showResults && results && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-lg">
            {!hasResults ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No results found for &quot;{query}&quot;
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {results.contacts.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-gray-400">
                      Contacts
                    </div>
                    {results.contacts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/dashboard/contacts/${c.id}`)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <Users className="h-4 w-4 text-blue-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {results.companies.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-gray-400">
                      Companies
                    </div>
                    {results.companies.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/dashboard/companies`)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <Building2 className="h-4 w-4 text-green-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {c.name}
                          </p>
                          {c.domain && (
                            <p className="text-xs text-gray-400">{c.domain}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {results.deals.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-gray-400">
                      Deals
                    </div>
                    {results.deals.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => navigate(`/dashboard/deals`)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <Briefcase className="h-4 w-4 text-purple-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {d.title}
                          </p>
                          <p className="text-xs text-gray-400">
                            ${Number(d.value).toLocaleString()} &middot;{" "}
                            {d.stage.name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* AI Chat Toggle */}
        <button
          className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors"
          title="Open AI Assistant"
        >
          <MessageSquare className="h-4 w-4" />
          Ask AI
        </button>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User Menu */}
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = "/login";
          }}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
