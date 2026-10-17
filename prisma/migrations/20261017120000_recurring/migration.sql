-- AlterTable
ALTER TABLE `Bill` ADD COLUMN `repeatMonthly` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Task` ADD COLUMN `repeatDays` INTEGER NULL;
