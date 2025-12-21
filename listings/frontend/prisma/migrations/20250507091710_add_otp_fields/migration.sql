-- AlterTable
ALTER TABLE "buyer_agent_connections" ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpires" TIMESTAMP(3);
