-- Initial schema generated for MVP
CREATE TYPE "UserRole" AS ENUM ('HUMAN','ADMIN');
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE','DISABLED');
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT','POSTED','INVITED','OPEN','ASSIGNED','IN_PROGRESS','REVIEW','COMPLETED','DISPUTED','CANCELED');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING','ACCEPTED','DECLINED');
CREATE TYPE "EscrowStatus" AS ENUM ('CREATED','FUNDED','RELEASED','DISPUTED','RESOLVED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING','PAID');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'HUMAN',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "verifyToken" TEXT,
  "trusted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE TABLE "AgentClient" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "apiKeyHash" TEXT NOT NULL UNIQUE,
  "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE TABLE "HumanProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id"),
  "name" TEXT NOT NULL,
  "bio" TEXT,
  "skills" TEXT[] NOT NULL,
  "hourlyRate" DOUBLE PRECISION,
  "fixedRate" DOUBLE PRECISION,
  "city" TEXT,
  "country" TEXT,
  "availability" BOOLEAN NOT NULL DEFAULT true,
  "languages" TEXT[] NOT NULL,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
  "completedTasksCount" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "Task" (
  "id" TEXT PRIMARY KEY,
  "createdByAgentId" TEXT NOT NULL REFERENCES "AgentClient"("id"),
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requiredSkills" TEXT[] NOT NULL,
  "city" TEXT,
  "country" TEXT,
  "deadline" TIMESTAMP NOT NULL,
  "budget" DOUBLE PRECISION NOT NULL,
  "acceptanceCriteria" TEXT NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE TABLE "TaskInvitation" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"("id"),
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  UNIQUE("taskId","userId")
);
CREATE TABLE "TaskAssignment" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL UNIQUE REFERENCES "Task"("id"),
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "assignedAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE TABLE "Message" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"("id"),
  "senderType" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE TABLE "Submission" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"("id"),
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "note" TEXT,
  "proofFiles" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE TABLE "Escrow" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL UNIQUE REFERENCES "Task"("id"),
  "amount" DOUBLE PRECISION NOT NULL,
  "status" "EscrowStatus" NOT NULL DEFAULT 'CREATED',
  "fundedAt" TIMESTAMP,
  "releasedAt" TIMESTAMP
);
CREATE TABLE "Payout" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "taskId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "readAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
