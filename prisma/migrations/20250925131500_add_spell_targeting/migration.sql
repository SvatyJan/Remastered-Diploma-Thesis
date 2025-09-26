ALTER TABLE `spell`
  ADD COLUMN `cast_type` ENUM('point_click', 'area', 'self') NOT NULL DEFAULT 'point_click',
  ADD COLUMN `target` ENUM('enemy', 'ally', 'ground', 'self') NOT NULL DEFAULT 'enemy',
  ADD COLUMN `range` INT NOT NULL DEFAULT 1,
  ADD COLUMN `area_range` INT NOT NULL DEFAULT 0,
  ADD COLUMN `damage` INT NOT NULL DEFAULT 0,
  ADD COLUMN `mana_cost` INT NOT NULL DEFAULT 0;

CREATE TABLE `spell_effect` (
  `spell_id` BIGINT NOT NULL,
  `effect_id` BIGINT NOT NULL,
  `duration_rounds` INT NOT NULL DEFAULT 0,
  `magnitude` INT NOT NULL DEFAULT 0,
  `data_json` JSON NULL,
  PRIMARY KEY (`spell_id`, `effect_id`),
  CONSTRAINT `fk_spell_effect_spell`
    FOREIGN KEY (`spell_id`) REFERENCES `spell`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_spell_effect_effect`
    FOREIGN KEY (`effect_id`) REFERENCES `effect`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
