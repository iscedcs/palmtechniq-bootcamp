import {
  CohortMode,
  CohortStatus,
  PrismaClient,
  SessionStatus,
  TrackStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });
/** West Africa Time is UTC+1 year-round — no daylight saving. */
const WAT_OFFSET = "+01:00";

/** A wall-clock time in Lagos, as an instant. */
function wat(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${WAT_OFFSET}`);
}

/** A calendar date, for @db.Date columns. */
function day(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** PRD §2.3. Every open track sits all fourteen. */
const SESSION_DATES = [
  "2026-08-26",
  "2026-08-28",
  "2026-08-29",
  "2026-09-02",
  "2026-09-04",
  "2026-09-05",
  "2026-09-09",
  "2026-09-11",
  "2026-09-12",
  "2026-09-16",
  "2026-09-18",
  "2026-09-19",
  "2026-09-23",
  "2026-09-25",
];

/**
 * Venue capacity is 10 and three tracks run, so tracks are staggered and never
 * concurrent. The 30-minute gaps absorb turnover and overrun.
 */
const TRACKS = [
  {
    slug: "coding",
    name: "Coding",
    summary:
      "Build and ship a working web application from an empty folder. HTML, CSS, JavaScript, and the habits that make code maintainable.",
    outcomes: [
      "Read and write JavaScript with confidence",
      "Build a responsive page from a design",
      "Use Git and publish work to the web",
      "Ship one project you can show an employer",
    ],
    slotStart: "10:00",
    slotEnd: "11:30",
    status: TrackStatus.CONFIRMED,
    displayOrder: 1,
  },
  {
    slug: "artificial-intelligence",
    name: "Artificial Intelligence",
    summary:
      "Work with the models everyone is talking about — prompting, tooling, and building something real on top of them.",
    outcomes: [
      "Understand what a language model can and cannot do",
      "Write prompts that produce reliable output",
      "Build an AI-assisted tool end to end",
      "Judge AI claims critically",
    ],
    slotStart: "12:00",
    slotEnd: "13:30",
    status: TrackStatus.CONFIRMED,
    displayOrder: 2,
  },
  {
    slug: "content-creation",
    name: "Content Creation & Videography",
    summary:
      "Shoot, cut, and publish video that people finish watching. Camera work, editing, and the storytelling underneath both.",
    outcomes: [
      "Frame and light a shot with the gear you own",
      "Edit a sequence that holds attention",
      "Record and mix clean audio",
      "Publish a finished piece to a platform",
    ],
    slotStart: "14:00",
    slotEnd: "15:30",
    status: TrackStatus.CONFIRMED,
    displayOrder: 3,
  },
  {
    slug: "graphic-design",
    name: "Graphic Design",
    summary:
      "Layout, type, and colour for people who want their work to look intentional.",
    outcomes: [],
    slotStart: null,
    slotEnd: null,
    status: TrackStatus.NEXT_COHORT,
    displayOrder: 4,
  },
  {
    slug: "basic-it",
    name: "Basic Information Technology",
    summary:
      "The computing fundamentals every other track quietly assumes you already have.",
    outcomes: [],
    slotStart: null,
    slotEnd: null,
    status: TrackStatus.NEXT_COHORT,
    displayOrder: 5,
  },
];

/**
 * PRD §0 A2 — track assignment is not yet fixed, so these are seeded with
 * showPublicly false until bios are written and assignment is confirmed.
 */
const FACILITATORS = ["Ayobami Paul", "Onyekachukwu Divine", "Itodo Victor"];

async function main() {
  const bootcamp = await db.bootcamp.upsert({
    where: { slug: "dont-waste-your-break" },
    update: {},
    create: {
      slug: "dont-waste-your-break",
      name: "Don't Waste Your Break",
      tagline: "Five weeks. One skill. Something to show for the holidays.",
      description:
        "A physical, small-group bootcamp in Festac. Three tracks, ten seats each, fourteen sessions of ninety minutes.",
    },
  });

  const cohort = await db.cohort.upsert({
    where: { bootcampId_slug: { bootcampId: bootcamp.id, slug: "aug-2026" } },
    update: {},
    create: {
      bootcampId: bootcamp.id,
      slug: "aug-2026",
      name: "August 2026",
      mode: CohortMode.PHYSICAL,
      venueName: "AMG Workspace",
      venueAddress:
        "1st Floor, Chicken Republic Building, 22 Road, Festac Town, Lagos",
      venueCapacity: 10,
      orientationAt: wat("2026-08-24", "10:00"),
      startsOn: day("2026-08-26"),
      endsOn: day("2026-09-25"),
      goNoGoOn: day("2026-08-21"),
      totalSessions: 14,
      minAttendance: 10,
      // PRD §18 item 6 — set this once the group exists. The success page
      // CTA is the highest-conversion moment in the funnel.
      whatsappGroupUrl: null,
      status: CohortStatus.OPEN,
    },
  });

  for (const name of FACILITATORS) {
    const existing = await db.facilitator.findFirst({ where: { name } });
    if (!existing) {
      await db.facilitator.create({ data: { name, showPublicly: false } });
    }
  }

  for (const track of TRACKS) {
    const record = await db.track.upsert({
      where: { cohortId_slug: { cohortId: cohort.id, slug: track.slug } },
      update: {},
      create: {
        cohortId: cohort.id,
        slug: track.slug,
        name: track.name,
        summary: track.summary,
        outcomes: track.outcomes,
        capacity: 10,
        minEnrollment: 4,
        slotStart: track.slotStart,
        slotEnd: track.slotEnd,
        status: track.status,
        displayOrder: track.displayOrder,
      },
    });

    // Only open tracks get a schedule. Graphic Design and Basic IT capture
    // waitlist interest instead.
    if (track.status !== TrackStatus.CONFIRMED || !track.slotStart) continue;

    for (const [index, date] of SESSION_DATES.entries()) {
      const sequence = index + 1;
      await db.session.upsert({
        where: { trackId_sequence: { trackId: record.id, sequence } },
        update: {},
        create: {
          cohortId: cohort.id,
          trackId: record.id,
          sequence,
          // PRD §18 item 7 — real titles are outstanding, and these are
          // visible to students on their schedule.
          title: `${track.name} — Session ${sequence}`,
          scheduledFor: wat(date, track.slotStart),
          durationMins: 90,
          status: SessionStatus.SCHEDULED,
        },
      });
    }
  }

  // Cohort-wide tiers: trackId null applies to every track.
  //
  // maxSeats 9 caps discounted seats across all three tracks, per PRD §17.
  // The PRD notes a per-track alternative (three track-scoped tiers at
  // maxSeats 3) is fairer if one track sells faster — that is a seed change,
  // not a code change.
  const tiers = [
    {
      name: "Early bird",
      amountKobo: 1_500_000,
      startsAt: null,
      endsAt: wat("2026-08-21", "23:59"),
      maxSeats: 9,
      displayOrder: 1,
    },
    {
      name: "Standard",
      amountKobo: 3_000_000,
      startsAt: wat("2026-08-22", "00:00"),
      endsAt: null,
      maxSeats: null,
      displayOrder: 2,
    },
  ];

  for (const tier of tiers) {
    const existing = await db.priceTier.findFirst({
      where: { cohortId: cohort.id, trackId: null, name: tier.name },
    });
    if (!existing) {
      await db.priceTier.create({ data: { cohortId: cohort.id, ...tier } });
    }
  }

  const sessionCount = await db.session.count({
    where: { cohortId: cohort.id },
  });
  console.log(
    `Seeded ${bootcamp.name} / ${cohort.name}: ${TRACKS.length} tracks, ${sessionCount} sessions, ${tiers.length} price tiers.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
