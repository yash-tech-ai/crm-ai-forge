import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          CRM AI Forge
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          AI-native CRM and Campaign Management
        </p>
        <p className="mt-2 text-gray-500">
          Where intelligent agents understand what to do and when
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
          >
            Open Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
