import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnvelopeFigure, OutcomesFigure, TimingFigure } from "@/components/blog/eval-figures";
import { UseCaseCards } from "@/components/blog/usecase-cards";
import { VendorQuestions } from "@/components/blog/vendor-questions";
import { BreakevenChart, BreakevenGrid } from "@/components/blog/raas-figures";
import { BankruptcyClauses } from "@/components/blog/bankruptcy-clauses";
import { PaybackGrid } from "@/components/blog/labor-figures";
import { SiteFunnel, WarningTimeline } from "@/components/blog/kroger-figures";
import { FundingChart, DisclosureScorecard } from "@/components/blog/humanoid-figures";
import { BarComparison, RecordChecklist } from "@/components/blog/method-figures";
import { DetectabilityCurve } from "@/components/blog/detectability-figure";
import { ClaimsScorecard, RateQuestions } from "@/components/blog/pickrate-figures";
import { HeightComparison, FloorStandards } from "@/components/blog/architecture-figures";
import { AcceptanceHinge, ClauseChecklist } from "@/components/blog/contract-figures";
import { BLOG_POSTS, formatPostDate, getPost, type BlogBlock } from "@/data/blog-posts";

// Client components must be imported as named exports to stay valid
// references in this server component; indexing into an object exported
// from the client module resolves to undefined here.
const FIGURES = {
  outcomes: OutcomesFigure,
  envelope: EnvelopeFigure,
  timing: TimingFigure,
  usecases: UseCaseCards,
  questions: VendorQuestions,
  "raas-chart": BreakevenChart,
  "raas-grid": BreakevenGrid,
  bankruptcy: BankruptcyClauses,
  payback: PaybackGrid,
  funnel: SiteFunnel,
  timeline: WarningTimeline,
  funding: FundingChart,
  scorecard: DisclosureScorecard,
  comparison: BarComparison,
  record: RecordChecklist,
  detectability: DetectabilityCurve,
  claims: ClaimsScorecard,
  "rate-questions": RateQuestions,
  heights: HeightComparison,
  floors: FloorStandards,
  hinge: AcceptanceHinge,
  clauses: ClauseChecklist,
} as const;

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Blog | Robot Eval" };
  return { title: `${post.title} | Robot Eval`, description: post.summary };
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-5 text-[17px] font-semibold text-text">{block.text}</h2>;
    case "h3":
      return <h3 className="mt-3 text-[15.5px] font-semibold text-text">{block.text}</h3>;
    case "p":
      return <p className="text-[15px] leading-relaxed text-dim">{block.text}</p>;
    case "ul":
      return (
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed text-dim">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-[13.5px] leading-relaxed text-faint">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-border bg-inset">
                {block.headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-text">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-divider last:border-b-0 align-top">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 leading-relaxed text-dim">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-md border border-border bg-inset px-3.5 py-3 font-mono text-[13px] leading-relaxed text-dim">
          {block.code}
        </pre>
      );
    case "figure": {
      const Figure = FIGURES[block.figure];
      return <Figure />;
    }
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-1.5 text-[13px] text-faint">
        <Link href="/blog" className="hover:text-text">
          Blog
        </Link>
        <span>/</span>
        <span className="text-dim">{post.slug}</span>
      </div>

      <header>
        <h1 className="text-[22px] leading-snug font-semibold text-text">{post.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] text-mute">{formatPostDate(post.date)}</span>
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-[2px] border border-border-strong px-1 py-px text-[11px] text-faint"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-3.5">
        {post.body.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
    </article>
  );
}
