"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth, useCurrentUser } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";

type Resource = Record<string, string> & { _row?: number };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function ResourcesPage() {
  const { canWrite } = useAuth();
  const me = useCurrentUser();
  const toast = useToast();

  const [resources, setResources] = useState<Resource[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/resources")
      .then((r) => r.json())
      .then((d) => {
        setResources(d.resources || []);
        setConfigured(d.configured !== false);
      })
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      !q
        ? resources
        : resources.filter((r) =>
            Object.entries(r).some(
              ([k, v]) => k !== "_row" && String(v).toLowerCase().includes(q)
            )
          ),
    [resources, q]
  );

  // Group by category, sorted; categories with no name fall under "Other".
  const groups = useMemo(() => {
    const map: Record<string, Resource[]> = {};
    filtered.forEach((r) => {
      const cat = r.category?.trim() || "Other";
      (map[cat] || (map[cat] = [])).push(r);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const existingCats = useMemo(
    () =>
      Array.from(new Set(resources.map((r) => r.category?.trim()).filter(Boolean))).sort(),
    [resources]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.category?.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, user_id: me.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to add");
      toast.success("Listing added");
      setAdding(false);
      setForm({});
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="title-block">
        <h1>Greyton Resources</h1>
        {canWrite && configured && (
          <button className="add-mini" onClick={() => setAdding(true)}>
            + Add listing
          </button>
        )}
      </div>

      {!configured ? (
        <p className="desc-text" style={{ color: "var(--mist)" }}>
          Greyton Resources isn&apos;t connected yet.
          {me.role === "owner" ? " Add the Google service-account env vars to enable it." : ""}
        </p>
      ) : (
        <>
          <div className="res-searchbar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search resources on this page…"
              aria-label="Search resources"
            />
            {query && (
              <button className="res-clear" onClick={() => setQuery("")} aria-label="Clear">
                ×
              </button>
            )}
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 120, borderRadius: 9 }} />
          ) : filtered.length === 0 ? (
            <p className="desc-text" style={{ color: "var(--mist)" }}>
              {resources.length === 0 ? "No resources yet." : `No matches for “${query}”.`}
            </p>
          ) : (
            <>
              {/* Index — jump to a category */}
              {!q && groups.length > 1 && (
                <div className="res-index">
                  {groups.map(([cat, items]) => (
                    <a
                      key={cat}
                      href={`#cat-${slug(cat)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(`cat-${slug(cat)}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      {cat} <span>{items.length}</span>
                    </a>
                  ))}
                </div>
              )}

              {groups.map(([cat, items]) => (
                <section className="res-section" id={`cat-${slug(cat)}`} key={cat}>
                  <h2 className="res-cat">{cat}</h2>
                  <div className="res-grid">
                    {items.map((r, i) => (
                      <div className="res-card" key={r._row ?? i}>
                        <div className="res-name">{r.name || "Untitled"}</div>
                        {r.contact && <div className="res-line">{r.contact}</div>}
                        {r.phone && (
                          <a className="res-line link" href={`tel:${r.phone.replace(/\s+/g, "")}`}>
                            {r.phone}
                          </a>
                        )}
                        {r.email && (
                          <a className="res-line link" href={`mailto:${r.email}`}>
                            {r.email}
                          </a>
                        )}
                        {r.website && (
                          <a className="res-line link" href={/^https?:\/\//.test(r.website) ? r.website : `https://${r.website}`} target="_blank" rel="noopener noreferrer">
                            {r.website.replace(/^https?:\/\//, "")}
                          </a>
                        )}
                        {r.notes && <div className="res-notes">{r.notes}</div>}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </>
      )}

      {adding && (
        <div className="modal-overlay" onClick={() => !busy && setAdding(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h3>Add a resource</h3>
            <label>Name <span style={{ color: "var(--brass)" }}>*</span></label>
            <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            <label>Category <span style={{ color: "var(--brass)" }}>*</span></label>
            <input list="res-cats" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Trades, Shops, Emergency" />
            <datalist id="res-cats">
              {existingCats.map((c) => <option key={c} value={c} />)}
            </datalist>
            {(["contact", "phone", "email", "website", "notes"] as const).map((f) => (
              <div key={f}>
                <label>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                <input value={form[f] || ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div className="flex gap-2 pt-4">
              <button type="submit" disabled={!form.name?.trim() || !form.category?.trim() || busy} className="flex-1 bg-bottle text-white rounded py-2 text-[13px] font-medium hover:opacity-90 disabled:opacity-50">
                {busy ? "Adding…" : "Add listing"}
              </button>
              <button type="button" onClick={() => setAdding(false)} disabled={busy} className="flex-1 border border-[#D7DECF] rounded py-2 text-[13px] text-sage hover:bg-whitewash disabled:opacity-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
