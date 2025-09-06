-- CreateTable
CREATE TABLE `ancestry` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `description` VARCHAR(191) NULL,

    UNIQUE INDEX `ancestry_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(32) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `user_username_key`(`username`),
    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NULL,
    `ancestry_id` BIGINT NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `xp` BIGINT NOT NULL DEFAULT 0,
    `is_npc` BOOLEAN NOT NULL DEFAULT false,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `image_id` BIGINT NULL,

    INDEX `idx_character_user`(`user_id`),
    INDEX `idx_character_ancestry`(`ancestry_id`),
    UNIQUE INDEX `uq_character_user_name`(`user_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `relationship` (
    `a_id` BIGINT NOT NULL,
    `b_id` BIGINT NOT NULL,
    `status` ENUM('friend', 'blocked') NOT NULL DEFAULT 'friend',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`a_id`, `b_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monster` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `ancestry_id` BIGINT NOT NULL,
    `rarity` ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
    `description` VARCHAR(191) NULL,
    `image_id` BIGINT NULL,

    UNIQUE INDEX `monster_name_key`(`name`),
    INDEX `idx_monster_ancestry`(`ancestry_id`),
    INDEX `idx_monster_rarity`(`rarity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quest` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(128) NOT NULL,
    `description` VARCHAR(191) NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quest_monster` (
    `quest_id` BIGINT NOT NULL,
    `monster_id` BIGINT NOT NULL,
    `amount` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`quest_id`, `monster_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attribute` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `image_id` BIGINT NULL,

    UNIQUE INDEX `attribute_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `slot_type` (
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(64) NOT NULL,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_template` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(128) NOT NULL,
    `is_consumable` BOOLEAN NOT NULL DEFAULT false,
    `is_equipable` BOOLEAN NOT NULL DEFAULT false,
    `slot_code` VARCHAR(32) NULL,
    `rarity` ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
    `value_gold` INTEGER NOT NULL DEFAULT 0,
    `description` VARCHAR(191) NULL,
    `image_id` BIGINT NULL,

    INDEX `idx_itemtemplate_slot`(`slot_code`),
    INDEX `idx_itemtemplate_rarity`(`rarity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_template_attribute` (
    `item_template_id` BIGINT NOT NULL,
    `attribute_id` BIGINT NOT NULL,
    `value` INTEGER NOT NULL,

    PRIMARY KEY (`item_template_id`, `attribute_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_inventory` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `template_id` BIGINT NOT NULL,
    `owner_character_id` BIGINT NOT NULL,
    `amount` INTEGER NOT NULL DEFAULT 1,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_inv_owner`(`owner_character_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_equipment` (
    `character_id` BIGINT NOT NULL,
    `slot_code` VARCHAR(32) NOT NULL,
    `character_inventory_id` BIGINT NOT NULL,

    UNIQUE INDEX `character_equipment_character_inventory_id_key`(`character_inventory_id`),
    PRIMARY KEY (`character_id`, `slot_code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spell` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(128) NOT NULL,
    `description` VARCHAR(191) NULL,
    `cooldown` INTEGER NOT NULL DEFAULT 0,
    `image_id` BIGINT NULL,

    UNIQUE INDEX `spell_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spell_slot_type` (
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `max_per_character` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_spellbook` (
    `character_id` BIGINT NOT NULL,
    `spell_id` BIGINT NOT NULL,
    `spell_level` INTEGER NOT NULL DEFAULT 1,
    `learned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`character_id`, `spell_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_spellbook_loadout` (
    `character_id` BIGINT NOT NULL,
    `slot_code` VARCHAR(32) NOT NULL,
    `spell_id` BIGINT NOT NULL,

    PRIMARY KEY (`character_id`, `slot_code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `image` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(512) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_image_path`(`path`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guild` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `description` VARCHAR(191) NULL,
    `max_members` INTEGER NOT NULL DEFAULT 50,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `guild_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guild_member` (
    `guildId` BIGINT NOT NULL,
    `characterId` BIGINT NOT NULL,
    `role` ENUM('member', 'officer', 'leader') NOT NULL DEFAULT 'member',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_guild_member_character`(`characterId`),
    PRIMARY KEY (`guildId`, `characterId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guild_invite` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `guild_id` BIGINT NOT NULL,
    `inviter_id` BIGINT NOT NULL,
    `invitee_id` BIGINT NOT NULL,
    `status` ENUM('pending', 'accepted', 'declined', 'expired') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,

    UNIQUE INDEX `uq_guild_invite_unique`(`guild_id`, `invitee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profession` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `description` VARCHAR(191) NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `profession_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_profession` (
    `character_id` BIGINT NOT NULL,
    `profession_id` BIGINT NOT NULL,
    `skill` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`character_id`, `profession_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NULL,
    `leader_id` BIGINT NOT NULL,
    `max_members` INTEGER NOT NULL DEFAULT 5,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_member` (
    `party_id` BIGINT NOT NULL,
    `character_id` BIGINT NOT NULL,
    `role` ENUM('leader', 'member') NOT NULL DEFAULT 'member',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_party_member_character`(`character_id`),
    PRIMARY KEY (`party_id`, `character_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_invite` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `party_id` BIGINT NOT NULL,
    `inviter_id` BIGINT NOT NULL,
    `invitee_id` BIGINT NOT NULL,
    `status` ENUM('pending', 'accepted', 'declined', 'expired') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,

    UNIQUE INDEX `uq_party_invite_unique`(`party_id`, `invitee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `effect` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `description` VARCHAR(191) NULL,
    `stacking` ENUM('stack', 'refresh', 'ignore') NOT NULL DEFAULT 'stack',
    `max_stacks` INTEGER NOT NULL DEFAULT 99,
    `effect_type` ENUM('none', 'magic', 'physical', 'curse', 'poison', 'bleed') NOT NULL DEFAULT 'none',
    `default_duration_rounds` INTEGER NULL,
    `data_json` JSON NULL,

    UNIQUE INDEX `effect_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `combat` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `status` ENUM('pending', 'active', 'finished', 'aborted') NOT NULL DEFAULT 'pending',
    `board_width` INTEGER NOT NULL DEFAULT 8,
    `board_height` INTEGER NOT NULL DEFAULT 8,
    `current_round` INTEGER NOT NULL DEFAULT 1,
    `current_turn_index` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `endedAt` DATETIME(3) NULL,
    `origin_type` ENUM('pvp', 'pve', 'duel', 'custom') NOT NULL DEFAULT 'custom',
    `origin_meta` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `combat_team` (
    `combatId` BIGINT NOT NULL,
    `team` INTEGER NOT NULL,

    PRIMARY KEY (`combatId`, `team`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `combat_participant` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `combat_id` BIGINT NOT NULL,
    `team` INTEGER NOT NULL,
    `entity_id` BIGINT NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `is_ai` BOOLEAN NOT NULL DEFAULT false,
    `tile_x` INTEGER NOT NULL,
    `tile_y` INTEGER NOT NULL,
    `hp_current` INTEGER NOT NULL,
    `initiative` INTEGER NOT NULL DEFAULT 0,
    `snapshot_json` JSON NOT NULL,

    INDEX `idx_cp_combat`(`combat_id`),
    INDEX `idx_cp_team`(`combat_id`, `team`),
    INDEX `idx_cp_entity`(`entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `combat_turn` (
    `combat_id` BIGINT NOT NULL,
    `participant_id` BIGINT NOT NULL,
    `round` INTEGER NOT NULL,
    `turn_index` INTEGER NOT NULL,
    `has_acted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_ct_participant`(`participant_id`),
    PRIMARY KEY (`combat_id`, `round`, `turn_index`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `combat_effect` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `combat_id` BIGINT NOT NULL,
    `participant_id` BIGINT NOT NULL,
    `source_participant_id` BIGINT NULL,
    `effect_id` BIGINT NOT NULL,
    `stacks` INTEGER NOT NULL DEFAULT 1,
    `expires_round` INTEGER NULL,
    `expiresAt` DATETIME(3) NULL,
    `data_json` JSON NULL,

    INDEX `idx_ce_combat`(`combat_id`),
    INDEX `idx_ce_target`(`participant_id`),
    INDEX `idx_ce_code`(`combat_id`, `effect_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `combat_event` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `combat_id` BIGINT NOT NULL,
    `seq_no` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actor_participant_id` BIGINT NULL,
    `target_participant_id` BIGINT NULL,
    `action_type` ENUM('move', 'attack', 'cast', 'use_item', 'wait', 'apply_effect', 'expire_effect', 'spawn', 'despawn', 'custom') NOT NULL,
    `from_x` INTEGER NULL,
    `from_y` INTEGER NULL,
    `to_x` INTEGER NULL,
    `to_y` INTEGER NULL,
    `damage` INTEGER NULL,
    `healing` INTEGER NULL,
    `payload_json` JSON NULL,

    INDEX `idx_event_actor`(`combat_id`, `actor_participant_id`),
    INDEX `idx_event_target`(`combat_id`, `target_participant_id`),
    INDEX `idx_event_type`(`combat_id`, `action_type`),
    UNIQUE INDEX `uq_event_seq`(`combat_id`, `seq_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `combat_result` (
    `combat_id` BIGINT NOT NULL,
    `winningTeam` INTEGER NULL,
    `summary_json` JSON NULL,

    PRIMARY KEY (`combat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
