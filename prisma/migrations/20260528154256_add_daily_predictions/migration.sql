-- DropIndex
DROP INDEX "registrations_employee_id_phase_id_key";

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "date" TEXT;

-- AlterTable
ALTER TABLE "phases" ADD COLUMN     "daily_predictions" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "predictions" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "prediction_date" TEXT,
ADD COLUMN     "total_points" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "registrations_phase_id_prediction_date_idx" ON "registrations"("phase_id", "prediction_date");
