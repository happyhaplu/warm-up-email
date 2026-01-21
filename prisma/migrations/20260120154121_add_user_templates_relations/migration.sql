/*
  Warnings:

  - You are about to drop the column `appPassword` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `imapHost` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `imapPort` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `senderName` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `smtpHost` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `smtpPort` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `accounts` table. All the data in the column will be lost.
  - Added the required column `app_password` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imap_host` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imap_port` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `smtp_host` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `smtp_port` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "appPassword",
DROP COLUMN "createdAt",
DROP COLUMN "imapHost",
DROP COLUMN "imapPort",
DROP COLUMN "senderName",
DROP COLUMN "smtpHost",
DROP COLUMN "smtpPort",
DROP COLUMN "updatedAt",
ADD COLUMN     "app_password" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "imap_host" TEXT NOT NULL,
ADD COLUMN     "imap_port" INTEGER NOT NULL,
ADD COLUMN     "sender_name" TEXT,
ADD COLUMN     "smtp_host" TEXT NOT NULL,
ADD COLUMN     "smtp_port" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "logs" ADD COLUMN     "recipient_id" INTEGER,
ADD COLUMN     "sender_id" INTEGER;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "send_templates" (
    "id" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "send_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reply_templates" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reply_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
