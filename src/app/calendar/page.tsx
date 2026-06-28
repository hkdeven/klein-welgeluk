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
    children: [],
  },
];

const mockUser = {
  id: "1",
  display_name: "Deven Blackburn",
  short_name: "Deven",
  role: "owner",
  avatar_url: null,
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const [editMode, setEditMode] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState("all");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1));
  };

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
            <h1>Calendar</h1>
          </div>

          {/* Calendar toolbar */}
          <div className="flex justify-between items-center mb-[18px]">
            <div className="flex items-center gap-3.5">
              <button
                onClick={prevMonth}
                className="text-sage text-[13px] cursor-pointer"
              >
                ‹
              </button>
              <h2 className="font-fraunces text-[22px] font-medium text-bottle w-40">
                {monthName}
              </h2>
              <button
                onClick={nextMonth}
                className="text-sage text-[13px] cursor-pointer"
              >
                ›
              </button>
            </div>

            <div className="flex gap-2">
              {["all", "meetings", "deliveries", "deadlines"].map((filter) => (
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
              ))}
            </div>

            <button className="text-sage text-[12px] underline">
              + add event
            </button>
          </div>

          {/* Calendar grid */}
          <div className="border border-[#ECE8DC] rounded overflow-hidden">
            <div className="grid grid-cols-7">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className="bg-bottle text-whitewash font-mono text-[10px] tracking-[0.08em] uppercase text-center p-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day, idx) => (
                <div
                  key={idx}
                  className={`min-h-[90px] border border-[#ECE8DC] p-1 ${
                    day === null ? "bg-whitewash opacity-40" : "bg-white"
                  }`}
                >
                  {day && (
                    <div>
                      <div className="font-mono text-[11px] text-sage mb-1">
                        {day}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-[18px] flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#D7DECF]"></div>
              <span className="text-[12px] text-sage">Meeting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#FBF3E9]"></div>
              <span className="text-[12px] text-sage">Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#EBD4D4]"></div>
              <span className="text-[12px] text-sage">Deadline</span>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
