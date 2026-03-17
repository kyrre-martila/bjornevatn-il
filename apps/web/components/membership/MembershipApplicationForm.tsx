"use client";

import { useMemo, useState } from "react";

type MembershipCategory = {
  id: string;
  name: string;
};

type MembershipSettings = {
  confirmationTitle?: string | null;
  confirmationText?: string | null;
};

type FieldErrors = Partial<Record<string, string>>;

function mapApiError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Could not submit membership application.";
  const record = payload as { message?: string | string[] };
  if (Array.isArray(record.message)) return record.message.join(" ");
  return record.message || "Could not submit membership application.";
}

function isMinorDate(value: string): boolean {
  if (!value) return false;
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return false;
  const adult = new Date(dob);
  adult.setFullYear(adult.getFullYear() + 18);
  return adult > new Date();
}

export default function MembershipApplicationForm({
  categories,
  settings,
}: {
  categories: MembershipCategory[];
  settings: MembershipSettings;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const showGuardian = useMemo(() => isMinorDate(dateOfBirth), [dateOfBirth]);

  async function onSubmit(formData: FormData) {
    const body = {
      fullName: formData.get("fullName")?.toString().trim() || "",
      email: formData.get("email")?.toString().trim() || "",
      phone: formData.get("phone")?.toString().trim() || undefined,
      dateOfBirth: formData.get("dateOfBirth")?.toString() || undefined,
      addressLine: formData.get("addressLine")?.toString().trim() || undefined,
      postalCode: formData.get("postalCode")?.toString().trim() || undefined,
      city: formData.get("city")?.toString().trim() || undefined,
      guardianName: formData.get("guardianName")?.toString().trim() || undefined,
      guardianPhone: formData.get("guardianPhone")?.toString().trim() || undefined,
      guardianEmail: formData.get("guardianEmail")?.toString().trim() || undefined,
      membershipCategoryId: formData.get("membershipCategoryId")?.toString() || "",
      notes: formData.get("notes")?.toString().trim() || undefined,
    };

    const nextFieldErrors: FieldErrors = {};
    if (!body.fullName) nextFieldErrors.fullName = "Full name is required.";
    if (!body.email) nextFieldErrors.email = "Email is required.";
    if (!body.membershipCategoryId) nextFieldErrors.membershipCategoryId = "Membership category is required.";
    if (showGuardian) {
      if (!body.guardianName) nextFieldErrors.guardianName = "Guardian name is required for minors.";
      if (!body.guardianPhone) nextFieldErrors.guardianPhone = "Guardian phone is required for minors.";
      if (!body.guardianEmail) nextFieldErrors.guardianEmail = "Guardian email is required for minors.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setPending(true);
    setError(null);
    setStatus(null);
    setFieldErrors({});

    const response = await fetch("/api/membership/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(mapApiError(payload));
      setPending(false);
      return;
    }

    setStatus(settings.confirmationTitle || "Application received");
    setPending(false);
  }

  if (status) {
    return (
      <div className="membership-page__confirmation stack stack--sm" role="status" aria-live="polite">
        <h3>{settings.confirmationTitle || "Application received"}</h3>
        <p>{settings.confirmationText || "Thank you for your application. We will contact you shortly."}</p>
      </div>
    );
  }

  return (
    <form className="membership-page__form" action={(fd) => void onSubmit(fd)}>
      <label className="membership-page__field"><span>Full name</span><input name="fullName" required />{fieldErrors.fullName ? <small>{fieldErrors.fullName}</small> : null}</label>
      <label className="membership-page__field"><span>Email</span><input name="email" type="email" required />{fieldErrors.email ? <small>{fieldErrors.email}</small> : null}</label>
      <label className="membership-page__field"><span>Phone</span><input name="phone" type="tel" /></label>
      <label className="membership-page__field"><span>Date of birth</span><input name="dateOfBirth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} /></label>
      <label className="membership-page__field"><span>Address line</span><input name="addressLine" /></label>
      <label className="membership-page__field"><span>Postal code</span><input name="postalCode" /></label>
      <label className="membership-page__field"><span>City</span><input name="city" /></label>
      <label className="membership-page__field">
        <span>Membership category</span>
        <select name="membershipCategoryId" required defaultValue="">
          <option value="" disabled>Select a category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        {fieldErrors.membershipCategoryId ? <small>{fieldErrors.membershipCategoryId}</small> : null}
      </label>

      {showGuardian ? (
        <>
          <label className="membership-page__field"><span>Guardian name</span><input name="guardianName" />{fieldErrors.guardianName ? <small>{fieldErrors.guardianName}</small> : null}</label>
          <label className="membership-page__field"><span>Guardian phone</span><input name="guardianPhone" type="tel" />{fieldErrors.guardianPhone ? <small>{fieldErrors.guardianPhone}</small> : null}</label>
          <label className="membership-page__field"><span>Guardian email</span><input name="guardianEmail" type="email" />{fieldErrors.guardianEmail ? <small>{fieldErrors.guardianEmail}</small> : null}</label>
        </>
      ) : null}

      <label className="membership-page__field membership-page__field--full"><span>Notes</span><textarea name="notes" rows={4} /></label>
      <button type="submit" className="button-primary membership-page__submit" disabled={pending}>{pending ? "Submitting..." : "Submit application"}</button>
      {error ? <p className="membership-page__error">{error}</p> : null}
    </form>
  );
}
