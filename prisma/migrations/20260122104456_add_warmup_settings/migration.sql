-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "warmup_increase_by" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "warmup_reply_rate" INTEGER NOT NULL DEFAULT 35,
ADD COLUMN     "warmup_start_count" INTEGER NOT NULL DEFAULT 3;
