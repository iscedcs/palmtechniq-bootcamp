"use client";

import { useActionState } from "react";
import { decideTrack, type ActionResult } from "@/app/admin/actions";

/**
 * The go/no-go control. PRD §9.
 *
 * Cancelling asks for confirmation and says how many people it affects,
 * because the action commits PalmTechnIQ to contacting every one of them with
 * three options.
 */
export function TrackDecision({
  trackId,
  trackName,
  status,
  paid,
  minEnrollment,
}: {
  trackId: string;
  trackName: string;
  status: string;
  paid: number;
  minEnrollment: number;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    decideTrack,
    null,
  );

  if (status === "CANCELLED") {
    return <span className="text-xs text-destructive-foreground/70">Cancelled</span>;
  }

  return (
    <form
      action={action}
      className="flex items-center justify-end gap-2"
      onSubmit={(event) => {
        const decision = (
          event.nativeEvent as SubmitEvent
        ).submitter?.getAttribute("value");

        if (decision === "CANCELLED") {
          const message =
            paid > 0
              ? `Cancel ${trackName}? ${paid} paid ${paid === 1 ? "person" : "people"} will need to be contacted with a transfer, roll-forward, or full refund including the fee.`
              : `Cancel ${trackName}? Nobody has paid yet.`;
          if (!confirm(message)) event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="trackId" value={trackId} />

      {status !== "CONFIRMED" && (
        <button
          type="submit"
          name="decision"
          value="CONFIRMED"
          disabled={pending}
          className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          {paid >= minEnrollment ? "Confirm" : "Confirm anyway"}
        </button>
      )}

      <button
        type="submit"
        name="decision"
        value="CANCELLED"
        disabled={pending}
        className="rounded-full border border-white/12 px-3 py-1 text-xs text-white/50 transition-colors hover:border-destructive/50 hover:text-white disabled:opacity-50"
      >
        Cancel
      </button>

      {state && !state.ok && (
        <span className="text-xs text-destructive-foreground">{state.error}</span>
      )}
    </form>
  );
}
