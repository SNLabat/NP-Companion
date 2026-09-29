import { getSource } from "@/lib/source";
import { cached, handle, isId, noStore } from "@/lib/http";

/** GET /api/posts/:id/replies -> Post[] */
export async function GET(_req: Request, ctx: RouteContext<"/api/posts/[id]/replies">) {
  const { id } = await ctx.params;
  if (!isId(id)) return noStore({ error: "Bad id" }, 400);
  return handle(() => getSource().replies(id), (replies) => cached(replies, 10, 60));
}
