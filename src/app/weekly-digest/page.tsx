"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, useCurrentUser } from "@/components/AuthProvider";

const sundayOf = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
const fmtEvent = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

// Small activity-type tag (matches the app's muted activity palette).
const TAGS: Record<string, { bg: string; fg: string; icon: string; label: (n: number) => string }> = {
  photos: { bg: "#F3E4CC", fg: "#6E4E22", icon: "📸", label: (n) => `${n} photo${n === 1 ? "" : "s"}` },
  comments: { bg: "#E3ECE0", fg: "#3D5A3F", icon: "💬", label: (n) => `${n}` },
  documents: { bg: "#DCE6EE", fg: "#2F4A63", icon: "📄", label: (n) => `${n} doc${n === 1 ? "" : "s"}` },
  decisions: { bg: "#E7E0EE", fg: "#4E3A63", icon: "◈", label: (n) => `${n} decision${n === 1 ? "" : "s"}` },
  snagsFixed: { bg: "#FAECE7", fg: "#993C1D", icon: "✓", label: (n) => `${n} snag${n === 1 ? "" : "s"} fixed` },
  snagsNew: { bg: "#F1EFE8", fg: "#5F5E5A", icon: "＋", label: (n) => `${n} new snag${n === 1 ? "" : "s"}` },
};

export default function WeeklyDigestPage() {
  const { isGuest } = useAuth();
  const me = useCurrentUser();
  const isOwner = me.role === "owner";

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [weekStart, setWeekStart] = useState(() => sundayOf(new Date()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const weekEnd = addDays(weekStart, 7); // exclusive
  const isCurrentWeek = weekStart.getTime() === sundayOf(new Date()).getTime();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setEnabled(d.settings?.weekly_digest_enabled === true))
      .catch(() => setEnabled(false));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/digest?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [weekStart]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  if (isGuest) {
    return (
      <>
        <div className="title-block"><h1>Weekly Digest</h1></div>
        <p className="desc-text" style={{ color: "var(--mist)" }}>The weekly digest isn&apos;t available in guest view.</p>
      </>
    );
  }

  if (enabled === false) {
    return (
      <>
        <div className="title-block"><h1>Weekly Digest</h1></div>
        <p className="desc-text" style={{ color: "var(--mist)" }}>
          The weekly digest is currently turned off.{isOwner ? " Enable it in your profile." : ""}
        </p>
      </>
    );
  }

  const rangeLabel = `${fmtDay(weekStart)} – ${fmtDay(addDays(weekStart, 6))}, ${addDays(weekStart, 6).getFullYear()}`;

  return (
    <>
      <div className="title-block">
        <div>
          <h1>Weekly Digest</h1>
          <div className="dg-range">
            {rangeLabel}
            {data ? ` · ${data.total} update${data.total === 1 ? "" : "s"}` : ""}
          </div>
        </div>
        <div className="dg-nav">
          <button onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Previous week">‹</button>
          {!isCurrentWeek && <button onClick={() => setWeekStart(sundayOf(new Date()))}>This week</button>}
          <button onClick={() => setWeekStart((w) => addDays(w, 7))} disabled={isCurrentWeek} aria-label="Next week">›</button>
        </div>
      </div>

      {loading || !data ? (
        <div className="dg-skeleton">
          <div className="skeleton" style={{ height: 90, borderRadius: 9, marginBottom: 18 }} />
          <div className="skeleton" style={{ height: 140, borderRadius: 9 }} />
        </div>
      ) : data.total === 0 ? (
        <p className="desc-text" style={{ color: "var(--mist)" }}>Nothing was recorded this week.</p>
      ) : (
        <>
          <div className="dg-top3">
            <div className="dg-blk">
              <div className="dg-blkh" style={{ color: "#3D5A3F", borderColor: "#C0DD97" }}>Progress</div>
              {data.progress.length ? (
                data.progress.map((p: any, i: number) => (
                  <div className="dg-li" key={i}>
                    {p.slug ? <Link href={`/${p.slug}`}>{p.page}</Link> : p.page}
                    <span className="dg-arrow"> → {p.stage}</span>
                  </div>
                ))
              ) : (
                <div className="dg-empty">No stage changes</div>
              )}
            </div>
            <div className="dg-blk">
              <div className="dg-blkh" style={{ color: "#6E4E22", borderColor: "#E3CDA6" }}>Decisions</div>
              {data.decisions.length ? (
                data.decisions.map((d: any, i: number) => (
                  <div className="dg-li" key={i}>
                    {d.title}
                    {d.page && <span className="dg-sub"> · {d.page}</span>}
                  </div>
                ))
              ) : (
                <div className="dg-empty">No decisions logged</div>
              )}
            </div>
            <div className="dg-blk">
              <div className="dg-blkh" style={{ color: "#4E3A63", borderColor: "#CECBF6" }}>Coming up</div>
              {data.comingUp.length ? (
                data.comingUp.map((e: any, i: number) => (
                  <div className="dg-li" key={i}>
                    <span className="dg-sub">{fmtEvent(e.date)}</span> · {e.title}
                  </div>
                ))
              ) : (
                <div className="dg-empty">Nothing scheduled</div>
              )}
            </div>
          </div>

          <div className="dg-areas-head">Activity by area</div>
          {data.areas.length ? (
            <div className="dg-areas">
              {data.areas.map((a: any) => (
                <Link href={`/${a.slug}`} className="dg-card" key={a.slug}>
                  <div className="dg-card-h">
                    <span className="dg-card-t">{a.page}</span>
                    {a.stage && <span className="dg-stage">{a.stage}</span>}
                  </div>
                  <div className="dg-tags">
                    {a.stageMoved && <span className="dg-tag" style={{ background: "#D8E9E6", color: "#2E5852" }}>↗ stage moved</span>}
                    {(["photos", "comments", "documents", "decisions", "snagsFixed", "snagsNew"] as const).map((k) =>
                      a[k] ? (
                        <span className="dg-tag" key={k} style={{ background: TAGS[k].bg, color: TAGS[k].fg }}>
                          {TAGS[k].icon} {TAGS[k].label(a[k])}
                        </span>
                      ) : null
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="dg-empty">No sub-page activity this week.</div>
          )}
        </>
      )}
    </>
  );
}
