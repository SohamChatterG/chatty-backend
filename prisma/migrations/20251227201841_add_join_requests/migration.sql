-- CreateTable
CREATE TABLE "join_requests" (
    "id" SERIAL NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" INTEGER,
    "name" VARCHAR(191) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "join_requests_group_id_status_idx" ON "join_requests"("group_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "join_requests_group_id_user_id_key" ON "join_requests"("group_id", "user_id");

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
