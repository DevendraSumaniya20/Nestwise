-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(32) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `passwordHash` VARCHAR(200) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(32) NOT NULL,
    `userId` VARCHAR(32) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordReset` (
    `id` VARCHAR(32) NOT NULL,
    `userId` VARCHAR(32) NOT NULL,
    `codeHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PasswordReset_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Flat` (
    `id` VARCHAR(32) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `joinCode` CHAR(8) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Flat_joinCode_key`(`joinCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Member` (
    `id` VARCHAR(32) NOT NULL,
    `flatId` VARCHAR(32) NOT NULL,
    `userId` VARCHAR(32) NULL,
    `name` VARCHAR(80) NOT NULL,
    `role` VARCHAR(16) NOT NULL DEFAULT 'member',
    `moveIn` DATE NOT NULL,
    `moveOut` DATE NULL,

    UNIQUE INDEX `Member_flatId_userId_key`(`flatId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` VARCHAR(32) NOT NULL,
    `flatId` VARCHAR(32) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `category` VARCHAR(24) NOT NULL,
    `amountPaise` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `billId` VARCHAR(32) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Expense_flatId_date_idx`(`flatId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpenseShare` (
    `expenseId` VARCHAR(32) NOT NULL,
    `memberId` VARCHAR(32) NOT NULL,
    `paidPaise` INTEGER NOT NULL DEFAULT 0,
    `owedPaise` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`expenseId`, `memberId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bill` (
    `id` VARCHAR(32) NOT NULL,
    `flatId` VARCHAR(32) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `category` VARCHAR(24) NOT NULL,
    `amountPaise` INTEGER NOT NULL,
    `dueDate` DATE NOT NULL,
    `periodStart` DATE NOT NULL,
    `periodEnd` DATE NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'pending',

    INDEX `Bill_flatId_status_idx`(`flatId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Meal` (
    `id` VARCHAR(32) NOT NULL,
    `flatId` VARCHAR(32) NOT NULL,
    `date` DATE NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `ingredients` JSON NOT NULL,
    `listed` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Meal_flatId_date_key`(`flatId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroceryItem` (
    `id` VARCHAR(32) NOT NULL,
    `flatId` VARCHAR(32) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `qty` DOUBLE NOT NULL,
    `unit` VARCHAR(16) NOT NULL,
    `neededBy` DATE NOT NULL,
    `forMeals` JSON NOT NULL,
    `assigneeId` VARCHAR(32) NULL,
    `bought` BOOLEAN NOT NULL DEFAULT false,

    INDEX `GroceryItem_flatId_idx`(`flatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Task` (
    `id` VARCHAR(32) NOT NULL,
    `flatId` VARCHAR(32) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `assigneeId` VARCHAR(32) NOT NULL,
    `due` DATE NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'pending',

    INDEX `Task_flatId_idx`(`flatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordReset` ADD CONSTRAINT `PasswordReset_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Member` ADD CONSTRAINT `Member_flatId_fkey` FOREIGN KEY (`flatId`) REFERENCES `Flat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Member` ADD CONSTRAINT `Member_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_flatId_fkey` FOREIGN KEY (`flatId`) REFERENCES `Flat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseShare` ADD CONSTRAINT `ExpenseShare_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseShare` ADD CONSTRAINT `ExpenseShare_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `Member`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bill` ADD CONSTRAINT `Bill_flatId_fkey` FOREIGN KEY (`flatId`) REFERENCES `Flat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Meal` ADD CONSTRAINT `Meal_flatId_fkey` FOREIGN KEY (`flatId`) REFERENCES `Flat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroceryItem` ADD CONSTRAINT `GroceryItem_flatId_fkey` FOREIGN KEY (`flatId`) REFERENCES `Flat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_flatId_fkey` FOREIGN KEY (`flatId`) REFERENCES `Flat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
