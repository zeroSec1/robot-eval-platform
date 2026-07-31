"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OutcomeBadge, FailureBadge } from "@/components/failure-badge";
import { ObservationPreview } from "@/components/observation-preview";
import { CoverageBar } from "@/components/coverage-bar";
import { SchemaJson } from "@/components/episodes/schema-json";
import { WaveformTimeline } from "@/components/charts/waveform-timeline";
import { DATASETS, EPISODES } from "@/lib/mock-data";
import { SOURCE_FORMAT_LABEL } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { USER_DATASET_ID, useUserDataset, useUserEpisodes } from "@/lib/user-data";

export default function EpisodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const userEpisodes = useUserEpisodes();
  const userDataset = useUserDataset();

  // Uploaded episodes only exist in localStorage, which is unreadable during
  // the initial server-rendered pass. Wait for the client mount (when
  // useUserEpisodes' real snapshot is guaranteed available) before deciding
  // an id is genuinely missing — otherwise a freshly-uploaded episode's own
  // detail link would 404 on that first render, before hydration catches up.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const episode = useMemo(
    () => [...EPISODES, ...userEpisodes].find((e) => e.episodeId === id),
    [userEpisodes, id],
  );
  const dataset = useMemo(() => {
    if (!episode) return undefined;
    if (episode.datasetId === USER_DATASET_ID) return userDataset;
    return DATASETS.find((d) => d.datasetId === episode.datasetId);
  }, [episode, userDataset]);

  if (!mounted) return null;
  if (!episode) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5 text-[13px] text-faint">
        <Link href="/episodes" className="hover:text-text">
          Episodes
        </Link>
        <span>/</span>
        <span className="font-mono text-dim">{episode.episodeId}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-text">{episode.task.name}</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-faint">“{episode.task.languageInstruction}”</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <OutcomeBadge success={episode.outcome.success} />
          {episode.failure ? <FailureBadge category={episode.failure.category} /> : null}
          <Badge tone="neutral">{episode.policyVersion}</Badge>
          <Badge tone="info">{episode.task.benchmarkPack}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="p-3">
            <ObservationPreview episode={episode} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {episode.embodiment.sensors.map((s) => (
                  <Badge key={s} tone="neutral">
                    {s}
                  </Badge>
                ))}
              </div>
              {episode.rawSourceUrl ? (
                <a
                  href={episode.rawSourceUrl}
                  download
                  className="rounded-sm border border-border-strong px-2.5 py-1.5 text-[13px] font-medium text-dim hover:text-text"
                >
                  View raw source
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Raw source archive not wired to a backend yet"
                  className="cursor-not-allowed rounded-sm border border-border-strong px-2.5 py-1.5 text-[13px] font-medium text-mute"
                >
                  View raw source
                </button>
              )}
            </div>
          </Card>

          <WaveformTimeline episode={episode} />

          {episode.failure ? (
            <Card>
              <CardHeader title="Failure detail" />
              <div className="grid grid-cols-2 gap-4 px-3.5 py-3 text-[15px]">
                <div>
                  <p className="text-[12px] text-faint">category</p>
                  <p className="mt-0.5 text-text">{episode.failure.category.replaceAll("_", " ")}</p>
                </div>
                <div>
                  <p className="text-[12px] text-faint">subcategory</p>
                  <p className="mt-0.5 text-text">{episode.failure.subcategory}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[12px] text-faint">notes</p>
                  <p className="mt-0.5 text-dim">{episode.failure.notes}</p>
                </div>
              </div>
            </Card>
          ) : null}

          <Card className="px-3.5 py-3">
            <SchemaJson episode={episode} />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Outcome" />
            <div className="flex flex-col gap-2.5 px-3.5 py-3 text-[15px]">
              <Row label="success">
                <OutcomeBadge success={episode.outcome.success} />
              </Row>
              <Row label="determined by">
                <span className="text-right text-dim">{episode.outcome.methodOfDetermination}</span>
              </Row>
            </div>
          </Card>

          <Card>
            <CardHeader title="Metrics" />
            <div className="flex flex-col gap-2.5 px-3.5 py-3 text-[15px]">
              <Row label="duration">
                <span className="tabular-nums text-dim">{formatDuration(episode.metrics.durationS)}</span>
              </Row>
              <Row label="interventions">
                <span className="tabular-nums text-dim">{episode.metrics.interventions ?? "-"}</span>
              </Row>
              <Row label="collisions">
                <span className="tabular-nums text-dim">{episode.metrics.collisions ?? "-"}</span>
              </Row>
            </div>
          </Card>

          <Card>
            <CardHeader title="Embodiment" />
            <div className="flex flex-col gap-2.5 px-3.5 py-3 text-[15px]">
              <Row label="robot type">
                <span className="text-dim">{episode.embodiment.robotType}</span>
              </Row>
              <Row label="model">
                <span className="text-dim">{episode.embodiment.model}</span>
              </Row>
              <Row label="DoF">
                <span className="tabular-nums text-dim">{episode.embodiment.dof}</span>
              </Row>
            </div>
          </Card>

          <Card>
            <CardHeader title="Provenance" />
            <div className="flex flex-col gap-2.5 px-3.5 py-3 text-[15px]">
              <Row label="dataset">
                <Link
                  href={`/episodes?dataset=${episode.datasetId}`}
                  className="text-right text-accent hover:opacity-80"
                >
                  {dataset?.name ?? episode.datasetId}
                </Link>
              </Row>
              <Row label="source format">
                <Badge tone="neutral">{SOURCE_FORMAT_LABEL[episode.sourceFormat]}</Badge>
              </Row>
              <Row label="schema version">
                <span className="text-dim">v{episode.schemaVersion}</span>
              </Row>
              <Row label="recorded">
                <span className="text-dim">{formatDateTime(episode.recordedAt)}</span>
              </Row>
              <Row label="coverage">
                <CoverageBar coverage={episode.coverage} />
              </Row>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-faint">{label}</span>
      {children}
    </div>
  );
}
