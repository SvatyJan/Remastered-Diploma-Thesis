ALTER TABLE character_spellbook_loadout  ADD COLUMN slot_index INT NOT NULL DEFAULT 0 AFTER slot_code, DROP PRIMARY KEY,  ADD PRIMARY KEY (character_id, slot_code, slot_index);
