-- Add nullable slug columns first
ALTER TABLE `item_template` ADD COLUMN `slug` VARCHAR(191) NULL;
ALTER TABLE `spell` ADD COLUMN `slug` VARCHAR(191) NULL;

-- Backfill slug values from name (basic slugify: lower + replace spaces with '-')
UPDATE `item_template` SET `slug` = LOWER(REPLACE(`name`, ' ', '-')) WHERE `slug` IS NULL OR `slug` = '';
UPDATE `spell` SET `slug` = LOWER(REPLACE(`name`, ' ', '-')) WHERE `slug` IS NULL OR `slug` = '';

-- Enforce NOT NULL and add unique constraints
ALTER TABLE `item_template` MODIFY `slug` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `item_template_slug_key` ON `item_template`(`slug`);

ALTER TABLE `spell` MODIFY `slug` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `spell_slug_key` ON `spell`(`slug`);

