-- Agent Memory System
-- Gives every autonomous agent persistent memory and inter-agent messaging

CREATE TABLE "AgentMemory" (
    "id"         TEXT NOT NULL,
    "agentId"    TEXT NOT NULL,
    "agentName"  TEXT NOT NULL,
    "agentIcon"  TEXT NOT NULL DEFAULT '🤖',
    "agentColor" TEXT NOT NULL DEFAULT '#5E5CE6',
    "type"       TEXT NOT NULL,
    "content"    TEXT NOT NULL,
    "metadata"   JSONB,
    "runId"      TEXT,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentConversation" (
    "id"          TEXT NOT NULL,
    "fromAgentId" TEXT NOT NULL,
    "fromName"    TEXT NOT NULL,
    "fromIcon"    TEXT NOT NULL DEFAULT '🤖',
    "fromColor"   TEXT NOT NULL DEFAULT '#5E5CE6',
    "toAgentId"   TEXT NOT NULL,
    "toName"      TEXT NOT NULL DEFAULT 'All Agents',
    "message"     TEXT NOT NULL,
    "msgType"     TEXT NOT NULL DEFAULT 'update',
    "resolved"    BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy"  TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentConversation_pkey" PRIMARY KEY ("id")
);

-- Indexes for fast lookups
CREATE INDEX "AgentMemory_agentId_idx"    ON "AgentMemory"("agentId");
CREATE INDEX "AgentMemory_createdAt_idx"  ON "AgentMemory"("createdAt");
CREATE INDEX "AgentMemory_importance_idx" ON "AgentMemory"("importance");

CREATE INDEX "AgentConversation_toAgentId_idx"   ON "AgentConversation"("toAgentId");
CREATE INDEX "AgentConversation_fromAgentId_idx" ON "AgentConversation"("fromAgentId");
CREATE INDEX "AgentConversation_createdAt_idx"   ON "AgentConversation"("createdAt");
