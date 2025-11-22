"use client";

import * as React from "react";
import type { UserProfile } from "@/apps/web/lib/me";

type EditableUser = UserProfile;
type EditingField = "firstName" | "lastName" | "phone" | "birthDate" | null;

function getInitialsFromUser(user: UserProfile): string {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();

  if (first || last) {
    const f = first ? first[0] : "";
    const l = last ? last[0] : "";
    const initials = (f + l).trim();
    if (initials) return initials.toUpperCase();
  }

  // fallback to email
  return user.email.charAt(0).toUpperCase();
}

export function ProfileClient({ initialUser }: { initialUser: UserProfile }) {
  const [user, setUser] = React.useState<EditableUser>(initialUser);
  const [editingField, setEditingField] = React.useState<EditingField>(null);
  const [pendingField, setPendingField] = React.useState<EditingField>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function saveField(field: EditingField, value: string) {
    if (!field) return;
    setPendingField(field);
    setError(null);

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          (data && (data.message || data.error)) || "Could not update profile";
        setError(typeof msg === "string" ? msg : "Could not update profile");
        return;
      }

      const data = await res.json();
      if (data && data.user) {
        setUser(data.user as UserProfile);
      }
    } catch {
      setError("Network error while updating profile");
    } finally {
      setPendingField(null);
      setEditingField(null);
    }
  }

  function InlineField(props: {
    label: string;
    field: Exclude<EditingField, null>;
    value: string | null;
  }) {
    const isEditing = editingField === props.field;
    const isPending = pendingField === props.field;
    const displayValue = props.value ?? "—";
    const [draft, setDraft] = React.useState(displayValue);

    React.useEffect(() => {
      if (!isEditing) setDraft(displayValue);
    }, [isEditing, displayValue]);

    const startEdit = () => {
      if (isPending) return;
      setEditingField(props.field);
      setDraft(displayValue === "—" ? "" : displayValue);
    };

    const cancelEdit = () => {
      if (isPending) return;
      setEditingField(null);
      setDraft(displayValue);
    };

    const handleSubmit = async () => {
      await saveField(props.field, draft);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    };

    if (!isEditing) {
      return (
        <div className="profile__detail profile__detail--inline">
          <span className="profile__detail-label">{props.label}</span>
          <button
            type="button"
            className="profile__detail-value profile__detail-button"
            onClick={startEdit}
            disabled={isPending}
          >
            {displayValue}
          </button>
        </div>
      );
    }

    return (
      <div className="profile__detail profile__detail--inline">
        <span className="profile__detail-label">{props.label}</span>
        <div className="profile__detail-edit">
          <input
            className="profile__detail-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            type="button"
            className="profile__detail-save"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="profile__detail-cancel"
            onClick={cancelEdit}
            disabled={isPending}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const initials = getInitialsFromUser(user);
  const createdAt = new Date(user.createdAt).toLocaleDateString();
  const derivedName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email;

  return (
    <section className="profile">
      <div className="profile__header">
        <div className="profile__avatar">
          <span className="profile__avatar-initials">{initials}</span>
        </div>
        <h1 className="profile__name">{derivedName}</h1>
        <p className="profile__email">{user.email}</p>
      </div>

      <div className="profile__section">
        <h2 className="profile__section-title">Profile details</h2>
        {error && <p className="profile__error">{error}</p>}

        <div className="profile__details">
          <InlineField label="First name" field="firstName" value={user.firstName} />
          <InlineField label="Last name" field="lastName" value={user.lastName} />
          <InlineField label="Phone" field="phone" value={user.phone} />
          <InlineField label="Birth date" field="birthDate" value={user.birthDate} />
          <div className="profile__detail">
            <span>Role</span>
            <strong>{user.role}</strong>
          </div>
          <div className="profile__detail">
            <span>Created</span>
            <strong>{createdAt}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
