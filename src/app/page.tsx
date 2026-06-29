"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import EditBanner from "@/components/EditBanner";
import { useEditMode } from "@/components/EditModeContext";
import { useCurrentUser } from "@/components/AuthProvider";
import { usePages } from "@/hooks/usePages";

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


export default function HomePage() {
  const { pages, loading } = usePages();
  const toast = useToast();
  const { editMode } = useEditMode();
  const mockUser = useCurrentUser();
  const [assigned, setAssigned] = useState<any[]>([]);
  const [tagsByPage, setTagsByPage] = useState<Record<string, any[]>>({});
  const [slides, setSlides] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [activityShown, setActivityShown] = useState(10);

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

          <p className="carousel-note">
            Only Deven and Wernardt can add photos here{isOwner ? " (turn on edit mode)" : ""}.
            Click any photo to view full size.
          </p>

          <div className="title-block">
            <div>
              <h1>Home</h1>
              <div className="title-meta">Welcome back, {mockUser.short_name}</div>
            </div>
          </div>

          {editMode && <EditBanner />}

          {/* Assigned to me */}
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
                  {a.page && <div className="who">{breadcrumbFor(a.page.id)}</div>}
                  {a.page && (tagsByPage[a.page.id]?.length ?? 0) > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {tagsByPage[a.page.id].map((t: any) => (
                        <span className="tag-chip" key={t.id}>
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
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

          {/* Recent activity */}
          <h2 className="section-h">Recent activity</h2>
          <div className="home-card activity">
            {activity.length > 0 ? (
              <>
                <ul>
                  {activity.slice(0, activityShown).map((a) => (
                    <li key={a.id} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ flex: 1 }}>
                        {a.who && <b>{a.who}</b>} {a.action}{" "}
                        {a.slug ? (
                          <a
                            href={`/${a.slug}`}
                            style={{ color: "var(--sage)", textDecoration: "underline" }}
                          >
                            {a.target}
                          </a>
                        ) : (
                          <b>{a.target}</b>
                        )}
                        <span className="when">{timeAgo(a.when)}</span>
                      </span>
                      {isOwner && a.type !== "page" && (
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
    </>
  );
}
