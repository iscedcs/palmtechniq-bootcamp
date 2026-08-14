"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function WaitlistForm({
  tracks,
}: {
  tracks: { slug: string; name: string }[];
}) {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("track") ?? "";

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { alreadyOnList: boolean }>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setDone({ alreadyOnList: Boolean(body.alreadyOnList) });
    } catch {
      setError("We couldn't reach the server. Check your connection.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="glass-card mt-9 p-6 text-center">
        <p className="text-lg font-semibold">
          {done.alreadyOnList ? "You're already on the list" : "You're on the list"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          We'll email you the moment there's news. No spam, no newsletter.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-9 space-y-5" noValidate>
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-white/80">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white/80">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-white/80">
          Phone <span className="font-normal text-white/35">Optional</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="08012345678"
          autoComplete="tel"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="trackSlug"
          className="block text-sm font-medium text-white/80"
        >
          Which track?
        </label>
        <select
          id="trackSlug"
          name="trackSlug"
          defaultValue={preselected}
          className={inputClass}
        >
          <option value="" className="bg-card">
            Not sure yet
          </option>
          {tracks.map((track) => (
            <option key={track.slug} value={track.slug} className="bg-card">
              {track.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-primary px-7 py-4 font-semibold text-brand-black transition-transform hover:scale-[1.01] disabled:opacity-60"
      >
        {submitting ? "Adding you…" : "Add me to the waitlist"}
      </button>
    </form>
  );
}

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/25 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30";
