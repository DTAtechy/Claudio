-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ATTORNEY', 'STAFF');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('INTAKE', 'ACTIVE', 'LITIGATION', 'SETTLEMENT', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CasePracticeArea" AS ENUM ('PERSONAL_INJURY', 'MARITIME', 'JONES_ACT', 'LHWCA', 'PRODUCT_LIABILITY', 'PREMISES_LIABILITY', 'AUTO', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CLIENT', 'OPPOSING_PARTY', 'OPPOSING_COUNSEL', 'WITNESS', 'EXPERT', 'MEDICAL_PROVIDER', 'INSURANCE_ADJUSTER', 'COURT', 'OTHER');

-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('DEADLINE', 'STATUTE_OF_LIMITATIONS', 'HEARING', 'DEPOSITION', 'MEDIATION', 'TRIAL', 'MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SyncSource" AS ENUM ('INTERNAL', 'OUTLOOK_SYNC', 'SHAREPOINT_SYNC', 'LAWTOOLBOX');

-- CreateEnum
CREATE TYPE "IntakeChannel" AS ENUM ('EMAIL', 'PHONE', 'CHAT', 'WEB_FORM', 'SMS');

-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'CONVERTED', 'CLOSED', 'SPAM');

-- CreateEnum
CREATE TYPE "IntakeMessageRole" AS ENUM ('USER', 'STAFF', 'AI');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicrosoftAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "msUserId" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "refreshTokenCipher" TEXT NOT NULL,
    "calendarDeltaLink" TEXT,
    "driveDeltaLink" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicrosoftAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'INTAKE',
    "practiceArea" "CasePracticeArea" NOT NULL DEFAULT 'PERSONAL_INJURY',
    "description" TEXT,
    "incidentDate" TIMESTAMP(3),
    "statuteOfLimitations" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,
    "source" "SyncSource" NOT NULL DEFAULT 'INTERNAL',
    "externalId" TEXT,
    "externalUrl" TEXT,
    "etag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" "EventKind" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "notes" TEXT,
    "source" "SyncSource" NOT NULL DEFAULT 'INTERNAL',
    "externalId" TEXT,
    "externalCalendar" TEXT,
    "externalCategory" TEXT,
    "etag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "dueAt" TIMESTAMP(3),
    "assigneeId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeLead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "channel" "IntakeChannel" NOT NULL,
    "status" "IntakeStatus" NOT NULL DEFAULT 'NEW',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "source" TEXT,
    "callerName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "rawData" JSONB,
    "aiClassification" TEXT,
    "aiExtractedFacts" JSONB,
    "aiPriorityReason" TEXT,
    "aiDraftReply" TEXT,
    "aiProcessedAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "convertedToCaseId" TEXT,
    "externalId" TEXT,
    "externalThreadId" TEXT,

    CONSTRAINT "IntakeLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "role" "IntakeMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "senderName" TEXT,

    CONSTRAINT "IntakeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MicrosoftAccount_userId_key" ON "MicrosoftAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseNumber_key" ON "Case"("caseNumber");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_practiceArea_idx" ON "Case"("practiceArea");

-- CreateIndex
CREATE INDEX "Case_statuteOfLimitations_idx" ON "Case"("statuteOfLimitations");

-- CreateIndex
CREATE INDEX "Contact_caseId_idx" ON "Contact"("caseId");

-- CreateIndex
CREATE INDEX "Contact_type_idx" ON "Contact"("type");

-- CreateIndex
CREATE INDEX "Document_caseId_idx" ON "Document"("caseId");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "Document_source_externalId_idx" ON "Document"("source", "externalId");

-- CreateIndex
CREATE INDEX "CalendarEvent_caseId_idx" ON "CalendarEvent"("caseId");

-- CreateIndex
CREATE INDEX "CalendarEvent_startsAt_idx" ON "CalendarEvent"("startsAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_kind_idx" ON "CalendarEvent"("kind");

-- CreateIndex
CREATE INDEX "CalendarEvent_source_externalId_idx" ON "CalendarEvent"("source", "externalId");

-- CreateIndex
CREATE INDEX "Task_caseId_idx" ON "Task"("caseId");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");

-- CreateIndex
CREATE INDEX "Note_caseId_idx" ON "Note"("caseId");

-- CreateIndex
CREATE INDEX "Note_authorId_idx" ON "Note"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeLead_convertedToCaseId_key" ON "IntakeLead"("convertedToCaseId");

-- CreateIndex
CREATE INDEX "IntakeLead_status_idx" ON "IntakeLead"("status");

-- CreateIndex
CREATE INDEX "IntakeLead_channel_idx" ON "IntakeLead"("channel");

-- CreateIndex
CREATE INDEX "IntakeLead_priority_idx" ON "IntakeLead"("priority");

-- CreateIndex
CREATE INDEX "IntakeLead_assignedToId_idx" ON "IntakeLead"("assignedToId");

-- CreateIndex
CREATE INDEX "IntakeLead_createdAt_idx" ON "IntakeLead"("createdAt");

-- CreateIndex
CREATE INDEX "IntakeMessage_leadId_idx" ON "IntakeMessage"("leadId");

-- AddForeignKey
ALTER TABLE "MicrosoftAccount" ADD CONSTRAINT "MicrosoftAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeLead" ADD CONSTRAINT "IntakeLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeLead" ADD CONSTRAINT "IntakeLead_convertedToCaseId_fkey" FOREIGN KEY ("convertedToCaseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeMessage" ADD CONSTRAINT "IntakeMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "IntakeLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
