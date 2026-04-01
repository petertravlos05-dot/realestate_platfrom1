-- CreateTable
CREATE TABLE "ops_alert_states" (
    "key" TEXT NOT NULL,
    "lastStatus" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "lastValueJson" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_alert_states_pkey" PRIMARY KEY ("key")
);



