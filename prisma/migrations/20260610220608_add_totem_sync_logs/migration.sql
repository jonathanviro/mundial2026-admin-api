-- CreateTable
CREATE TABLE "totem_sync_logs" (
    "id" SERIAL NOT NULL,
    "totem_id" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "details" TEXT,
    "registros" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "totem_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "totem_sync_logs_totem_id_created_at_idx" ON "totem_sync_logs"("totem_id", "created_at");

-- AddForeignKey
ALTER TABLE "totem_sync_logs" ADD CONSTRAINT "totem_sync_logs_totem_id_fkey" FOREIGN KEY ("totem_id") REFERENCES "totems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
