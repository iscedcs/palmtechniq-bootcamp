"use client";

import { useActionState } from "react";
import { recordOfflinePayment, type ActionResult } from "@/app/admin/actions";

/**
 * Record a bank transfer or a comped seat. PRD §7.6.
 *
 * The amount is entered in naira and converted server-side, so nobody has to
 * think in kobo at 11pm the night before a cohort starts. The note is
 * mandatory — an offline payment with no provenance is unreconcilable, and
 * this writes an audit row naming the admin either way.
 */
export function OfflinePaymentForm({
  registrationId,
  defaultAmountNaira,
}: {
  registrationId: string;
  defaultAmountNaira: number;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    recordOfflinePayment,
    null,
  );

  if (state?.ok) {
    return (
      <div className="glass-card p-6">
        <p className="text-sm font-semibold text-primary">Payment recorded</p>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          The seat is confirmed and a receipt has been sent.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="glass-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-secondary/70">
        Record a payment
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-white/40">
        For bank transfers and comped seats. Sends the same receipt a card
        payment would.
      </p>

      <input type="hidden" name="registrationId" value={registrationId} />

      <div className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="provider"
            className="block text-sm font-medium text-white/80"
          >
            Kind
          </label>
          <select
            id="provider"
            name="provider"
            defaultValue="OFFLINE"
            className={inputClass}
          >
            <option value="OFFLINE" className="bg-card">
              Bank transfer
            </option>
            <option value="COMP" className="bg-card">
              Comped (no money changed hands)
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="amountNaira"
            className="block text-sm font-medium text-white/80"
          >
            Amount received (₦)
          </label>
          <input
            id="amountNaira"
            name="amountNaira"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={defaultAmountNaira || undefined}
            required
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-white/35">
            What actually landed in the account, not the advertised price.
          </p>
        </div>

        <div>
          <label htmlFor="note" className="block text-sm font-medium text-white/80">
            Note
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            required
            placeholder="e.g. GTB transfer 13/08, ref 0012345678, sender A. Okoye"
            className={inputClass}
          />
        </div>
      </div>

      {state && !state.ok && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-brand-black disabled:opacity-60"
      >
        {pending ? "Recording…" : "Record payment & confirm seat"}
      </button>
    </form>
  );
}

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30";
