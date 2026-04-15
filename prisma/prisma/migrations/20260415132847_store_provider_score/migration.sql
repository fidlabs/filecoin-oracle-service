-- CreateTable
CREATE TABLE "provider_score" (
    "id" UUID NOT NULL,
    "providerId" BIGINT NOT NULL,
    "calculatedScore" BIGINT NOT NULL,
    "retrievabilityBps" BIGINT NOT NULL,
    "bandwidthMbps" BIGINT NOT NULL,
    "latencyMs" BIGINT NOT NULL,
    "indexingPct" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_score_pkey" PRIMARY KEY ("id")
);
