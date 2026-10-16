-- Old single-token sessions can't be converted; everyone signs in again.
DELETE FROM `Session`;
-- DropIndex
DROP INDEX `Session_tokenHash_key` ON `Session`;

-- AlterTable
ALTER TABLE `Session` DROP COLUMN `tokenHash`,
    ADD COLUMN `accessExpiresAt` DATETIME(3) NOT NULL,
    ADD COLUMN `accessHash` CHAR(64) NOT NULL,
    ADD COLUMN `prevRefreshHash` CHAR(64) NULL,
    ADD COLUMN `refreshHash` CHAR(64) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Session_accessHash_key` ON `Session`(`accessHash`);

-- CreateIndex
CREATE UNIQUE INDEX `Session_refreshHash_key` ON `Session`(`refreshHash`);

-- CreateIndex
CREATE INDEX `Session_prevRefreshHash_idx` ON `Session`(`prevRefreshHash`);

