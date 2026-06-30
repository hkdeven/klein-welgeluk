"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";
import EditBanner from "@/components/EditBanner";
import EventDetailModal from "@/components/EventDetailModal";
import { useEditMode } from "@/components/EditModeContext";
import { useCurrentUser, useAuth } from "@/components/AuthProvider";


type CalendarView = "day" | "week" | "month" | "year";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Monday-based offset: how many leading blanks before day 1.
function leadingBlanks(year: number, month: number) {
  const jsDay = new Date(year, month, 1).getDay(); // 0 = Sun
  return (jsDay + 6) % 7;
}

function getMonday(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function formatTime(time: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${ampm}`;
}

const typeClass = (t: string) =>
  t === "meeting"
    ? "bg-[#D7DECF] text-bottle"
    : t === "delivery"
    ? "bg-[#FBF3E9] text-brass"
    : "bg-[#EBD4D4] text-[#7A3B3B]";

export default function CalendarPage() {
  const toast = useToast();
  const { editMode } = useEditMode();
  const mockUser = useCurrentUser();
  const { canWrite } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    event_date: "",
    event_time: "",
    event_type: "meeting",
    description: "",
    tagged_user_ids: [] as string[],
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
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

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, []);

  // Arriving from a notification link (/calendar?event=<id>): open that event
  // once events have loaded. Runs once.
  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (openedFromUrl.current || !events.length) return;
    const id = new URLSearchParams(window.location.search).get("event");
    if (!id) return;
    const ev = events.find((e: any) => e.id === id);
    if (ev) {
      setSelectedEvent(ev);
      openedFromUrl.current = true;
    }
  }, [events]);

  const toggleTagged = (id: string) =>
    setFormData((f) => ({
      ...f,
      tagged_user_ids: f.tagged_user_ids.includes(id)
        ? f.tagged_user_ids.filter((x) => x !== id)
        : [...f.tagged_user_ids, id],
    }));

  const matchesFilter = (event: any) => {
    if (selectedFilter === "all") return true;
    const map: Record<string, string> = {
      meetings: "meeting",
      deliveries: "delivery",
      deadlines: "deadline",
    };
    return event.event_type === map[selectedFilter];
  };

  const eventsForDate = (date: Date) =>
    events
      .filter((e: any) => matchesFilter(e) && sameDay(new Date(e.event_date), date))
      .sort((a, b) => (a.event_time || "").localeCompare(b.event_time || ""));

  const eventsInMonth = (y: number, m: number) =>
    events.filter(
      (e: any) =>
        matchesFilter(e) &&
        new Date(e.event_date).getMonth() === m &&
        new Date(e.event_date).getFullYear() === y
    );

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setCurrentDate(d);
  };

  const headerLabel = () => {
    if (view === "day")
      return currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    if (view === "week") {
      const start = getMonday(currentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      })} – ${end.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`;
    }
    if (view === "month") return `${MONTHS[month]} ${year}`;
    return `${year}`;
  };

  const blankForm = {
    title: "",
    event_date: "",
    event_time: "",
    event_type: "meeting",
    description: "",
    tagged_user_ids: [] as string[],
  };

  const openAddEvent = () => {
    setEditingId(null);
    setFormData(blankForm);
    setShowAddEvent(true);
  };

  const openEditEvent = (ev: any) => {
    setSelectedEvent(null);
    setEditingId(ev.id);
    setFormData({
      title: ev.title || "",
      event_date: ev.event_date || "",
      event_time: ev.event_time || "",
      event_type: ev.event_type || "meeting",
      description: ev.description || "",
      tagged_user_ids: ev.tagged_user_ids || [],
    });
    setShowAddEvent(true);
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(
        editingId ? `/api/calendar/${editingId}` : "/api/calendar",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingId ? formData : { ...formData, created_by: mockUser.id }
          ),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save event");
      }
      const saved = await res.json();
      setEvents((prev) =>
        editingId ? prev.map((ev) => (ev.id === saved.id ? saved : ev)) : [...prev, saved]
      );
      setFormData(blankForm);
      setShowAddEvent(false);
      setEditingId(null);
      toast.success(editingId ? "Event updated" : "Event added");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/calendar/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
      setEvents(events.filter((e) => e.id !== id));
      setSelectedEvent(null);
      toast.success("Event deleted");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // ---------- View renderers ----------
  const renderMonth = () => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < leadingBlanks(year, month); i++) cells.push(null);
    for (let d = 1; d <= getDaysInMonth(year, month); d++) cells.push(d);

    return (
      <div className="border border-[#ECE8DC] rounded overflow-hidden">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="bg-bottle text-whitewash font-mono text-[10px] tracking-[0.08em] uppercase text-center p-2"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const dayEvents =
              day != null ? eventsForDate(new Date(year, month, day)) : [];
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
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          title={event.description || event.title}
                          className={`w-full text-left text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${typeClass(
                            event.event_type
                          )}`}
                        >
                          {event.event_time && (
                            <span className="font-mono mr-1">
                              {formatTime(event.event_time)}
                            </span>
                          )}
                          {event.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeek = () => {
    const start = getMonday(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    return (
      <div className="grid grid-cols-7 border border-[#ECE8DC] rounded overflow-hidden">
        {days.map((d, i) => {
          const dayEvents = eventsForDate(d);
          const isToday = sameDay(d, new Date());
          return (
            <div key={i} className="border border-[#ECE8DC] bg-white min-h-[260px]">
              <div
                className={`text-center p-2 ${
                  isToday ? "bg-brass text-white" : "bg-bottle text-whitewash"
                }`}
              >
                <div className="font-mono text-[10px] uppercase">{WEEKDAYS[i]}</div>
                <div className="text-[15px] font-fraunces">{d.getDate()}</div>
              </div>
              <div className="p-1.5 space-y-1.5">
                {dayEvents.map((event: any) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`w-full text-left text-[10px] px-1.5 py-1 rounded cursor-pointer hover:opacity-80 ${typeClass(
                      event.event_type
                    )}`}
                  >
                    {event.event_time && (
                      <div className="font-mono">{formatTime(event.event_time)}</div>
                    )}
                    <div className="font-semibold">{event.title}</div>
                    {event.description && (
                      <div className="opacity-80 truncate">{event.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDay = () => {
    const dayEvents = eventsForDate(currentDate);
    return (
      <div className="border border-[#ECE8DC] rounded overflow-hidden bg-white">
        {dayEvents.length > 0 ? (
          <div className="divide-y divide-[#ECE8DC]">
            {dayEvents.map((event: any) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="w-full text-left flex gap-4 p-4 hover:bg-whitewash cursor-pointer"
              >
                <div className="w-20 font-mono text-[12px] text-sage flex-shrink-0">
                  {event.event_time ? formatTime(event.event_time) : "All day"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded ${typeClass(
                        event.event_type
                      )}`}
                    >
                      {event.event_type}
                    </span>
                    <span className="font-semibold text-[14px] text-bottle">
                      {event.title}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-[13px] text-pine mt-1">
                      {event.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-sage text-[13px] p-8">
            No events on this day
          </p>
        )}
      </div>
    );
  };

  const renderYear = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
      {MONTHS.map((name, m) => {
        const cells: (number | null)[] = [];
        for (let i = 0; i < leadingBlanks(year, m); i++) cells.push(null);
        for (let d = 1; d <= getDaysInMonth(year, m); d++) cells.push(d);
        const today = new Date();

        return (
          <div key={name} className="border border-[#ECE8DC] rounded p-3 bg-white">
            <button
              onClick={() => {
                setCurrentDate(new Date(year, m, 1));
                setView("month");
              }}
              className="font-fraunces text-[14px] text-bottle mb-2 hover:underline"
            >
              {name}
            </button>
            <div className="grid grid-cols-7 gap-y-0.5">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <div
                  key={i}
                  className="text-center font-mono text-[8px] text-mist uppercase"
                >
                  {d}
                </div>
              ))}
              {cells.map((day, idx) => {
                if (day === null) return <div key={idx} />;
                const date = new Date(year, m, day);
                const hasEvents = eventsForDate(date).length > 0;
                const isToday =
                  today.getDate() === day &&
                  today.getMonth() === m &&
                  today.getFullYear() === year;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentDate(date);
                      setView("day");
                    }}
                    className={`text-[9px] leading-none aspect-square flex items-center justify-center rounded-full hover:bg-[#ECE8DC] ${
                      isToday
                        ? "bg-bottle text-white"
                        : hasEvents
                        ? "bg-brass text-white font-semibold"
                        : "text-pine"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="title-block">
        <h1>Calendar</h1>
      </div>

      {editMode && <EditBanner />}

          {/* Toolbar */}
          <div className="flex justify-between items-center mb-[18px] gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <button
                onClick={() => navigate(-1)}
                className="text-sage text-[13px] cursor-pointer"
              >
                ‹
              </button>
              <h2 className="font-fraunces text-[20px] font-medium text-bottle min-w-[180px] text-center">
                {headerLabel()}
              </h2>
              <button
                onClick={() => navigate(1)}
                className="text-sage text-[13px] cursor-pointer"
              >
                ›
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="text-sage text-[11.5px] underline hover:text-bottle"
              >
                today
              </button>
            </div>

            {/* View switcher */}
            <div className="flex gap-1 border border-[#E5E1D3] rounded-full p-0.5">
              {(["day", "week", "month", "year"] as CalendarView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-[11.5px] rounded-full capitalize ${
                    view === v ? "bg-bottle text-white" : "text-sage"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {canWrite && (
              <button
                onClick={openAddEvent}
                className="text-sage text-[12px] underline hover:text-bottle cursor-pointer"
              >
                + add event
              </button>
            )}
          </div>

          {/* Type filter */}
          <div className="flex gap-2 mb-[18px]">
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

          {view === "month" && renderMonth()}
          {view === "week" && renderWeek()}
          {view === "day" && renderDay()}
          {view === "year" && renderYear()}

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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h2 className="font-fraunces text-[20px] font-medium text-bottle mb-4">
                  {editingId ? "Edit Event" : "Add Event"}
                </h2>
                <form onSubmit={handleSubmitEvent} className="space-y-4">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] uppercase text-sage mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.event_date}
                        onChange={(e) =>
                          setFormData({ ...formData, event_date: e.target.value })
                        }
                        className="w-full border border-[#D7DECF] rounded p-2 text-[13px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] uppercase text-sage mb-2">
                        Time <span className="text-mist normal-case">(optional)</span>
                      </label>
                      <input
                        type="time"
                        value={formData.event_time}
                        onChange={(e) =>
                          setFormData({ ...formData, event_time: e.target.value })
                        }
                        className="w-full border border-[#D7DECF] rounded p-2 text-[13px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] uppercase text-sage mb-2">
                      Type
                    </label>
                    <select
                      value={formData.event_type}
                      onChange={(e) =>
                        setFormData({ ...formData, event_type: e.target.value })
                      }
                      className="w-full border border-[#D7DECF] rounded p-2 text-[13px]"
                    >
                      <option value="meeting">Meeting</option>
                      <option value="delivery">Delivery</option>
                      <option value="deadline">Deadline</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] uppercase text-sage mb-2">
                      Description{" "}
                      <span className="text-mist normal-case">(optional)</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                      className="w-full border border-[#D7DECF] rounded p-2 text-[13px]"
                      placeholder="Notes about this event"
                    />
                  </div>
                  {users.length > 0 && (
                    <div>
                      <label className="block text-[12px] uppercase text-sage mb-2">
                        Tag people{" "}
                        <span className="text-mist normal-case">
                          (shows on their home page)
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {users.map((u) => {
                          const on = formData.tagged_user_ids.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => toggleTagged(u.id)}
                              className={`px-3 py-1 text-[12px] rounded-full border ${
                                on
                                  ? "bg-bottle text-white border-bottle"
                                  : "border-[#D7DECF] text-sage hover:border-bottle"
                              }`}
                            >
                              {u.display_name || u.short_name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-bottle text-white rounded py-2 text-[13px] font-medium hover:opacity-90"
                    >
                      {editingId ? "Save changes" : "Add Event"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddEvent(false);
                        setEditingId(null);
                      }}
                      className="flex-1 border border-[#D7DECF] rounded py-2 text-[13px] text-sage hover:bg-whitewash"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Event Detail Modal */}
          {selectedEvent && (
            <EventDetailModal
              event={selectedEvent}
              users={users}
              canDelete={canWrite}
              onDelete={deleteEvent}
              canEdit={selectedEvent.created_by === mockUser.id}
              onEdit={openEditEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}
    </>
  );
}
