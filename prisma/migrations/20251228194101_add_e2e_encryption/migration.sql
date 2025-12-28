-- AlterTable
ALTER TABLE "chat_groups" ADD COLUMN     "is_encrypted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "is_encrypted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "user_public_keys" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "public_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_public_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_encryption_keys" (
    "id" SERIAL NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "encrypted_key" TEXT NOT NULL,
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_encryption_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_public_keys_user_id_key" ON "user_public_keys"("user_id");

-- CreateIndex
CREATE INDEX "group_encryption_keys_group_id_idx" ON "group_encryption_keys"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_encryption_keys_group_id_user_id_key" ON "group_encryption_keys"("group_id", "user_id");

-- AddForeignKey
ALTER TABLE "group_encryption_keys" ADD CONSTRAINT "group_encryption_keys_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
