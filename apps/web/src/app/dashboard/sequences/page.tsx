"use client";

import { Zap } from "lucide-react";

export default function SequencesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Automation Sequences
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Drip campaigns and automated email sequences
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 p-16 text-center">
        <Zap className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-700">
          Coming in Phase 2
        </h3>
        <p className="mt-2 max-w-md mx-auto text-sm text-gray-500">
          Automation sequences will allow you to create multi-step drip
          campaigns that automatically nurture leads over time. Build triggers,
          delays, and conditional branching.
        </p>
      </div>
    </div>
  );
}
