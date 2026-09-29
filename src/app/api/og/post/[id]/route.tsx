import { getSource } from "@/lib/source";
import { ogCard } from "@/lib/og";
import { SITE_NAME } from "@/lib/site";

export async function GET(_req: Request, ctx: RouteContext<"/api/og/post/[id]">) {
  const { id } = await ctx.params;
  const thread = /^[A-Za-z0-9_-]{1,64}$/.test(id) ? await getSource().thread(id).catch(() => null) : null;
  if (!thread) return ogCard({ author: { displayName: SITE_NAME, username: "twatter" }, text: "This post isn't available." });

  const p = thread.post;
  const stats = [p.likeCount && `♥ ${p.likeCount}`, p.replyCount && `💬 ${p.replyCount}`].filter(Boolean).join("   ");
  return ogCard({ author: p.author, text: p.content || "📷 Photo", footer: stats || undefined });
}
