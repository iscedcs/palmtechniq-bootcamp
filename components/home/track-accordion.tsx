"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  Code2,
  MonitorSmartphone,
  Palette,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import { getTrackMedia } from "@/lib/track-images";
import type { TrackCard } from "@/lib/queries";

const ICONS: Record<string, LucideIcon> = {
  coding: Code2,
  "artificial-intelligence": Sparkles,
  "content-creation": Video,
  "graphic-design": Palette,
  "basic-it": MonitorSmartphone,
};

export function TrackAccordion({
  tracks,
  initialSlug,
}: {
  tracks: TrackCard[];
  initialSlug?: string;
}) {
  const defaultSlug =
    initialSlug ??
    tracks.find((t) => t.isOpen && t.seatsLeft > 0)?.slug ??
    tracks[0]?.slug ??
    "";

  const [activeSlug, setActiveSlug] = useState<string>(defaultSlug);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (isPaused || tracks.length <= 1) return;

    const timer = setInterval(() => {
      setActiveSlug((current) => {
        const currentIndex = tracks.findIndex((t) => t.slug === current);
        const nextIndex = (currentIndex + 1) % tracks.length;
        return tracks[nextIndex].slug;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [isPaused, tracks]);

  return (
    <div
      className="w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ------------------------------------------------------------------
          Desktop: horizontal expanding panels.

          Every layer inside a panel is absolutely positioned. They must not
          be flex children — two siblings both asking for `w-full` inside a
          flex row do not stack, they shrink to 50% each and sit side by side,
          which puts the expanded content in the right-hand half of the panel.
      ------------------------------------------------------------------- */}
      <div className="hidden h-[520px] w-full gap-2.5 md:flex lg:h-[570px]">
        {tracks.map((track) => {
          const isActive = track.slug === activeSlug;
          const media = getTrackMedia(track.slug);
          const soldOut = track.isOpen && track.seatsLeft === 0;
          const nextCohort = !track.isOpen;
          const Icon = ICONS[track.slug] ?? Code2;

          return (
            <button
              key={track.id}
              type="button"
              onClick={() => setActiveSlug(track.slug)}
              onMouseEnter={() => setActiveSlug(track.slug)}
              onFocus={() => setActiveSlug(track.slug)}
              aria-expanded={isActive}
              aria-label={`${track.name} — ${
                nextCohort
                  ? "next cohort"
                  : soldOut
                    ? "full"
                    : `${track.seatsLeft} seats left`
              }`}
              className={`group relative h-full cursor-pointer overflow-hidden rounded-2xl border text-left transition-[flex-grow,border-color] duration-500 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                isActive
                  ? "flex-[5] border-accent/50 shadow-2xl shadow-black/40"
                  : "flex-[0.85] border-white/8 hover:border-white/20"
              }`}
            >
              {/* Photograph */}
              <Image
                src={media.image}
                alt={isActive ? media.alt : ""}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 720px"
                className={`object-cover transition-all duration-700 ${
                  isActive
                    ? "scale-100 opacity-100"
                    : "scale-105 opacity-35 saturate-50"
                }`}
                priority={isActive}
              />

              {/* Legibility scrim. Heavier bottom-left on the active panel so
                  the headline sits on near-solid ground; flat wash on the
                  collapsed ones so the vertical label reads. */}
              <div
                className={`absolute inset-0 transition-opacity duration-500 ${
                  isActive
                    ? "bg-gradient-to-tr from-background via-background/85 to-background/25"
                    : "bg-background/80"
                }`}
              />

              {/* Gold rule along the top of the active panel. */}
              <div
                className={`absolute inset-x-0 top-0 h-[3px] bg-accent transition-opacity duration-500 ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* ---- Collapsed ---- */}
              <div
                aria-hidden={isActive}
                className={`absolute inset-0 flex flex-col items-center justify-between py-6 transition-opacity duration-300 ${
                  isActive ? "pointer-events-none opacity-0" : "opacity-100"
                }`}
              >
                <span className="flex size-9 items-center justify-center rounded-lg border border-accent/40 text-accent">
                  <Icon className="size-4" strokeWidth={1.5} />
                </span>

                <span className="whitespace-nowrap text-sm tracking-wide text-white/70 [writing-mode:vertical-rl] rotate-180 transition-colors group-hover:text-white">
                  {track.name}
                </span>

                <span
                  className={`size-1.5 rounded-full ${
                    nextCohort
                      ? "bg-white/25"
                      : soldOut
                        ? "bg-destructive"
                        : track.seatsLeft <= 3
                          ? "animate-pulse bg-accent"
                          : "bg-accent"
                  }`}
                />
              </div>

              {/* ---- Expanded ---- */}
              <div
                aria-hidden={!isActive}
                className={`absolute inset-0 flex flex-col justify-between p-7 transition-opacity duration-500 lg:p-9 ${
                  isActive ? "opacity-100 delay-100" : "pointer-events-none opacity-0"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-accent/90 px-3.5 py-1.5 text-xs font-semibold text-brand-black">
                    <Icon className="size-3.5" strokeWidth={2} />
                    {nextCohort
                      ? "Next cohort"
                      : soldOut
                        ? "Full"
                        : `${track.seatsLeft} of ${track.capacity} seats left`}
                  </span>

                  <span className="hidden text-[11px] font-medium uppercase tracking-[0.22em] text-white/45 lg:block">
                    Explore track
                  </span>
                </div>

                <div className="max-w-lg">
                  {track.slotStart && track.slotEnd && (
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-secondary">
                      {track.slotStart} – {track.slotEnd} · Wed / Fri / Sat
                    </p>
                  )}

                  <h3 className="mt-2.5 text-3xl font-bold tracking-tight text-white lg:text-4xl">
                    {track.name}
                  </h3>

                  {track.summary && (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/70 lg:text-base">
                      {track.summary}
                    </p>
                  )}

                  {/* Rendered as spans, not links — this panel is a <button>,
                      and a link inside a button is invalid HTML that browsers
                      resolve unpredictably. The whole panel navigates via the
                      overlay anchor below. */}
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                    {nextCohort || soldOut
                      ? soldOut
                        ? "Join the waitlist"
                        : "Tell me when it opens"
                      : `Reserve a seat on ${track.name}`}
                    <ChevronRight className="size-4" strokeWidth={2.5} />
                  </span>
                </div>
              </div>

              {/* The actual navigation target, covering the active panel only.
                  Keeps the click target huge without nesting a link in a
                  button. */}
              {isActive && (
                <Link
                  href={
                    nextCohort || soldOut
                      ? `/waitlist?track=${track.slug}`
                      : `/register/${track.slug}`
                  }
                  className="absolute inset-0 z-10"
                  aria-label={
                    nextCohort || soldOut
                      ? `Join the waitlist for ${track.name}`
                      : `Reserve a seat on ${track.name}`
                  }
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------
          Mobile: stacked disclosure. The horizontal metaphor has nowhere to
          go under 768px, and this audience is overwhelmingly on phones.
      ------------------------------------------------------------------- */}
      <div className="space-y-3 md:hidden">
        {tracks.map((track) => {
          const isActive = track.slug === activeSlug;
          const media = getTrackMedia(track.slug);
          const soldOut = track.isOpen && track.seatsLeft === 0;
          const nextCohort = !track.isOpen;
          const Icon = ICONS[track.slug] ?? Code2;

          return (
            <div
              key={track.id}
              className={`overflow-hidden rounded-2xl border transition-colors ${
                isActive ? "border-accent/40" : "border-white/10"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveSlug(isActive ? "" : track.slug)}
                aria-expanded={isActive}
                className="relative flex w-full items-center gap-3 p-4 text-left"
              >
                <Image
                  src={media.image}
                  alt=""
                  fill
                  sizes="100vw"
                  className="object-cover opacity-25"
                />
                <span className="absolute inset-0 bg-background/75" />

                <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent/40 text-accent">
                  <Icon className="size-4" strokeWidth={1.5} />
                </span>

                <span className="relative min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">
                    {track.name}
                  </span>
                  {track.slotStart && track.slotEnd && (
                    <span className="block text-xs text-white/50">
                      {track.slotStart} – {track.slotEnd}
                    </span>
                  )}
                </span>

                <span
                  className={`relative shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                    nextCohort
                      ? "border border-white/15 text-white/50"
                      : soldOut
                        ? "border border-destructive/40 bg-destructive/20 text-white/80"
                        : "bg-accent text-brand-black"
                  }`}
                >
                  {nextCohort ? "Next" : soldOut ? "Full" : `${track.seatsLeft} left`}
                </span>
              </button>

              {isActive && (
                <div className="space-y-3 border-t border-white/10 p-4">
                  {track.summary && (
                    <p className="text-sm leading-relaxed text-white/70">
                      {track.summary}
                    </p>
                  )}
                  <Link
                    href={
                      nextCohort || soldOut
                        ? `/waitlist?track=${track.slug}`
                        : `/register/${track.slug}`
                    }
                    className={`flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${
                      nextCohort || soldOut
                        ? "border border-white/20 text-white"
                        : "bg-primary text-brand-black"
                    }`}
                  >
                    {nextCohort || soldOut
                      ? soldOut
                        ? "Join the waitlist"
                        : "Tell me when it opens"
                      : "Reserve a seat"}
                    <ChevronRight className="size-4" strokeWidth={2.5} />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
