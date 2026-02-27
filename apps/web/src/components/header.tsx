"use client";

import { Bell, Search, MessageSquare, LogOut } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Search */}
      <div className="flex flex-1 items-center gap-2">
        <Search className="h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search contacts, deals, campaigns..."
          className="w-full max-w-md border-none bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
        />
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
