/*
  Warnings:

  - A unique constraint covering the columns `[employee_id,phase_id]` on the table `registrations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('TOTEM', 'WEB');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "control_employees" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "web_bg_url" TEXT;

-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "employee_id" TEXT,
ADD COLUMN     "source" "RegistrationSource" NOT NULL DEFAULT 'TOTEM',
ALTER COLUMN "factura" DROP NOT NULL,
ALTER COLUMN "participant_id" DROP NOT NULL,
ALTER COLUMN "totem_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "factura" TEXT,
    "campaign_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_campaign_id_code_key" ON "employees"("campaign_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_employee_id_phase_id_key" ON "registrations"("employee_id", "phase_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
