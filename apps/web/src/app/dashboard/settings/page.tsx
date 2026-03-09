"use client";

import { useState, useEffect } from "react";
import { Settings, User, Building2, Shield } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<{ firstName: string; lastName: string; email: string; role: string } | null>(null);
  const [tenant, setTenant] = useState<{ name: string; slug: string; plan: string } | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      const t = localStorage.getItem("tenant");
      if (u) setUser(JSON.parse(u));
      if (t) setTenant(JSON.parse(t));
    } catch {}
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and workspace
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Profile
            </h2>
          </div>
          {user ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-gray-900">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {user.role}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Loading...</p>
          )}
        </div>

        {/* Workspace */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Workspace
            </h2>
          </div>
          {tenant ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Company</span>
                <span className="font-medium text-gray-900">{tenant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Slug</span>
                <span className="font-mono text-gray-900">{tenant.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Plan</span>
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 uppercase">
                  {tenant.plan}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Loading...</p>
          )}
        </div>

        {/* Security */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Security
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Password change and two-factor authentication will be available in a
            future update.
          </p>
        </div>
      </div>
    </div>
  );
}
