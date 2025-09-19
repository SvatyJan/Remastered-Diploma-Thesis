ALTER TABLE spell ADD COLUMN slot_code VARCHAR(32) NOT NULL DEFAULT 'spell';

INSERT INTO spell_slot_type (code, name, max_per_character)
VALUES
  ('spell', 'Spell', 3),
  ('passive', 'Passive', 1),
  ('ultimate', 'Ultimate', 1)
ON DUPLICATE KEY UPDATE 
name = VALUES(name), max_per_character = VALUES(max_per_character);

UPDATE spell SET slot_code = 'spell' WHERE slot_code IS NULL OR slot_code = '';

ALTER TABLE spell
  ADD CONSTRAINT k_spell_slot FOREIGN KEY (slot_code) REFERENCES spell_slot_type(code) ON DELETE RESTRICT ON UPDATE CASCADE;
