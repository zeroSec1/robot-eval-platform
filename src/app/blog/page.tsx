import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BLOG_POSTS, formatPostDate } from "@/data/blog-posts";

export const metadata: Metadata = {
  title: "Blog | Robot Eval",
  description: "Engineering notes from building the Robot Eval platform.",
};

export default function BlogPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-semibold text-text">Blog</h1>
        <p className="mt-1 text-[15px] text-faint">
          Engineering notes from building this platform: real data, real bugs, real fixes.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <Card key={post.slug} className="transition-colors hover:border-border-strong">
            <Link href={`/blog/${post.slug}`} className="block px-4 py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-[16px] font-medium text-text">{post.title}</h2>
                <span className="text-[12px] whitespace-nowrap text-mute">
                  {formatPostDate(post.date)}
                </span>
              </div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-faint">{post.summary}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-[2px] border border-border-strong px-1 py-px text-[11px] text-faint"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
