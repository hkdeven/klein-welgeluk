"use client";

import { useState } from "react";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

const mockPages = [
  {
    id: "1",
    title: "Building",
    slug: "building",
    parent_id: null,
    children: [
      { id: "2", title: "Bedrooms", slug: "building/bedrooms", parent_id: "1" },
    ],
  },
];

const mockUser = {
  id: "1",
  display_name: "Deven Blackburn",
  short_name: "Deven",
  role: "owner",
  avatar_url: null,
};

export default function DocumentsPage() {
  const [editMode, setEditMode] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");

  return (
    <div className="shell">
      <Sidebar
        pages={mockPages}
        user={mockUser}
        editMode={editMode}
        onEditModeChange={setEditMode}
      />

      <div className="flex-1">
        <main>
          <div className="title-block">
            <h1>Documents</h1>
          </div>

          {/* Filter bar */}
          <div className="flex justify-between items-center mb-[18px] gap-4">
            <div className="flex gap-2">
              {["all", "building", "services", "exterior", "quotes"].map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-[13px] py-1 text-[11.5px] rounded-full border ${
                      selectedFilter === filter
                        ? "bg-bottle text-white border-bottle"
                        : "border-[#E5E1D3] text-sage"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                )
              )}
            </div>
            <input
              type="text"
              placeholder="Search documents..."
              className="border border-[#D7DECF] rounded px-3 py-2 text-[13px] min-w-60"
            />
            <button className="text-sage text-[12px] underline">
              + upload document
            </button>
          </div>

          {/* Document list */}
          <div className="bg-white rounded">
            <div className="border border-[#ECE8DC] rounded p-3">
              <p className="text-center text-sage text-[13px]">
                No documents yet
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
