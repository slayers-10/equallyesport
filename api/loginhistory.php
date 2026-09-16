<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
if ($_SERVER['REQUEST_METHOD']!=='GET'){err('GET requis.',405);exit;}
require_permission('analytics');

$pdo = db();
$pdo->exec("CREATE TABLE IF NOT EXISTS `login_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ip` VARCHAR(100) NOT NULL,
  `user_agent` VARCHAR(300) DEFAULT '',
  `success` TINYINT(1) DEFAULT 0,
  `attempted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
try { $pdo->exec("ALTER TABLE login_history ADD COLUMN username VARCHAR(50) DEFAULT '' AFTER ip"); } catch (Exception $e) { /* colonne déjà présente */ }

$rows = $pdo->query("SELECT ip, username, user_agent, success, DATE_FORMAT(attempted_at,'%d/%m/%Y %H:%i:%s') AS date FROM login_history ORDER BY attempted_at DESC LIMIT 50")->fetchAll();
$rows = attach_locations($rows);
ok($rows);
