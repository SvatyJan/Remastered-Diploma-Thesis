-- CreateTable
CREATE TABLE `character_attribute` (
    `character_id` BIGINT NOT NULL,
    `attribute_id` BIGINT NOT NULL,
    `value` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`character_id`, `attribute_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
