/*
  Warnings:

  - You are about to drop the column `app_password` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `imap_host` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `imap_port` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `sender_name` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `smtp_host` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `smtp_port` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `accounts` table. All the data in the column will be lost.
  - Added the required column `appPassword` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imapHost` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imapPort` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `smtpHost` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `smtpPort` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "app_password",
DROP COLUMN "created_at",
DROP COLUMN "imap_host",
DROP COLUMN "imap_port",
DROP COLUMN "sender_name",
DROP COLUMN "smtp_host",
DROP COLUMN "smtp_port",
DROP COLUMN "updated_at",
ADD COLUMN     "appPassword" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "imapHost" TEXT NOT NULL,
ADD COLUMN     "imapPort" INTEGER NOT NULL,
ADD COLUMN     "senderName" TEXT,
ADD COLUMN     "smtpHost" TEXT NOT NULL,
ADD COLUMN     "smtpPort" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
