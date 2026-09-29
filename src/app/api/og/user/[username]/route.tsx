import { getSource } from "@/lib/source";
import { ogCard } from "@/lib/og";

export async function GET(_req: Request, ctx: RouteContext<"/api/og/user/[username]">) {
  const { username } = await ctx.params;
  const user = await getSource()
    .userByUsername(decodeURIComponent(username))
    .catch(() => null);
  const author = user ?? { displayName: decodeURIComponent(username), username: decodeURIComponent(username) };
  return ogCard({ author, text: `See what ${author.displayName} is posting on Twatter.`, footer: "Profile" });
}
