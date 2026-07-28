#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  loadEpisodes,
  loadDatasets,
  filterEpisodes,
  computeStats,
  compareVersions,
  type EpisodeFilter,
} from "./data.js";
import { FAILURE_CATEGORY_LABEL, SOURCE_FORMAT_LABEL } from "./types.js";

const server = new McpServer({
  name: "robot-eval-platform",
  version: "1.0.0",
});

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

server.registerTool(
  "list_datasets",
  {
    title: "List datasets",
    description:
      "List every ingested dataset with its source format, episode count, and average coverage score. " +
      "Use this first to discover what data is available before calling list_episodes.",
    inputSchema: {},
  },
  async () => {
    const episodes = loadEpisodes();
    const datasets = loadDatasets();
    const rows = datasets.map((d) => {
      const eps = episodes.filter((e) => e.datasetId === d.datasetId);
      const avgCoverage = eps.length ? eps.reduce((s, e) => s + e.coverage, 0) / eps.length : 0;
      return {
        datasetId: d.datasetId,
        name: d.name,
        sourceFormat: d.sourceFormat,
        sourceFormatLabel: SOURCE_FORMAT_LABEL[d.sourceFormat],
        episodeCount: eps.length,
        avgCoverage: Math.round(avgCoverage * 100) / 100,
        ingestedAt: d.ingestedAt,
      };
    });
    return json({ datasets: rows, totalEpisodes: episodes.length });
  },
);

server.registerTool(
  "list_episodes",
  {
    title: "List / filter episodes",
    description:
      "List episodes with optional filters, returned as compact summaries (not full detail — use " +
      "get_episode for that). Filters combine with AND. Results are capped at `limit` (default 20, max 200).",
    inputSchema: {
      datasetId: z.string().optional().describe("Exact datasetId from list_datasets"),
      sourceFormat: z
        .enum(["lerobot", "ros2_bag", "csv_video", "hdf5", "rlds", "zarr", "webdataset"])
        .optional(),
      policyVersion: z.string().optional().describe("Exact policyVersion from list_policy_versions"),
      outcome: z.enum(["success", "failure", "unscored"]).optional(),
      failureCategory: z
        .enum([
          "grasp_slipped",
          "missed_grasp",
          "dropped_object",
          "wrong_object",
          "collision",
          "stalled",
          "plan_failure",
        ])
        .optional(),
      taskQuery: z.string().optional().describe("Case-insensitive substring match against task name/instruction/episode id"),
      limit: z.number().int().min(1).max(200).default(20),
    },
  },
  async (args) => {
    const { limit, ...filter } = args as EpisodeFilter & { limit: number };
    const episodes = loadEpisodes();
    const filtered = filterEpisodes(episodes, filter);
    const page = filtered.slice(0, limit).map((e) => ({
      episodeId: e.episodeId,
      datasetId: e.datasetId,
      sourceFormat: e.sourceFormat,
      taskName: e.task.name,
      policyVersion: e.policyVersion,
      success: e.outcome.success,
      failureCategory: e.failure?.category ?? null,
      durationS: e.metrics.durationS,
      coverage: e.coverage,
      hasVideo: e.video !== undefined,
    }));
    return json({ matched: filtered.length, returned: page.length, episodes: page });
  },
);

server.registerTool(
  "get_episode",
  {
    title: "Get one episode's full detail",
    description:
      "Full canonical record for a single episode by its episodeId, including task, embodiment, outcome, " +
      "metrics, video reference, and raw-source link, whatever fields that episode's format actually populated.",
    inputSchema: {
      episodeId: z.string(),
    },
  },
  async ({ episodeId }) => {
    const episode = loadEpisodes().find((e) => e.episodeId === episodeId);
    if (!episode) return errorResult(`No episode found with episodeId "${episodeId}"`);
    return json(episode);
  },
);

server.registerTool(
  "get_overview_stats",
  {
    title: "Get aggregate stats",
    description:
      "Success rate, average duration, collision rate, and failure-category breakdown, optionally scoped to " +
      "one dataset or source format. Matches the app's Overview page.",
    inputSchema: {
      datasetId: z.string().optional(),
      sourceFormat: z
        .enum(["lerobot", "ros2_bag", "csv_video", "hdf5", "rlds", "zarr", "webdataset"])
        .optional(),
    },
  },
  async (args) => {
    const episodes = loadEpisodes();
    const scoped = filterEpisodes(episodes, args as EpisodeFilter);
    return json(computeStats(scoped));
  },
);

server.registerTool(
  "compare_policies",
  {
    title: "Compare two policy versions",
    description:
      "Regression report between a baseline and candidate policyVersion: per-task success-rate delta, " +
      "sorted worst-first, plus each version's overall stats. Matches the app's Compare page. Call " +
      "list_policy_versions first if you don't already know the exact version strings.",
    inputSchema: {
      baselineVersion: z.string(),
      candidateVersion: z.string(),
    },
  },
  async ({ baselineVersion, candidateVersion }) => {
    const episodes = loadEpisodes();
    const result = compareVersions(episodes, baselineVersion, candidateVersion);
    return json(result);
  },
);

server.registerTool(
  "list_policy_versions",
  {
    title: "List policy versions",
    description: "Every distinct policyVersion present in the data, with episode counts. Use before compare_policies.",
    inputSchema: {},
  },
  async () => {
    const episodes = loadEpisodes();
    const counts = new Map<string, number>();
    for (const e of episodes) counts.set(e.policyVersion, (counts.get(e.policyVersion) ?? 0) + 1);
    const versions = Array.from(counts.entries())
      .map(([policyVersion, episodeCount]) => ({ policyVersion, episodeCount }))
      .sort((a, b) => b.episodeCount - a.episodeCount);
    return json({ versions });
  },
);

server.registerTool(
  "list_failure_categories",
  {
    title: "List failure categories",
    description: "The fixed set of failure categories the schema supports, with their display labels.",
    inputSchema: {},
  },
  async () => {
    return json(
      Object.entries(FAILURE_CATEGORY_LABEL).map(([category, label]) => ({ category, label })),
    );
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("robot-eval-platform MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
