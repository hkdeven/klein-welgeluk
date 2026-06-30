"use client";

interface EventUser {
  id: string;
  display_name?: string;
  short_name?: string;
}

interface EventDetailModalProps {
  event: any;
  onClose: () => void;
  // When provided (and canDelete), a "Delete event" button is shown.
  onDelete?: (id: string) => void;
  canDelete?: boolean;
  // When provided (and canEdit), an "Edit" button is shown.
  onEdit?: (event: any) => void;
  canEdit?: boolean;
  // Used to resolve tagged_user_ids and created_by → names.
  users?: EventUser[];
}

const typeClass = (t: string) =>
  t === "meeting"
    ? "bg-[#D7DECF] text-bottle"
    : t === "delivery"
    ? "bg-[#FBF3E9] text-brass"
    : "bg-[#EBD4D4] text-[#7A3B3B]";

function formatTime(time: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${ampm}`;
}

export default function EventDetailModal({
  event,
  onClose,
  onDelete,
  canDelete = false,
  onEdit,
  canEdit = false,
  users = [],
}: EventDetailModalProps) {
  const taggedIds: string[] = event.tagged_user_ids || [];
  const taggedNames = taggedIds
    .map((id) => {
      const u = users.find((x) => x.id === id);
      return u?.display_name || u?.short_name;
    })
    .filter(Boolean) as string[];

  const creator = users.find((u) => u.id === event.created_by);
  const creatorName = creator?.display_name || creator?.short_name;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <span className={`text-[10px] px-2 py-0.5 rounded ${typeClass(event.event_type)}`}>
            {event.event_type}
          </span>
          <button
            onClick={onClose}
            className="text-sage hover:text-bottle text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <h2 className="font-fraunces text-[20px] font-medium text-bottle mb-2">
          {event.title}
        </h2>
        <div className="font-mono text-[12px] text-sage mb-1">
          {new Date(event.event_date).toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {event.event_time && ` · ${formatTime(event.event_time)}`}
        </div>
        {creatorName && (
          <div className="text-[11px] text-mist mb-1">Created by {creatorName}</div>
        )}
        {event.description && (
          <p className="text-[13px] text-pine mt-3 whitespace-pre-wrap">
            {event.description}
          </p>
        )}
        {taggedNames.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] tracking-[0.1em] uppercase text-sage mb-1.5">
              Tagged
            </div>
            <div className="flex flex-wrap gap-1.5">
              {taggedNames.map((name) => (
                <span key={name} className="tag-chip">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2 pt-5">
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(event)}
              className="flex-1 bg-bottle text-white rounded py-2 text-[13px] font-medium hover:opacity-90"
            >
              Edit
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(event.id)}
              className="flex-1 border border-[#E2C9C9] text-[#B5524F] rounded py-2 text-[13px] font-medium hover:bg-[#FBF3F3]"
            >
              Delete event
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 border border-[#D7DECF] rounded py-2 text-[13px] text-sage hover:bg-whitewash"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
