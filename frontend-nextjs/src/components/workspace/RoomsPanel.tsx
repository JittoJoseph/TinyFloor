"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Link2, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { api, type RoomSummary } from "@/lib/api";
import { roomPath } from "@/lib/links";
import { Badge, Button, Card, CardTitle, Dialog, ErrorText, fieldClass, Label } from "./ui";
import { GuestLinksDialog } from "./GuestLinksDialog";
import { useErrorMessage } from "./useErrorMessage";

const CAPACITIES = [4, 8, 12, 16, 20];

export function RoomsPanel({
  workspaceId,
  rooms,
  manages,
  onChanged,
}: {
  workspaceId: string;
  rooms: RoomSummary[];
  manages: boolean;
  onChanged: () => Promise<void>;
}) {
  const t = useTranslations("workspace.rooms");
  const [editing, setEditing] = useState<RoomSummary | "new" | null>(null);
  const [linksFor, setLinksFor] = useState<RoomSummary | null>(null);
  const [deleting, setDeleting] = useState<RoomSummary | null>(null);

  return (
    <Card>
      <CardTitle
        title={t("title")}
        detail={t("detail")}
        action={
          manages && (
            <Button variant="primary" onClick={() => setEditing("new")}>
              <Plus className="w-4 h-4" />
              {t("new")}
            </Button>
          )
        }
      />

      {rooms.length === 0 ? (
        <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 py-6 text-center">
          {manages ? t("emptyManager") : t("empty")}
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              manages={manages}
              onGuestLinks={() => setLinksFor(room)}
              onEdit={() => setEditing(room)}
              onDelete={() => setDeleting(room)}
            />
          ))}
        </ul>
      )}

      <RoomDialog
        workspaceId={workspaceId}
        room={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await onChanged();
        }}
      />
      <GuestLinksDialog room={linksFor} onClose={() => setLinksFor(null)} />
      <DeleteRoomDialog
        room={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={async () => {
          setDeleting(null);
          await onChanged();
        }}
      />
    </Card>
  );
}

function RoomCard({
  room,
  manages,
  onGuestLinks,
  onEdit,
  onDelete,
}: {
  room: RoomSummary;
  manages: boolean;
  onGuestLinks: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("workspace.rooms");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuItem =
    "cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-[13px] text-start hover:bg-black/[0.04] transition-colors";

  return (
    <li className="relative rounded-2xl border border-black/10 bg-[#fbfbf9] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-body text-[15px] font-semibold text-[var(--color-braun-text)] truncate">{room.name}</h3>
          <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-50 mt-0.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {t("capacity", { count: room.capacity })}
          </p>
        </div>
        {manages && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={t("options", { room: room.name })}
              aria-expanded={menuOpen}
              className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05] transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-[var(--color-braun-text)] opacity-60" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute end-0 top-9 z-40 w-48 rounded-xl border border-black/10 bg-white p-1.5 shadow-lg">
                  <button type="button" className={`${menuItem} text-[var(--color-braun-text)]`} onClick={() => (setMenuOpen(false), onGuestLinks())}>
                    <Link2 className="w-4 h-4 opacity-60" />
                    {t("guestLinks")}
                  </button>
                  <button type="button" className={`${menuItem} text-[var(--color-braun-text)]`} onClick={() => (setMenuOpen(false), onEdit())}>
                    <Pencil className="w-4 h-4 opacity-60" />
                    {t("edit")}
                  </button>
                  <button type="button" className={`${menuItem} text-red-600`} onClick={() => (setMenuOpen(false), onDelete())}>
                    <Trash2 className="w-4 h-4" />
                    {t("delete")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-auto">
        {room.people > 0 ? (
          <Badge tone="live">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("peopleNow", { count: room.people })}
          </Badge>
        ) : (
          <Badge>{t("quiet")}</Badge>
        )}
        <Link
          href={roomPath(room.id)}
          className="cursor-pointer inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[var(--color-braun-text)] text-[var(--color-braun-bg)] font-body text-[13px] font-semibold hover:bg-[#1a1a1a] transition-colors"
        >
          {t("enter")}
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </Link>
      </div>
    </li>
  );
}

function RoomDialog({
  workspaceId,
  room,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  room: RoomSummary | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("workspace.rooms");
  const explain = useErrorMessage();
  const existing = room && room !== "new" ? room : null;
  const [name, setName] = useState<string | null>(null);
  const [capacity, setCapacity] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const currentName = name ?? existing?.name ?? "";
  const currentCapacity = capacity ?? existing?.capacity ?? 12;

  const close = () => {
    setName(null);
    setCapacity(null);
    setError("");
    onClose();
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentName.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      if (existing) await api.updateRoom(existing.id, { name: currentName.trim(), capacity: currentCapacity });
      else await api.createRoom(workspaceId, { name: currentName.trim(), capacity: currentCapacity });
      setName(null);
      setCapacity(null);
      onSaved();
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={room !== null} title={existing ? t("editTitle") : t("newTitle")} onClose={close}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <Label htmlFor="room-name">{t("name")}</Label>
          <input
            id="room-name"
            value={currentName}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={48}
            className={fieldClass}
          />
        </div>
        <div>
          <Label>{t("capacityLabel")}</Label>
          <div role="radiogroup" className="grid grid-cols-5 gap-2">
            {CAPACITIES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={currentCapacity === option}
                onClick={() => setCapacity(option)}
                className={`cursor-pointer h-10 rounded-xl border font-body text-[13px] font-semibold transition-colors ${
                  currentCapacity === option
                    ? "border-[var(--color-braun-text)]/40 bg-white text-[var(--color-braun-text)] shadow-sm"
                    : "border-black/10 bg-[#fbfbf9] text-[var(--color-braun-text)]/55 hover:bg-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={close}>{t("cancel")}</Button>
          <Button type="submit" variant="primary" busy={busy} disabled={!currentName.trim()}>
            {existing ? t("save") : t("create")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteRoomDialog({
  room,
  onClose,
  onDeleted,
}: {
  room: RoomSummary | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("workspace.rooms");
  const explain = useErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    if (!room) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteRoom(room.id);
      onDeleted();
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={room !== null}
      title={t("deleteTitle", { room: room?.name ?? "" })}
      description={room?.people ? t("deleteBodyBusy", { count: room.people }) : t("deleteBody")}
      onClose={onClose}
    >
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button variant="danger" busy={busy} onClick={remove}>
          <Trash2 className="w-4 h-4" />
          {t("delete")}
        </Button>
      </div>
    </Dialog>
  );
}
