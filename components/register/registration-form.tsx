"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

type FieldErrors = Record<string, string[] | undefined>;

const EXPERIENCE = [
  { value: "NONE", label: "None at all" },
  { value: "BEGINNER", label: "I've dabbled" },
  { value: "INTERMEDIATE", label: "I can build small things" },
  { value: "ADVANCED", label: "I'm comfortable" },
];

const HEARD_FROM = [
  "WhatsApp",
  "Instagram",
  "A friend",
  "X / Twitter",
  "PalmTechnIQ website",
  "Somewhere else",
];

export function RegistrationForm({
  trackSlug,
  cohortStartsOn,
}: {
  trackSlug: string;
  cohortStartsOn: string;
}) {
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  /** Set when the seat was saved but payment could not be started. */
  const [heldReference, setHeldReference] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");

  const needsGuardian = isUnder18(dateOfBirth, cohortStartsOn);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const response = await fetch(
        `/api/registrations?track=${encodeURIComponent(trackSlug)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            // Attribution, if the visitor arrived from a campaign link.
            utmSource: searchParams.get("utm_source") ?? undefined,
            utmMedium: searchParams.get("utm_medium") ?? undefined,
            utmCampaign: searchParams.get("utm_campaign") ?? undefined,
          }),
        },
      );

      const body = await response.json();

      if (!response.ok) {
        setFieldErrors(body.fields ?? {});
        setFormError(body.error ?? "Something went wrong. Please try again.");
        // A 502 means the seat is saved but checkout never started. The
        // reference code is the only thing standing between the customer and
        // a lost registration, so it goes on screen rather than relying on an
        // email that may itself not arrive.
        setHeldReference(body.referenceCode ?? null);
        setSubmitting(false);
        return;
      }

      // Hand off to Paystack. Deliberately a full navigation, not a popup —
      // popups get blocked and this audience is on mobile.
      window.location.href = body.authorizationUrl;
    } catch {
      setFormError("We couldn't reach the server. Check your connection.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-9 space-y-5" noValidate>
      <Field
        label="Full name"
        name="fullName"
        autoComplete="name"
        required
        errors={fieldErrors.fullName}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        hint="Your reference code and receipt go here."
        errors={fieldErrors.email}
      />
      <Field
        label="Phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="08012345678"
        required
        hint="We use WhatsApp for day-to-day updates."
        errors={fieldErrors.phone}
      />
      <Field
        label="Date of birth"
        name="dateOfBirth"
        type="date"
        value={dateOfBirth}
        onChange={(event) => setDateOfBirth(event.target.value)}
        errors={fieldErrors.dateOfBirth}
      />

      {needsGuardian && (
        <fieldset className="space-y-5 rounded-2xl border border-accent/25 bg-accent/5 p-5">
          <legend className="px-2 text-sm font-medium text-accent">
            You're under 18, so we need a parent or guardian
          </legend>
          <Field
            label="Parent or guardian's name"
            name="guardianName"
            required
            errors={fieldErrors.guardianName}
          />
          <Field
            label="Parent or guardian's phone"
            name="guardianPhone"
            type="tel"
            inputMode="tel"
            required
            errors={fieldErrors.guardianPhone}
          />
        </fieldset>
      )}

      <Select
        label="How much experience do you have?"
        name="experience"
        options={EXPERIENCE}
        errors={fieldErrors.experience}
      />

      <Select
        label="How did you hear about us?"
        name="heardFrom"
        options={HEARD_FROM.map((value) => ({ value, label: value }))}
        placeholder="Pick one"
        errors={fieldErrors.heardFrom}
      />

      <div>
        <label
          htmlFor="motivation"
          className="block text-sm font-medium text-white/80"
        >
          What do you want to walk away with?{" "}
          <span className="font-normal text-white/35">Optional</span>
        </label>
        <textarea
          id="motivation"
          name="motivation"
          rows={3}
          maxLength={2000}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/25 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm"
        >
          <p>{formError}</p>

          {heldReference && (
            <>
              <p className="mt-3 font-mono text-xl font-bold tracking-wider text-accent">
                {heldReference}
              </p>
              <a
                href={`/r/${heldReference}`}
                className="mt-3 inline-block text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
              >
                Open my registration
              </a>
            </>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-primary px-7 py-4 font-semibold text-brand-black transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
      >
        {submitting ? "Holding your seat…" : "Continue to payment"}
      </button>

      <p className="text-center text-xs leading-relaxed text-white/35">
        You'll be taken to Paystack to pay. Your seat is held for 30 minutes.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  errors,
  ...props
}: {
  label: string;
  name: string;
  hint?: string;
  errors?: string[];
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const invalid = Boolean(errors?.length);

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-white/80">
        {label}
        {!props.required && (
          <span className="ml-1.5 font-normal text-white/35">Optional</span>
        )}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={invalid || undefined}
        aria-describedby={
          [invalid ? errorId : null, hint ? hintId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`mt-2 w-full rounded-xl border bg-white/5 px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 ${
          invalid
            ? "border-destructive focus:border-destructive focus:ring-destructive/40"
            : "border-white/10 focus:border-primary/60 focus:ring-primary/30"
        }`}
        {...props}
      />
      {hint && !invalid && (
        <p id={hintId} className="mt-1.5 text-xs text-white/35">
          {hint}
        </p>
      )}
      {invalid && (
        <p id={errorId} className="mt-1.5 text-xs text-destructive-foreground">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}

function Select({
  label,
  name,
  options,
  placeholder,
  errors,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  errors?: string[];
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-white/80">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={placeholder ? "" : options[0]?.value}
        aria-invalid={errors?.length ? true : undefined}
        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {placeholder && (
          <option value="" className="bg-card">
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-card">
            {option.label}
          </option>
        ))}
      </select>
      {errors?.[0] && (
        <p className="mt-1.5 text-xs text-destructive-foreground">{errors[0]}</p>
      )}
    </div>
  );
}

/** Mirrors `requiresGuardian` on the server — this copy only drives the UI. */
function isUnder18(dateOfBirth: string, cohortStartsOn: string): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;

  const eighteenth = new Date(dob);
  eighteenth.setFullYear(eighteenth.getFullYear() + 18);
  return eighteenth > new Date(cohortStartsOn);
}
