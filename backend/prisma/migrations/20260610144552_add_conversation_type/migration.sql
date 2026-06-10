-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('COMMISSIONING', 'GENERAL');

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "type" "ConversationType" NOT NULL DEFAULT 'COMMISSIONING';
