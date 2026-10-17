-- AlterTable
ALTER TABLE `Member` ADD COLUMN `depositPaise` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `PantryItem` (
    `id` VARCHAR(32) NOT NULL,
    `flatId` VARCHAR(32) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `qty` DOUBLE NOT NULL,
    `unit` VARCHAR(16) NOT NULL,
    `lowAt` DOUBLE NOT NULL,

    INDEX `PantryItem_flatId_idx`(`flatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(32) NOT NULL,
    `flatId` VARCHAR(32) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `ownerId` VARCHAR(32) NULL,
    `valuePaise` INTEGER NOT NULL DEFAULT 0,

    INDEX `InventoryItem_flatId_idx`(`flatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PantryItem` ADD CONSTRAINT `PantryItem_flatId_fkey` FOREIGN KEY (`flatId`) REFERENCES `Flat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_flatId_fkey` FOREIGN KEY (`flatId`) REFERENCES `Flat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
