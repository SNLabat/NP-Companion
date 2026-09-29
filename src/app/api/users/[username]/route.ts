import { getSource } from "@/lib/source";
import { cached, handle, noStore } from "@/lib/http";

/** GET /api/users/:username -> Author */
export async function GET(_req: Request, ctx: RouteContext<"/api/users/[username]">) {
  const { username } = await ctx.params;
  if (!username || username.length > 64) return noStore({ error: "Bad username" }, 400);
  return handle(
    () => getSource().userByUsername(username),
    (user) => (user ? cached(user, 300, 3600) : noStore({ error: "Not found" }, 404)),
  );
}
