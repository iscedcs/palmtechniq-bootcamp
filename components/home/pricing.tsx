import { GridBackdrop } from "@/components/site/grid-backdrop";
import { SectionHeading } from "@/components/home/track-grid";
import { longDate } from "@/lib/dates";
import { formatNaira } from "@/lib/pricing";
import type { TierCard } from "@/lib/queries";

/**
 * PRD §7.2 — fee disclosure is required, not optional.
 *
 * The flyer says ₦15,000. A customer must never meet the processing fee for
 * the first time on the Paystack screen, so it is itemised here and again on
 * the registration page before checkout.
 */
export function Pricing({ tiers }: { tiers: TierCard[] }) {
  const now = new Date();

  return (
    <section id="pricing" className="relative scroll-mt-20 overflow-hidden py-20">
      <GridBackdrop intensity="subtle" />

      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Pricing"
          title="One price, per track, stated in full"
          blurb="Card processing is charged by Paystack, not by us. It is shown here so the total you see is the total you pay."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:max-w-3xl">
          {tiers.map((tier) => {
            const notYetOpen = tier.startsAt !== null && tier.startsAt > now;
            const closed = tier.endsAt !== null && tier.endsAt < now;
            const soldOut = tier.seatsLeft === 0;
            const unavailable = notYetOpen || closed || soldOut;

            return (
              <article
                key={tier.id}
                className={`glass-card p-7 ${
                  unavailable ? "opacity-45" : "hover-glow"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  {soldOut ? (
                    <span className="rounded-full border border-destructive/50 bg-destructive/20 px-3 py-1 text-xs">
                      Gone
                    </span>
                  ) : (
                    tier.seatsLeft !== null && (
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
                        {tier.seatsLeft} of {tier.maxSeats} left
                      </span>
                    )
                  )}
                </div>

                <p className="mt-5 text-4xl font-bold tracking-tight">
                  {formatNaira(tier.price.totalKobo)}
                </p>

                <dl className="mt-5 space-y-1.5 border-t border-white/10 pt-5 text-sm">
                  <Row label={tier.name} value={formatNaira(tier.price.baseKobo)} />
                  <Row
                    label="Processing fee"
                    value={formatNaira(tier.price.feeKobo)}
                  />
                  <Row
                    label="Total"
                    value={formatNaira(tier.price.totalKobo)}
                    emphasis
                  />
                </dl>

                {tier.endsAt && !closed && (
                  <p className="mt-5 text-xs text-accent">
                    Closes {longDate.format(tier.endsAt)}
                  </p>
                )}
                {notYetOpen && tier.startsAt && (
                  <p className="mt-5 text-xs text-white/45">
                    From {longDate.format(tier.startsAt)}
                  </p>
                )}
              </article>
            );
          })}
        </div>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-white/45">
          Price is per track. Bank transfer is accepted — reserve a seat and
          reply to your confirmation email to arrange it.
        </p>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${
        emphasis ? "pt-1.5 font-semibold text-white" : "text-white/55"
      }`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
