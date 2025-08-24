-- Uživatel app dostane práva tvořit/mazat DB (kvůli shadow DB)
GRANT CREATE, DROP ON *.* TO 'app'@'%';

-- Plná práva na shadow DB + na hlavní DB
GRANT ALL PRIVILEGES ON `rpg`.* TO 'app'@'%';
GRANT ALL PRIVILEGES ON `rpg_shadow`.* TO 'app'@'%';

FLUSH PRIVILEGES;
