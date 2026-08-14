import { GridBackdrop } from "@/components/site/grid-backdrop";
import { SectionHeading } from "@/components/home/track-grid";
import { formatNaira } from "@/lib/pricing";
import type { CohortView } from "@/lib/queries";

/**
 * !! Three answers below are blocked on legal copy (PRD §12 / open item A4):
 *    refunds, media consent, and guardian consent for under-18s.
 *
 * They are marked with `pendingLegal` and render a visible placeholder rather
 * than invented terms. Do not write substitute wording — "Don't Waste Your
 * Break" will attract secondary school students, and a made-up refund or
 * consent statement shown pre-payment is a liability, not a gap in the copy.
 */
type Faq = {
  q: string;
  a: string;
  pendingLegal?: boolean;
};

export function Faq({ cohort }: { cohort: NonNullable<CohortView> }) {
  const items: Faq[] = [
    {
      q: "Do I need any experience?",
      a: "No. Every track starts from the beginning. The registration form asks about your experience so the facilitator knows the room they are walking into.",
    },
    {
      q: "Do I need my own laptop?",
      a: "For Coding and Artificial Intelligence, yes — bring a laptop you can install software on. For Content Creation, a phone with a decent camera is enough to start.",
    },
    {
      q: "What happens if not enough people sign up for my track?",
      a: `Tracks need a minimum enrolment to run. The call is made on ${cohort.goNoGoOn ? cohort.goNoGoOn.toISOString().slice(0, 10) : "the go/no-go date"}. If your track does not run, you can move to another track, roll forward to the next cohort at the price you paid, or take a full refund including the processing fee — that cancellation is our decision, so we absorb the fee.`,
    },
    {
      q: "Can I pay by bank transfer?",
      a: "Yes. Reserve your seat, then reply to your confirmation email and we will send account details and record the payment against your reference code.",
    },
    {
      q: "How do I get a certificate?",
      a: `Attend at least ${cohort.minAttendance} of the ${cohort.totalSessions} sessions. Certificates are issued after the final session and carry a code anyone can verify on this site, free.`,
    },
    {
      q: "Why is the total more than the advertised price?",
      a: "Card processing is charged by Paystack. We show it as a separate line before you pay rather than burying it, so nothing about the total is a surprise at checkout.",
    },
    {
      q: "What is your refund policy?",
      a: "",
      pendingLegal: true,
    },
    {
      q: "I am under 18. Can I attend?",
      a: "",
      pendingLegal: true,
    },
  ];

  return (
    <section id="faq" className="relative scroll-mt-20 overflow-hidden py-20">
      <GridBackdrop intensity="subtle" />

      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading eyebrow="FAQ" title="The things people ask" />

        <div className="mt-12 max-w-3xl divide-y divide-white/8 border-y border-white/8">
          {items.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {item.q}
                <span
                  aria-hidden
                  className="shrink-0 text-secondary transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              {item.pendingLegal ? (
                <p className="mt-3 leading-relaxed text-white/40 italic">
                  Being finalised — email us and we will answer directly in the
                  meantime.
                </p>
              ) : (
                <p className="mt-3 leading-relaxed text-white/60">{item.a}</p>
              )}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Shown alongside pricing so the fee never reads as a hidden markup. */
export function feeLine(baseKobo: number, feeKobo: number, totalKobo: number) {
  return `${formatNaira(baseKobo)} + ${formatNaira(feeKobo)} processing = ${formatNaira(totalKobo)}`;
}
