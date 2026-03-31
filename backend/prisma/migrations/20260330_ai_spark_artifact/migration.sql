-- CreateTable
CREATE TABLE "AiSparkArtifact" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "spark" TEXT NOT NULL,
    "sparkRole" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSparkArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiSparkArtifact_taskId_requesterId_idx" ON "AiSparkArtifact"("taskId", "requesterId");

-- CreateIndex
CREATE INDEX "AiSparkArtifact_requesterId_createdAt_idx" ON "AiSparkArtifact"("requesterId", "createdAt");
