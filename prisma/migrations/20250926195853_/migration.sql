/*
  Warnings:

  - You are about to alter the column `skill` on the `character_profession` table. The data in that column could be lost. The data in that column will be cast from `Int` to `SmallInt`.
  - A unique constraint covering the columns `[character_id]` on the table `character_profession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `character_profession` MODIFY `skill` SMALLINT NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX `uq_character_profession_character` ON `character_profession`(`character_id`);
