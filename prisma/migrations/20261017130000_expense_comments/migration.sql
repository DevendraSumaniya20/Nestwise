-- CreateTable
CREATE TABLE `ExpenseComment` (
    `id` VARCHAR(32) NOT NULL,
    `expenseId` VARCHAR(32) NOT NULL,
    `memberId` VARCHAR(32) NOT NULL,
    `body` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExpenseComment_expenseId_createdAt_idx`(`expenseId`, `createdAt`),
    INDEX `ExpenseComment_memberId_fkey`(`memberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExpenseComment` ADD CONSTRAINT `ExpenseComment_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseComment` ADD CONSTRAINT `ExpenseComment_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `Member`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
