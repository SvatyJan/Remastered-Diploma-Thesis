-- DropForeignKey
ALTER TABLE `spell` DROP FOREIGN KEY `k_spell_slot`;

-- DropForeignKey
ALTER TABLE `spell_effect` DROP FOREIGN KEY `fk_spell_effect_effect`;

-- DropForeignKey
ALTER TABLE `spell_effect` DROP FOREIGN KEY `fk_spell_effect_spell`;

-- DropIndex
DROP INDEX `k_spell_slot` ON `spell`;

-- DropIndex
DROP INDEX `fk_spell_effect_effect` ON `spell_effect`;
