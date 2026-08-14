-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "bootcamp";

-- CreateEnum
CREATE TYPE "bootcamp"."CohortMode" AS ENUM ('ONLINE', 'PHYSICAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "bootcamp"."CohortStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'RUNNING', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "bootcamp"."TrackStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'RUNNING', 'CANCELLED', 'NEXT_COHORT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "bootcamp"."RegistrationStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "bootcamp"."AttendMode" AS ENUM ('PHYSICAL', 'ONLINE');

-- CreateEnum
CREATE TYPE "bootcamp"."ExperienceLevel" AS ENUM ('NONE', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "bootcamp"."PaymentProvider" AS ENUM ('PAYSTACK', 'OFFLINE', 'COMP');

-- CreateEnum
CREATE TYPE "bootcamp"."PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'ABANDONED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "bootcamp"."SessionStatus" AS ENUM ('SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "bootcamp"."AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "bootcamp"."AttendanceMethod" AS ENUM ('CHECK_IN_CODE', 'FACILITATOR', 'ADMIN_OVERRIDE');

-- CreateTable
CREATE TABLE "bootcamp"."Bootcamp" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "coverImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bootcamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."Cohort" (
    "id" TEXT NOT NULL,
    "bootcampId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "bootcamp"."CohortMode" NOT NULL DEFAULT 'PHYSICAL',
    "venueName" TEXT,
    "venueAddress" TEXT,
    "virtualLink" TEXT,
    "venueCapacity" INTEGER,
    "orientationAt" TIMESTAMP(3),
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "goNoGoOn" DATE,
    "totalSessions" INTEGER NOT NULL,
    "minAttendance" INTEGER NOT NULL,
    "whatsappGroupUrl" TEXT,
    "status" "bootcamp"."CohortStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."Facilitator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "showPublicly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Facilitator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."Track" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "outcomes" TEXT[],
    "facilitatorId" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "minEnrollment" INTEGER NOT NULL DEFAULT 4,
    "slotStart" TEXT,
    "slotEnd" TEXT,
    "status" "bootcamp"."TrackStatus" NOT NULL DEFAULT 'PROPOSED',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."PriceTier" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "trackId" TEXT,
    "name" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxSeats" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."Registration" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "priceTierId" TEXT,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "experience" "bootcamp"."ExperienceLevel" NOT NULL DEFAULT 'NONE',
    "motivation" TEXT,
    "heardFrom" TEXT,
    "attendMode" "bootcamp"."AttendMode" NOT NULL DEFAULT 'PHYSICAL',
    "status" "bootcamp"."RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "holdExpiresAt" TIMESTAMP(3),
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."Payment" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "provider" "bootcamp"."PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
    "reference" TEXT NOT NULL,
    "baseKobo" INTEGER NOT NULL,
    "feeKobo" INTEGER NOT NULL DEFAULT 0,
    "totalKobo" INTEGER NOT NULL,
    "paidKobo" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "bootcamp"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT,
    "paidAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "recordedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."Session" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "durationMins" INTEGER NOT NULL DEFAULT 90,
    "checkInCode" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "status" "bootcamp"."SessionStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."Attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "status" "bootcamp"."AttendanceStatus" NOT NULL,
    "method" "bootcamp"."AttendanceMethod" NOT NULL,
    "markedById" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."Certificate" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "verifyCode" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "sessionsAttended" INTEGER NOT NULL,
    "sessionsTotal" INTEGER NOT NULL,
    "pdfUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."WaitlistEntry" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT,
    "trackId" TEXT,
    "trackName" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."CohortMedia" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CohortMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."Testimonial" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "trackName" TEXT,
    "quote" TEXT NOT NULL,
    "photoUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bootcamp"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bootcamp_slug_key" ON "bootcamp"."Bootcamp"("slug");

-- CreateIndex
CREATE INDEX "Cohort_status_idx" ON "bootcamp"."Cohort"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_bootcampId_slug_key" ON "bootcamp"."Cohort"("bootcampId", "slug");

-- CreateIndex
CREATE INDEX "Track_cohortId_status_idx" ON "bootcamp"."Track"("cohortId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Track_cohortId_slug_key" ON "bootcamp"."Track"("cohortId", "slug");

-- CreateIndex
CREATE INDEX "PriceTier_cohortId_isActive_idx" ON "bootcamp"."PriceTier"("cohortId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_referenceCode_key" ON "bootcamp"."Registration"("referenceCode");

-- CreateIndex
CREATE INDEX "Registration_cohortId_status_idx" ON "bootcamp"."Registration"("cohortId", "status");

-- CreateIndex
CREATE INDEX "Registration_trackId_status_idx" ON "bootcamp"."Registration"("trackId", "status");

-- CreateIndex
CREATE INDEX "Registration_email_idx" ON "bootcamp"."Registration"("email");

-- CreateIndex
CREATE INDEX "Registration_status_holdExpiresAt_idx" ON "bootcamp"."Registration"("status", "holdExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "bootcamp"."Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_registrationId_idx" ON "bootcamp"."Payment"("registrationId");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "bootcamp"."Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Session_cohortId_scheduledFor_idx" ON "bootcamp"."Session"("cohortId", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "Session_trackId_sequence_key" ON "bootcamp"."Session"("trackId", "sequence");

-- CreateIndex
CREATE INDEX "Attendance_registrationId_idx" ON "bootcamp"."Attendance"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_sessionId_registrationId_key" ON "bootcamp"."Attendance"("sessionId", "registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_registrationId_key" ON "bootcamp"."Certificate"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verifyCode_key" ON "bootcamp"."Certificate"("verifyCode");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_serial_key" ON "bootcamp"."Certificate"("serial");

-- CreateIndex
CREATE INDEX "WaitlistEntry_cohortId_idx" ON "bootcamp"."WaitlistEntry"("cohortId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_email_idx" ON "bootcamp"."WaitlistEntry"("email");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "bootcamp"."AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "bootcamp"."Cohort" ADD CONSTRAINT "Cohort_bootcampId_fkey" FOREIGN KEY ("bootcampId") REFERENCES "bootcamp"."Bootcamp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."Track" ADD CONSTRAINT "Track_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "bootcamp"."Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."Track" ADD CONSTRAINT "Track_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "bootcamp"."Facilitator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."PriceTier" ADD CONSTRAINT "PriceTier_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "bootcamp"."Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."PriceTier" ADD CONSTRAINT "PriceTier_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "bootcamp"."Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."Registration" ADD CONSTRAINT "Registration_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "bootcamp"."Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."Registration" ADD CONSTRAINT "Registration_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "bootcamp"."Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."Registration" ADD CONSTRAINT "Registration_priceTierId_fkey" FOREIGN KEY ("priceTierId") REFERENCES "bootcamp"."PriceTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."Payment" ADD CONSTRAINT "Payment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "bootcamp"."Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."Session" ADD CONSTRAINT "Session_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "bootcamp"."Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."Session" ADD CONSTRAINT "Session_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "bootcamp"."Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."Attendance" ADD CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "bootcamp"."Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."Attendance" ADD CONSTRAINT "Attendance_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "bootcamp"."Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."Certificate" ADD CONSTRAINT "Certificate_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "bootcamp"."Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "bootcamp"."Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "bootcamp"."Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."CohortMedia" ADD CONSTRAINT "CohortMedia_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "bootcamp"."Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bootcamp"."Testimonial" ADD CONSTRAINT "Testimonial_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "bootcamp"."Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
