/*
  Warnings:

  - You are about to drop the column `password_hash` on the `employees` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "employees" DROP COLUMN "password_hash",
ADD COLUMN     "password" TEXT;
