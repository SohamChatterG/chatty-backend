-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "file_type" VARCHAR(50),
ADD COLUMN     "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "parent_message_id" UUID;

-- AlterTable
ALTER TABLE "group_users" ALTER COLUMN "user_id" DROP NOT NULL,
ALTER COLUMN "user_id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "message_reactions" (
    "id" SERIAL NOT NULL,
    "message_id" UUID NOT NULL,
    "user_name" VARCHAR(191) NOT NULL,
    "user_id" INTEGER,
    "emoji" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_message_id_user_name_emoji_key" ON "message_reactions"("message_id", "user_name", "emoji");

-- CreateIndex
CREATE INDEX "chats_group_id_parent_message_id_idx" ON "chats"("group_id", "parent_message_id");

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
