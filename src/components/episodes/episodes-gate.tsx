"use client";

import { FormEvent, useState } from "react";
import { EPISODES } from "@/lib/mock-data";
import { OutcomeBadge, FailureBadge } from "@/components/failure-badge";
import { Card, CardHeader } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import { markSignedUp, useSignedUpEmail } from "@/lib/signup-gate";

const TEASER_COUNT = 6;

export function EpisodesGate({ children }: { children: React.ReactNode }) {
  const signedUpEmail = useSignedUpEmail();

  if (signedUpEmail) return <>{children}</>;

  return <SignupWall />;
}

function SignupWall() {
  const teaser = EPISODES.slice(0, TEASER_COUNT);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }
      markSignedUp(email);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title={`See all ${EPISODES.length} episodes`}
          subtitle={`Showing ${TEASER_COUNT} of ${EPISODES.length}: sign up with your work email to browse the full dataset, filters, and per-episode telemetry.`}
        />
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 px-3.5 py-3">
          <input
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-border-strong"
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-md bg-text px-3.5 py-1.5 text-sm font-medium text-card disabled:opacity-60"
          >
            {status === "submitting" ? "Signing up…" : "Unlock episodes"}
          </button>
        </form>
        {status === "error" && errorMessage && (
          <p className="px-3.5 pb-3 text-sm text-red">{errorMessage}</p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teaser.map((episode) => (
          <Card key={episode.episodeId} className="p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{episode.task.name}</span>
              <OutcomeBadge success={episode.outcome.success} />
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
              <span>{episode.policyVersion}</span>
              <span>·</span>
              <span>{formatDuration(episode.metrics.durationS)}</span>
              {episode.failure && <FailureBadge category={episode.failure.category} />}
            </div>
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-zinc-500">
        + {EPISODES.length - TEASER_COUNT} more episodes, filters, and per-episode telemetry after signup
      </p>
    </div>
  );
}
