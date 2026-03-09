"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Clock,
  Tag,
  User,
  FileText,
} from "lucide-react";

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  title: string | null;
  department: string | null;
  status: string;
  source: string;
  leadScore: number;
  lifecycleStage: string;
  consentStatus: string;
  tags: string[];
  createdAt: string;
  lastContactedAt: string | null;
  lastEngagedAt: string | null;
  company: { id: string; name: string; domain: string | null } | null;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  deals: Array<{
    id: string;
    title: string;
    value: string;
    stage: { name: string };
    pipeline: { name: string };
  }>;
  activities: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    type: string;
    priority: string;
    status: string;
    dueDate: string | null;
  }>;
  notes: Array<{
    id: string;
    body: string;
    createdAt: string;
    user: { firstName: string; lastName: string };
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-700",
  UNSUBSCRIBED: "bg-yellow-100 text-yellow-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-blue-600",
  HIGH: "text-orange-600",
  URGENT: "text-red-600",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact", id],
    queryFn: () =>
      apiFetch<{ data: ContactDetail }>(`/api/v1/contacts/${id}`).then(
        (r) => r.data
      ),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center">
        <p className="text-gray-500">Contact not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-2 text-sm text-primary-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/contacts"
          className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contacts
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {contact.firstName} {contact.lastName}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              {contact.title && <span>{contact.title}</span>}
              {contact.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {contact.company.name}
                </span>
              )}
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[contact.status] ?? "bg-gray-100 text-gray-700"}`}
          >
            {contact.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column — Info */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
              Contact Info
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="h-4 w-4 text-gray-400" />
                {contact.email}
              </div>
              {contact.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {contact.phone}
                </div>
              )}
              {contact.owner && (
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="h-4 w-4 text-gray-400" />
                  Owner: {contact.owner.firstName} {contact.owner.lastName}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-700">
                <Tag className="h-4 w-4 text-gray-400" />
                Source: {contact.source.replace(/_/g, " ")}
              </div>
            </div>
          </div>

          {/* Scores */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
              Lead Score
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-gray-900">
                {contact.leadScore}
              </div>
              <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full ${contact.leadScore >= 80 ? "bg-green-500" : contact.leadScore >= 60 ? "bg-yellow-500" : contact.leadScore >= 30 ? "bg-orange-400" : "bg-gray-400"}`}
                    style={{ width: `${contact.leadScore}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-500">
              Stage:{" "}
              <span className="font-medium text-gray-700">
                {contact.lifecycleStage.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Consent:{" "}
              <span className="font-medium text-gray-700">
                {contact.consentStatus}
              </span>
            </div>
          </div>

          {/* Tags */}
          {contact.tags.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Active Deals */}
          {contact.deals.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
                Deals
              </h3>
              <div className="space-y-3">
                {contact.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {deal.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {deal.stage.name} &middot; {deal.pipeline.name}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-700">
                      ${Number(deal.value).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column — Timeline & Tasks */}
        <div className="space-y-6 lg:col-span-2">
          {/* Open Tasks */}
          {contact.tasks.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
                Open Tasks
              </h3>
              <div className="space-y-2">
                {contact.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md border border-gray-100 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                      <span className="text-sm text-gray-900">
                        {task.title}
                      </span>
                    </div>
                    {task.dueDate && (
                      <span className="text-xs text-gray-500">
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
                Notes
              </h3>
              <div className="space-y-3">
                {contact.notes.map((note) => (
                  <div key={note.id} className="rounded-md bg-gray-50 p-3">
                    <p className="text-sm text-gray-700">{note.body}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {note.user.firstName} {note.user.lastName} &middot;{" "}
                      {timeAgo(note.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
              Activity Timeline
            </h3>
            {contact.activities.length === 0 ? (
              <p className="text-sm text-gray-500">No activity recorded yet.</p>
            ) : (
              <div className="relative space-y-0">
                {contact.activities.map((activity, i) => (
                  <div key={activity.id} className="relative flex gap-4 pb-6">
                    {i < contact.activities.length - 1 && (
                      <div className="absolute left-[9px] top-5 h-full w-px bg-gray-200" />
                    )}
                    <div className="relative z-10 mt-1 h-[18px] w-[18px] rounded-full border-2 border-primary-400 bg-white" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        {activity.description}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {timeAgo(activity.createdAt)}
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                          {activity.type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
