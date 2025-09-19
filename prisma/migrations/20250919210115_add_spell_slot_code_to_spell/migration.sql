-- DropForeignKey
ALTER TABLE `spell` DROP FOREIGN KEY `k_spell_slot`;

-- DropIndex
DROP INDEX `k_spell_slot` ON `spell`;
