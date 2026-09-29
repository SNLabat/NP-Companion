import { getSource } from "@/lib/source";
import { cached, handle, isId, noStore } from "@/lib/http";

/** GET /api/posts/:id -> Thread (post, ancestors, replies) */
export async function GET(_req: Request, ctx: RouteContext<"/api/posts/[id]">) {
  const { id } = await ctx.params;
  if (!isId(id)) return noStore({ error: "Bad id" }, 400);
  return handle(
    () => getSource().thread(id),
    (thread) => (thread ? cached(thread, 10, 60) : noStore({ error: "Not found" }, 404)),
  );
}
