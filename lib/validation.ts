import { z } from "zod";

/**
 * Nigerian mobile numbers, in the shapes people actually type them:
 * 08012345678, 8012345678, +2348012345678, 234 801 234 5678.
 */
const NG_PHONE = /^(?:\+?234|0)?[789][01]\d{8}$/;

export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .refine((value) => NG_PHONE.test(value), {
    message: "Enter a valid Nigerian phone number",
  })
  .transform((value) => {
    const digits = value.replace(/^\+?234/, "").replace(/^0/, "");
    return `+234${digits}`;
  });

export const experienceSchema = z.enum([
  "NONE",
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
]);

/**
 * Note what is absent: no amount, no price tier, no track id.
 *
 * The tier is resolved server-side (PRD §7.3) and the track comes from the
 * URL slug, so a crafted request cannot buy a ₦30,000 seat for ₦1.
 */
export const registrationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: phoneSchema,

  dateOfBirth: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : undefined))
    .refine((date) => !date || !Number.isNaN(date.getTime()), {
      message: "Enter a valid date",
    }),

  // Required for under-18s. Enforced in `refine` below rather than here,
  // because it depends on dateOfBirth.
  guardianName: z.string().trim().max(120).optional().or(z.literal("")),
  guardianPhone: phoneSchema.optional().or(z.literal("")),

  experience: experienceSchema.default("NONE"),
  motivation: z.string().trim().max(2000).optional().or(z.literal("")),
  heardFrom: z.string().trim().max(120).optional().or(z.literal("")),

  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(120).optional(),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

/**
 * "Don't Waste Your Break" will attract secondary school students, so guardian
 * details are required whenever the date of birth puts someone under 18 at the
 * cohort start. PRD §12 also has legal copy outstanding here.
 */
export function requiresGuardian(
  dateOfBirth: Date | undefined,
  cohortStart: Date,
): boolean {
  if (!dateOfBirth) return false;
  const eighteenth = new Date(dateOfBirth);
  eighteenth.setFullYear(eighteenth.getFullYear() + 18);
  return eighteenth > cohortStart;
}

export const waitlistSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: phoneSchema.optional().or(z.literal("")),
  trackSlug: z.string().trim().max(120).optional(),
  trackName: z.string().trim().max(120).optional(),
});

export const checkInSchema = z.object({
  referenceCode: z.string().trim().min(4).max(32),
  code: z.string().trim().min(4).max(16),
});
