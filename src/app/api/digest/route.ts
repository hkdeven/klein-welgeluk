import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    })
  : null;

const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

// Weekly digest: aggregates a Sun–Sat week's activity.
// ?start=<ISO, inclusive Sunday 00:00> &end=<ISO, exclusive next Sunday 00:00>
export async function GET(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }
    const start = req.nextUrl.searchParams.get("start");
    const end = req.nextUrl.searchParams.get("end");
    if (!start || !end) {
      return NextResponse.json({ error: "start and end are required" }, { status: 400 });
    }

    const [photos, comments, documents, decisions, snagsNew, snagsFixed, stageChanges] =
      await Promise.all([
        supabase.from("photos").select("page_id, created_at").gte("created_at", start).lt("created_at", end),
        supabase.from("comments").select("page_id").not("page_id", "is", null).gte("created_at", start).lt("created_at", end),
        supabase.from("documents").select("page_id").gte("created_at", start).lt("created_at", end),
        supabase.from("decisions").select("page_id, title, created_at").gte("created_at", start).lt("created_at", end),
        supabase.from("snags").select("page_id").gte("created_at", start).lt("created_at", end),
        supabase.from("snags").select("page_id").not("fixed_at", "is", null).gte("fixed_at", start).lt("fixed_at", end),
        supabase.from("stage_changes").select("page_id, stage_name, created_at").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: true }),
      ]);

    // Coming up: events dated in the 7 days after the week ends.
    const endDate = new Date(end);
    const comingEnd = new Date(endDate);
    comingEnd.setDate(comingEnd.getDate() + 7);
    const events = await supabase
      .from("calendar_events")
      .select("title, event_date, event_time")
      .gte("event_date", dateOnly(endDate))
      .lt("event_date", dateOnly(comingEnd))
      .order("event_date", { ascending: true });

    // Per-page activity tally.
    const act: Record<string, any> = {};
    const bump = (pid: string, key: string) => {
      if (!pid) return;
      const e = act[pid] || (act[pid] = { photos: 0, comments: 0, documents: 0, decisions: 0, snagsNew: 0, snagsFixed: 0, stageMoved: false });
      if (key === "stageMoved") e.stageMoved = true;
      else e[key] += 1;
    };
    (photos.data || []).forEach((r: any) => bump(r.page_id, "photos"));
    (comments.data || []).forEach((r: any) => bump(r.page_id, "comments"));
    (documents.data || []).forEach((r: any) => bump(r.page_id, "documents"));
    (decisions.data || []).forEach((r: any) => bump(r.page_id, "decisions"));
    (snagsNew.data || []).forEach((r: any) => bump(r.page_id, "snagsNew"));
    (snagsFixed.data || []).forEach((r: any) => bump(r.page_id, "snagsFixed"));

    // Progress = latest stage change per page this week.
    const progressMap: Record<string, string> = {};
    (stageChanges.data || []).forEach((r: any) => {
      progressMap[r.page_id] = r.stage_name;
      bump(r.page_id, "stageMoved");
    });

    const pageIds = Array.from(
      new Set([
        ...Object.keys(act),
        ...Object.keys(progressMap),
        ...(decisions.data || []).map((d: any) => d.page_id).filter(Boolean),
      ])
    );

    const pageMap: Record<string, { title: string; slug: string; parent_id: string | null }> = {};
    const currentStage: Record<string, string> = {};
    if (pageIds.length) {
      const [pm, st] = await Promise.all([
        supabase.from("pages").select("id, title, slug, parent_id").in("id", pageIds),
        supabase.from("stages").select("page_id, name").in("page_id", pageIds).eq("is_current", true),
      ]);
      (pm.data || []).forEach((p: any) => (pageMap[p.id] = { title: p.title, slug: p.slug, parent_id: p.parent_id }));
      (st.data || []).forEach((s: any) => (currentStage[s.page_id] = s.name));
    }

    const progress = Object.entries(progressMap)
      .filter(([pid]) => pageMap[pid])
      .map(([pid, stage]) => ({ page: pageMap[pid].title, slug: pageMap[pid].slug, stage }));

    const decisionsList = (decisions.data || []).map((d: any) => ({
      title: d.title,
      page: pageMap[d.page_id]?.title || null,
      slug: pageMap[d.page_id]?.slug || null,
    }));

    const comingUp = (events.data || []).map((e: any) => ({
      title: e.title,
      date: e.event_date,
      time: e.event_time || null,
    }));

    // Activity by area — sub-pages only (parent_id set), busiest first.
    const areas = Object.entries(act)
      .filter(([pid]) => pageMap[pid] && pageMap[pid].parent_id)
      .map(([pid, a]: any) => ({
        page: pageMap[pid].title,
        slug: pageMap[pid].slug,
        stage: currentStage[pid] || null,
        ...a,
      }))
      .sort(
        (a: any, b: any) =>
          b.photos + b.comments + b.documents + b.decisions + b.snagsNew + b.snagsFixed -
          (a.photos + a.comments + a.documents + a.decisions + a.snagsNew + a.snagsFixed)
      );

    const total =
      (photos.data?.length || 0) +
      (comments.data?.length || 0) +
      (documents.data?.length || 0) +
      (decisions.data?.length || 0) +
      (snagsNew.data?.length || 0) +
      (snagsFixed.data?.length || 0) +
      (stageChanges.data?.length || 0);

    return NextResponse.json({ progress, decisions: decisionsList, comingUp, areas, total });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("Digest error:", msg);
    return NextResponse.json({ error: `Digest error: ${msg}` }, { status: 500 });
  }
}
