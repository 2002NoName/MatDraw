-- AlterTable: nazwa widoczna; istniejącym kontom przepisujemy imię i nazwisko.
ALTER TABLE `users` ADD COLUMN `displayName` VARCHAR(60) NOT NULL DEFAULT '';
UPDATE `users` SET `displayName` = LEFT(`name`, 60);
ALTER TABLE `users` ALTER COLUMN `displayName` DROP DEFAULT;
