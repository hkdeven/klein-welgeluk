"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import EditBanner from "@/components/EditBanner";
import EventDetailModal from "@/components/EventDetailModal";
import { useEditMode } from "@/components/EditModeContext";
import { useCurrentUser, useAuth } from "@/components/AuthProvider";
import { usePages } from "@/hooks/usePages";
import { tagColor } from "@/lib/tagColor";

const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`;

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}

// "Today", "Tomorrow", or e.g. "Wed, 8 Jul" — plus the time if set.
function eventWhen(dateStr: string, time?: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  let label =
    days === 0
      ? "Today"
      : days === 1
      ? "Tomorrow"
      : new Date(dateStr).toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
  if (time) {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    label += ` · ${hour % 12 === 0 ? 12 : hour % 12}:${m} ${ampm}`;
  }
  return label;
}

const eventTypeClass = (t: string) =>
  t === "meeting"
    ? "bg-[#D7DECF] text-bottle"
    : t === "delivery"
    ? "bg-[#FBF3E9] text-brass"
    : "bg-[#EBD4D4] text-[#7A3B3B]";

// Colored icon chip per activity type for the Recent activity feed.
const ACTIVITY_STYLE: Record<string, { bg: string; fg: string }> = {
  comment: { bg: "#E3ECE0", fg: "#3D5A3F" },
  photo: { bg: "#F3E4CC", fg: "#6E4E22" },
  document: { bg: "#DCE6EE", fg: "#2F4A63" },
  event: { bg: "#E7E0EE", fg: "#4E3A63" },
  page: { bg: "#D8E9E6", fg: "#2E5852" },
};

function ActivityChip({ type }: { type: string }) {
  const s = ACTIVITY_STYLE[type] || { bg: "#F1EFE8", fg: "#5F5E5A" };
  const p = {
    width: 14,
    height: 14,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  let icon;
  switch (type) {
    case "comment":
      icon = (
        <svg {...p}>
          <path d="M4 5.5h12v7H8.5L5 15.5V12.5H4z" />
        </svg>
      );
      break;
    case "photo":
      icon = (
        <svg {...p}>
          <rect x="3" y="6" width="14" height="10" rx="2" />
          <circle cx="10" cy="11" r="2.4" />
          <path d="M7.5 6l1.2-1.8h2.6L12.5 6" />
        </svg>
      );
      break;
    case "document":
      icon = (
        <svg {...p}>
          <path d="M6 3h5.5L15 6.5V17H6z" />
          <path d="M11.5 3v3.5H15" />
        </svg>
      );
      break;
    case "event":
      icon = (
        <svg {...p}>
          <rect x="3.5" y="4.5" width="13" height="12" rx="1.5" />
          <path d="M3.5 8.2h13M7 3v3M13 3v3" />
        </svg>
      );
      break;
    default:
      icon = (
        <svg {...p}>
          <path d="M10 5v10M5 10h10" />
        </svg>
      );
  }
  return (
    <span
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        background: s.bg,
        color: s.fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
    >
      {icon}
    </span>
  );
}


export default function HomePage() {
  const { pages, loading } = usePages();
  const toast = useToast();
  const { editMode } = useEditMode();
  const { isGuest } = useAuth();
  const mockUser = useCurrentUser();
  const [assigned, setAssigned] = useState<any[]>([]);
  const [tagsByPage, setTagsByPage] = useState<Record<string, any[]>>({});
  const [stageByPage, setStageByPage] = useState<Record<string, string>>({});
  const [slides, setSlides] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [activityShown, setActivityShown] = useState(10);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const ACTIVITY_ENDPOINT: Record<string, string> = {
    comment: "comments",
    photo: "photos",
    document: "documents",
    event: "calendar",
  };

  const deleteActivity = async (item: any) => {
    const ep = ACTIVITY_ENDPOINT[item.type];
    if (!ep) return; // page-creation items aren't removable from the feed
    if (!confirm(`Remove this activity? This deletes the underlying ${item.type}.`)) return;
    try {
      const res = await fetch(`/api/${ep}/${item.refId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
      setActivity((prev) => prev.filter((a) => a.id !== item.id));
      toast.success("Activity removed");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Open a calendar event (from the activity feed) in the popup, not the calendar page.
  const openEventFromActivity = async (refId: string) => {
    try {
      const ev = await fetch(`/api/calendar/${refId}`).then((r) => r.json());
      if (ev && ev.id) setSelectedEvent(ev);
    } catch {
      /* ignore */
    }
  };
  const [slideIndex, setSlideIndex] = useState(0);

  const isOwner = mockUser.role === "owner";
  const canEdit = isOwner && editMode;

  // Flatten pages so we can resolve a page's parent for the breadcrumb line.
  const all: any[] = [];
  pages.forEach((p) => {
    all.push(p);
    (p.children || []).forEach((c) => all.push(c));
  });
  const breadcrumbFor = (pageId: string) => {
    const pg = all.find((p) => p.id === pageId);
    if (!pg) return "";
    const parent = pg.parent_id ? all.find((p) => p.id === pg.parent_id) : null;
    return parent ? `${parent.title} / ${pg.title}` : pg.title;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/assignments?user_id=${mockUser.id}`);
        const data = await res.json();
        const list = data.assignments || [];
        setAssigned(list);

        // Pull tags for each assigned page so they can show on the card.
        const entries = await Promise.all(
          list
            .filter((a: any) => a.page)
            .map(async (a: any) => {
              const t = await fetch(`/api/tags?page_id=${a.page.id}`).then((r) => r.json());
              return [a.page.id, t.tags || []] as const;
            })
        );
        setTagsByPage(Object.fromEntries(entries));

        // Current stage for each assigned page.
        const ids = list.filter((a: any) => a.page).map((a: any) => a.page.id);
        if (ids.length) {
          const cu = await fetch(`/api/stages?ids=${ids.join(",")}`).then((r) => r.json());
          setStageByPage(cu.currents || {});
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

  useEffect(() => {
    fetch("/api/carousel")
      .then((r) => r.json())
      .then((d) => setSlides(d.photos || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => setActivity(d.activity || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mockUser.id) return;
    fetch(`/api/calendar?upcoming_for=${mockUser.id}`)
      .then((r) => r.json())
      .then((d) => setUpcoming(d.events || []))
      .catch(() => {});
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, [mockUser.id]);

  const uploadSlide = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploaded_by", mockUser.id);
      const res = await fetch("/api/carousel", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to add photo");
      const photo = await res.json();
      setSlides([...slides, photo]);
      setSlideIndex(slides.length);
      e.target.value = "";
      toast.success("Photo added to carousel");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const deleteSlide = async (id: string) => {
    try {
      const res = await fetch(`/api/carousel/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete photo");
      const next = slides.filter((s) => s.id !== id);
      setSlides(next);
      setSlideIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
      toast.success("Photo removed");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const prevSlide = () =>
    setSlideIndex((i) => (slides.length ? (i - 1 + slides.length) % slides.length : 0));
  const nextSlide = () =>
    setSlideIndex((i) => (slides.length ? (i + 1) % slides.length : 0));

  if (loading) {
    return <p className="text-sage">Loading...</p>;
  }

  return (
    <>
          {/* Photo carousel */}
          <div className="carousel">
            <div
              className="slides"
              style={{ transform: `translateX(-${slideIndex * 100}%)` }}
            >
              {slides.length > 0 ? (
                slides.map((s) => {
                  const url = storageUrl(`photos/${s.storage_path}`);
                  return (
                    <div className="slide" key={s.id}>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={s.caption || ""} />
                      </a>
                      {s.caption && <div className="caption">{s.caption}</div>}
                      {canEdit && (
                        <button
                          onClick={() => deleteSlide(s.id)}
                          style={{
                            position: "absolute",
                            bottom: 12,
                            right: 12,
                            background: "rgba(0,0,0,0.55)",
                            color: "#fff",
                            fontSize: 11,
                            padding: "4px 10px",
                            borderRadius: 3,
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          ✕ remove
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="slide">
                  Klein Welgeluk
                  <div className="caption">Greyton · build diary</div>
                </div>
              )}
            </div>

            {slides.length > 1 && (
              <>
                <button className="arrow left" onClick={prevSlide}>
                  ‹
                </button>
                <button className="arrow right" onClick={nextSlide}>
                  ›
                </button>
                <div className="nav-dot">
                  {slides.map((s, i) => (
                    <span key={s.id} className={i === slideIndex ? "active" : ""} />
                  ))}
                </div>
              </>
            )}

            {canEdit && (
              <label className="add-slide" style={{ cursor: "pointer" }}>
                + add photo
                <input type="file" accept="image/*" onChange={uploadSlide} className="hidden" />
              </label>
            )}
          </div>

          <p className="carousel-note">Click any photo to view full size.</p>

          <div className="title-block">
            <div>
              <h1>Home</h1>
              <div className="title-meta">
                {isGuest
                  ? "Make yourself at home — we're still building it."
                  : `Welcome back, ${mockUser.short_name}`}
              </div>
            </div>
          </div>

          {editMode && <EditBanner />}

          {/* Upcoming events — events you're tagged in within the next 7 days
              (above Assigned; hidden entirely when there are none) */}
          {upcoming.length > 0 && (
            <>
              <h2 className="section-h">Upcoming events</h2>
              <div className="sub-grid">
                {upcoming.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="sub-card text-left"
                    style={{ cursor: "pointer" }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
                    >
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded ${eventTypeClass(
                          ev.event_type
                        )}`}
                      >
                        {ev.event_type}
                      </span>
                      <span className="who" style={{ margin: 0 }}>
                        {eventWhen(ev.event_date, ev.event_time)}
                      </span>
                    </div>
                    <div className="name">{ev.title}</div>
                    {ev.description && (
                      <div className="row" style={{ color: "var(--sage)" }}>
                        {ev.description.length > 80
                          ? ev.description.slice(0, 80) + "…"
                          : ev.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Assigned to me (hidden for read-only guests) */}
          {!isGuest && (
            <>
          <h2 className="section-h">Assigned to me</h2>
          {assigned.length > 0 ? (
            <div className="sub-grid">
              {assigned.map((a) => (
                <a
                  key={a.id}
                  href={a.page ? `/${a.page.slug}` : "#"}
                  className="sub-card"
                >
                  <div className="name">{a.page?.title || "Page"}</div>
                  {a.page && (
                    <div className="row">
                      Current status:{" "}
                      <span className="current">
                        {stageByPage[a.page.id] || "Not started"}
                      </span>
                    </div>
                  )}
                  {a.page && (tagsByPage[a.page.id]?.length ?? 0) > 0 && (
                    <div className="card-tags">
                      {tagsByPage[a.page.id].map((t: any) => (
                        <span className="card-tag" key={t.id} style={tagColor(t.name)}>
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {a.page && <div className="who">{breadcrumbFor(a.page.id)}</div>}
                </a>
              ))}
            </div>
          ) : (
            <div className="home-card">
              <p className="text-sage" style={{ fontSize: 13 }}>
                Nothing assigned to you right now
              </p>
            </div>
          )}
            </>
          )}

          {/* Recent activity */}
          <h2 className="section-h">Recent activity</h2>
          <div className="home-card activity">
            {activity.length > 0 ? (
              <>
                <ul>
                  {activity.slice(0, activityShown).map((a) => (
                    <li
                      key={a.id}
                      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "5px 0" }}
                    >
                      <ActivityChip type={a.type} />
                      <span style={{ flex: 1, lineHeight: 1.45, paddingTop: 1 }}>
                        {a.who && <b>{a.who}</b>} {a.action}{" "}
                        {a.slug ? (
                          <a
                            href={`/${a.slug}`}
                            style={{ color: "var(--sage)", textDecoration: "underline" }}
                          >
                            {a.target}
                          </a>
                        ) : a.type === "event" ? (
                          <button
                            onClick={() => openEventFromActivity(a.refId)}
                            style={{
                              color: "var(--sage)",
                              textDecoration: "underline",
                              cursor: "pointer",
                            }}
                          >
                            {a.target}
                          </button>
                        ) : (
                          <b>{a.target}</b>
                        )}
                        <span className="when">{timeAgo(a.when)}</span>
                      </span>
                      {isOwner && editMode && a.type !== "page" && (
                        <span className="del-badge" onClick={() => deleteActivity(a)}>
                          ✕
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {activity.length > 10 && (
                  <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                    {activityShown < activity.length && (
                      <button
                        onClick={() => setActivityShown((n) => n + 10)}
                        className="text-sage text-[12px] underline hover:text-bottle"
                      >
                        Show 10 more
                      </button>
                    )}
                    {activityShown < activity.length ? (
                      <button
                        onClick={() => setActivityShown(activity.length)}
                        className="text-sage text-[12px] underline hover:text-bottle"
                      >
                        View all ({activity.length})
                      </button>
                    ) : (
                      <button
                        onClick={() => setActivityShown(10)}
                        className="text-sage text-[12px] underline hover:text-bottle"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sage" style={{ fontSize: 13 }}>
                No recent activity yet
              </p>
            )}
          </div>

          {selectedEvent && (
            <EventDetailModal
              event={selectedEvent}
              users={users}
              onClose={() => setSelectedEvent(null)}
            />
          )}
    </>
  );
}
