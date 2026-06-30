import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export type NotifType = "event_tagged" | "comment" | "mention" | "stage_moved";

export interface NotifInput {
  user_id: string;
  type: NotifType;
  title: string;
  body?: string | null;
  link?: string | null;
  ref_id?: string | null;
  actor_id?: string | null;
}

// Best-effort insert of notification rows. Never throws — a notification failure
// must not break the action that triggered it. Drops self-notifications
// (recipient === actor) and de-dupes the same (user, type, ref) within one batch.
export async function notifyUsers(notifs: NotifInput[]) {
  if (!supabase || !notifs.length) return;
  const seen = new Set<string>();
  const rows = notifs.filter((n) => {
    if (!n.user_id || n.user_id === n.actor_id) return false;
    const key = `${n.user_id}:${n.type}:${n.ref_id ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!rows.length) return;
  try {
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) console.error("notifyUsers insert error:", error.message);
  } catch (e) {
    console.error("notifyUsers error:", (e as Error).message);
  }
}

// Strip HTML tags and collapse whitespace — used for notification snippets.
export function plainText(html: string) {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
