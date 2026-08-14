import { cn } from "@/lib/cn";

/**
 * The main site's tile texture, as a backdrop layer.
 *
 * Always absolutely positioned behind content rather than applied to the
 * section itself: the `cyber-grid-fade` mask needs its own box to dissolve
 * within, otherwise the lattice gets sliced flat at the section boundary and
 * reads as a seam.
 */
export function GridBackdrop({
  className,
  intensity = "default",
}: {
  className?: string;
  /** How much of the lattice shows through. Hero sections carry more. */
  intensity?: "subtle" | "default" | "strong";
}) {
  const opacity = {
    subtle: "opacity-30",
    default: "opacity-60",
    strong: "opacity-100",
  }[intensity];

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 cyber-grid cyber-grid-fade",
        opacity,
        className,
      )}
    />
  );
}
