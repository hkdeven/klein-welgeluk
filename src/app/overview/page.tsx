"use client";

import { useEffect, useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import PageMedia from "@/components/PageMedia";
import EditBanner from "@/components/EditBanner";
import { useToast } from "@/components/Toast";
import { useEditMode } from "@/components/EditModeContext";
import { useCurrentUser } from "@/components/AuthProvider";


interface BriefSections {
  scope: string;
  mustHaves: string;
  loves: string;
  hates: string;
}

const EMPTY_BRIEF: BriefSections = {
  scope: "",
  mustHaves: "",
  loves: "",
  hates: "",
};

type BriefTab = "mustHaves" | "loves" | "hates";

const TABS: { key: BriefTab; label: string; hint: string }[] = [
  { key: "mustHaves", label: "Must-haves", hint: "Non-negotiables the design must include" },
  { key: "loves", label: "Love", hint: "Materials, styles and ideas we want" },
  { key: "hates", label: "Hate", hint: "e.g. exposed brick walls, concrete flooring" },
];

export default function OverviewPage() {
  const toast = useToast();
  const { editMode } = useEditMode();
  const mockUser = useCurrentUser();

  const isOwner = mockUser.role === "owner";
  const canEdit = isOwner && editMode;

  const [pageId, setPageId] = useState<string | null>(null);
  const [brief, setBrief] = useState<BriefSections>(EMPTY_BRIEF);
  const [savingBrief, setSavingBrief] = useState(false);
  const [activeTab, setActiveTab] = useState<BriefTab>("mustHaves");

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/pages");
        const data = await res.json();
        let overview = (data.pages || []).find((p: any) => p.slug === "overview");

        if (!overview) {
          const createRes = await fetch("/api/pages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Overview", slug: "overview" }),
          });
          if (!createRes.ok) throw new Error("Could not create overview page");
          overview = await createRes.json();
        }

        setPageId(overview.id);

        if (overview.brief) {
          try {
            setBrief({ ...EMPTY_BRIEF, ...JSON.parse(overview.brief) });
          } catch {
            setBrief({ ...EMPTY_BRIEF, scope: overview.brief });
          }
        }
      } catch (error) {
        toast.error((error as Error).message);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveBrief = async () => {
    if (!pageId) return;
    setSavingBrief(true);
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: JSON.stringify(brief) }),
      });
      if (!res.ok) throw new Error("Failed to save brief");
      toast.success("Brief saved");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSavingBrief(false);
    }
  };

  const renderSection = (key: keyof BriefSections, hint: string) =>
    canEdit ? (
      <RichTextEditor
        value={brief[key]}
        onChange={(html) => setBrief((prev) => ({ ...prev, [key]: html }))}
        placeholder={hint}
      />
    ) : brief[key] ? (
      <div
        className="rich-text border border-[#ECE8DC] rounded p-3 bg-white"
        dangerouslySetInnerHTML={{ __html: brief[key] }}
      />
    ) : (
      <p className="text-sage text-[13px] italic">Nothing added yet</p>
    );

  return (
    <>
      <div className="title-block">
        <h1>Overview</h1>
      </div>

          {editMode && <EditBanner />}

          {/* Project scope */}
          <div className="mb-8">
            <h2 className="font-fraunces text-[15px] font-medium text-bottle mb-2 flex items-center gap-[10px]">
              Project scope
              <span className="flex-1 h-px bg-[#E5E1D3]"></span>
            </h2>
            {renderSection("scope", "Broad outline of what we want to build")}
          </div>

          {/* Tabs: Must-haves / Love / Hate */}
          <div className="mb-8">
            <div className="flex gap-1 border-b border-[#E5E1D3] mb-4">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-[13px] font-medium -mb-px border-b-2 ${
                    activeTab === tab.key
                      ? "border-bottle text-bottle"
                      : "border-transparent text-sage hover:text-bottle"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {TABS.filter((t) => t.key === activeTab).map((tab) => (
              <div key={tab.key}>
                <p className="text-[11px] text-mist italic mb-2">{tab.hint}</p>
                {renderSection(tab.key, tab.hint)}
              </div>
            ))}
          </div>

          {canEdit && (
            <button
              onClick={saveBrief}
              disabled={savingBrief}
              className="mb-10 bg-bottle text-white px-5 py-2 rounded text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
            >
              {savingBrief ? "Saving..." : "Save brief"}
            </button>
          )}

          <PageMedia pageId={pageId} user={mockUser} />
    </>
  );
}
