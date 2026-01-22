-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "daily_warmup_quota" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "warmup_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "warmup_max_daily" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "warmup_start_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "warmup_logs" (
    "id" SERIAL NOT NULL,
    "mailbox_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "day_number" INTEGER NOT NULL,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "replied_count" INTEGER NOT NULL DEFAULT 0,
    "daily_limit" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmup_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warmup_logs_mailbox_id_date_key" ON "warmup_logs"("mailbox_id", "date");

-- AddForeignKey
ALTER TABLE "warmup_logs" ADD CONSTRAINT "warmup_logs_mailbox_id_fkey" FOREIGN KEY ("mailbox_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
