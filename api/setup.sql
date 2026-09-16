-- ══════════════════════════════════════════════════
-- Equally Esport — Base de données complète
-- Coller dans phpMyAdmin → onglet SQL → Exécuter
-- ══════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── Équipes ──
CREATE TABLE IF NOT EXISTS `teams` (
  `id`          VARCHAR(20)  NOT NULL,
  `game`        VARCHAR(50)  NOT NULL,
  `team_name`   VARCHAR(80)  NOT NULL,
  `game_icon`   VARCHAR(10)  DEFAULT 'EQ',
  `game_color`  VARCHAR(7)   DEFAULT '#E5000A',
  `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Joueurs (liés aux équipes) ──
CREATE TABLE IF NOT EXISTS `players` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `team_id`     VARCHAR(20)  NOT NULL,
  `pseudo`      VARCHAR(40)  NOT NULL,
  `role`        VARCHAR(40)  DEFAULT '',
  `sort_order`  INT          DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Résultats ──
CREATE TABLE IF NOT EXISTS `results` (
  `id`          VARCHAR(20)  NOT NULL,
  `game`        VARCHAR(50)  NOT NULL,
  `opponent`    VARCHAR(60)  NOT NULL,
  `score_us`    TINYINT      DEFAULT 0,
  `score_them`  TINYINT      DEFAULT 0,
  `tournament`  VARCHAR(100) DEFAULT '',
  `match_date`  DATE         DEFAULT NULL,
  `result`      ENUM('win','loss') NOT NULL DEFAULT 'win',
  `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Actualités ──
CREATE TABLE IF NOT EXISTS `news` (
  `id`           VARCHAR(20)  NOT NULL,
  `title`        VARCHAR(150) NOT NULL,
  `category`     VARCHAR(40)  DEFAULT '',
  `summary`      TEXT,
  `image`        VARCHAR(255) DEFAULT NULL,
  `published_at` DATE         DEFAULT NULL,
  `created_at`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Palmarès ──
CREATE TABLE IF NOT EXISTS `achievements` (
  `id`         VARCHAR(20)  NOT NULL,
  `name`       VARCHAR(100) NOT NULL,
  `game`       VARCHAR(50)  DEFAULT '',
  `year`       CHAR(4)      DEFAULT '',
  `icon`       VARCHAR(10)  DEFAULT '🏆',
  `sort_order` INT          DEFAULT 0,
  `created_at` TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Partenaires ──
CREATE TABLE IF NOT EXISTS `partners` (
  `id`         VARCHAR(20)  NOT NULL,
  `name`       VARCHAR(60)  NOT NULL,
  `initials`   VARCHAR(5)   DEFAULT '',
  `logo_url`   VARCHAR(255) DEFAULT '',
  `tier`       ENUM('gold','silver','bronze') DEFAULT 'bronze',
  `url`        VARCHAR(255) DEFAULT '',
  `sort_order` INT          DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Sessions admin ──
CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `id`          INT       NOT NULL AUTO_INCREMENT,
  `token_hash`  CHAR(64)  NOT NULL,
  `expires_at`  INT       NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tentatives de login (rate limiting) ──
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id`           INT       NOT NULL AUTO_INCREMENT,
  `ip_hash`      CHAR(64)  NOT NULL,
  `attempted_at` INT       NOT NULL,
  `success`      TINYINT   DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `ip_time` (`ip_hash`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ══════════════════════════════════════════════════
-- Données de démonstration (optionnel)
-- ══════════════════════════════════════════════════

INSERT IGNORE INTO `teams` (id, game, team_name, game_icon, game_color) VALUES
('val01', 'Valorant',         'Equally Red Force',  'VAL', '#FF4655'),
('lol01', 'League of Legends','Equally Rift Squad', 'LOL', '#C89B3C'),
('cs201', 'CS2',              'Equally Strike',     'CS2', '#F0A500'),
('rl01',  'Rocket League',    'Equally Boost',      'RL',  '#00B4D8');

INSERT IGNORE INTO `players` (team_id, pseudo, role, sort_order) VALUES
('val01','R3dShadow','IGL',0),('val01','Phantom_X','Duelist',1),('val01','NightViper','Sentinel',2),('val01','FlashKing','Initiator',3),('val01','W4llhack','Controller',4),
('lol01','TopGod','Top',0),('lol01','JungleR4ge','Jungle',1),('lol01','MidKiller','Mid',2),('lol01','Bot_Carry','ADC',3),('lol01','IronShield','Support',4),
('cs201','HeadHunter','AWPer',0),('cs201','Flashbang_K','Entry Fragger',1),('cs201','SmokeArtist','Support',2),('cs201','LurkMaster','Lurker',3),('cs201','IGL_Zero','IGL',4),
('rl01','AerialKing','Attaquant',0),('rl01','BoostStealer','Milieu',1),('rl01','GoalKeeper99','Défenseur',2);

INSERT IGNORE INTO `results` (id, game, opponent, score_us, score_them, tournament, match_date, result) VALUES
('r001','Valorant','Storm Esport',13,7,'VCT Challengers France','2025-06-10','win'),
('r002','CS2','Dark Matter',16,12,'Open Series S2','2025-06-08','win'),
('r003','League of Legends','Nova Gaming',1,2,'LFL Division 2','2025-06-05','loss'),
('r004','Rocket League','Turbo FC',4,2,'RLCS Open Qualifier','2025-06-03','win'),
('r005','Valorant','Phoenix Rising',13,9,'VCT Challengers France','2025-05-28','win'),
('r006','CS2','IronWolves',14,16,'ESL Open Cup','2025-05-25','loss');

INSERT IGNORE INTO `news` (id, title, category, summary, published_at) VALUES
('n001','Equally remporte l\'Open Series S2 sur CS2','Victoire','Notre équipe CS2 a dominé la finale face à Dark Matter avec un score de 16-12.','2025-06-08'),
('n002','Nouveau joueur : HeadHunter rejoint l\'équipe CS2','Transfert','Equally Esport est fier d\'accueillir HeadHunter, AWPer de talent, dans ses rangs.','2025-06-01'),
('n003','Equally qualifiée pour les VCT Challengers France','Qualification','Notre équipe Valorant décroche sa place pour les VCT Challengers France.','2025-05-28');

INSERT IGNORE INTO `achievements` (id, name, game, year, icon, sort_order) VALUES
('a001','Open Series S2','CS2','2025','🏆',0),
('a002','VCT Challengers Phase 1','Valorant','2025','🥇',1),
('a003','RLCS Open Qualifier','Rocket League','2024','🏆',2),
('a004','LFL Division 2 Printemps','League of Legends','2024','🥇',3);

INSERT IGNORE INTO `partners` (id, name, initials, tier, url, sort_order) VALUES
('p001','GearUp','GU','gold','https://gearup.gg',0),
('p002','NightOwl Energy','NO','gold','#',1),
('p003','ProSeat','PS','silver','#',0),
('p004','StreamCore','SC','silver','#',1),
('p005','LowPing Host','LP','bronze','#',0);

-- ── MIGRATION : à exécuter UNE FOIS si ta base existe déjà
-- (CREATE TABLE IF NOT EXISTS ne modifie pas une table déjà créée)
-- ALTER TABLE `partners` ADD COLUMN `logo_url` VARCHAR(255) DEFAULT '' AFTER `initials`;

