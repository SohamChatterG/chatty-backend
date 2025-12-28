/*
  Warnings:

  - A unique constraint covering the columns `[message_id,user_name]` on the table `message_reads` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_name` to the `message_reads` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "message_reads_message_id_user_id_key";

-- AlterTable
ALTER TABLE "message_reads" ADD COLUMN     "user_name" VARCHAR(191) NOT NULL,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "pinned_messages" ADD COLUMN     "pinned_by_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "message_reads_message_id_user_name_key" ON "message_reads"("message_id", "user_name");
