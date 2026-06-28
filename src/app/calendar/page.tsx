"use client";

import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { usePages } from "@/hooks/usePages";

const mockUser = {
  id: "ddbabb8d-5d95-4b1d-8842-fd9fad9e50d6",
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
  const { pages } = usePages();
  const [editMode, setEditMode] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    event_date: "",
    event_type: "meeting",
  });

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

  useEffect(() => {
    // Fetch events from database
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/calendar");
        const data = await res.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      }
    };
    fetchEvents();
  }, []);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1));
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          created_by: mockUser.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to add event");

      const newEvent = await res.json();
      setEvents([...events, newEvent]);
      setFormData({ title: "", event_date: "", event_type: "meeting" });
      setShowAddEvent(false);
      alert("Event added!");
    } catch (error) {
      alert("Error adding event: " + (error as Error).message);
    }
  };

  return (
    <div className="shell">
      <Sidebar
        pages={pages}
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

            <button
              onClick={() => setShowAddEvent(true)}
              className="text-sage text-[12px] underline hover:text-bottle cursor-pointer"
            >
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
              {days.map((day, idx) => {
                const dayEvents = day
                  ? events.filter((e: any) => {
                      const eventDate = new Date(e.event_date);
                      return (
                        eventDate.getDate() === day &&
                        eventDate.getMonth() === month &&
                        eventDate.getFullYear() === year
                      );
                    })
                  : [];

                return (
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
                        <div className="space-y-1">
                          {dayEvents.map((event: any) => (
                            <div
                              key={event.id}
                              className={`text-[9px] px-1 py-0.5 rounded truncate ${
                                event.event_type === "meeting"
                                  ? "bg-[#D7DECF] text-bottle"
                                  : event.event_type === "delivery"
                                  ? "bg-[#FBF3E9] text-brass"
                                  : "bg-[#EBD4D4] text-[#7A3B3B]"
                              }`}
                            >
                              {event.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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

          {/* Add Event Modal */}
          {showAddEvent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h2 className="font-fraunces text-[20px] font-medium text-bottle mb-4">
                  Add Event
                </h2>
                <form onSubmit={handleAddEvent} className="space-y-4">
                  <div>
                    <label className="block text-[12px] uppercase text-sage mb-2">
                      Event Title
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="w-full border border-[#D7DECF] rounded p-2 text-[13px]"
                      placeholder="e.g., Architect Review"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] uppercase text-sage mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.event_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          event_date: e.target.value,
                        })
                      }
                      className="w-full border border-[#D7DECF] rounded p-2 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] uppercase text-sage mb-2">
                      Type
                    </label>
                    <select
                      value={formData.event_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          event_type: e.target.value,
                        })
                      }
                      className="w-full border border-[#D7DECF] rounded p-2 text-[13px]"
                    >
                      <option value="meeting">Meeting</option>
                      <option value="delivery">Delivery</option>
                      <option value="deadline">Deadline</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-bottle text-white rounded py-2 text-[13px] font-medium hover:opacity-90"
                    >
                      Add Event
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddEvent(false)}
                      className="flex-1 border border-[#D7DECF] rounded py-2 text-[13px] text-sage hover:bg-whitewash"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
