<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
if ($_SERVER['REQUEST_METHOD']!=='POST'){err('POST requis.',405);exit;}

try {
    $pdo = db();

    $pdo->exec("CREATE TABLE IF NOT EXISTS `site_visits` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `ip` VARCHAR(100) NOT NULL,
        `user_agent` VARCHAR(300) DEFAULT '',
        `page` VARCHAR(200) DEFAULT '',
        `referrer` VARCHAR(300) DEFAULT '',
        `visited_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (visited_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $b = body();
    $ip       = client_ip();
    $ua       = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 300);
    $page     = substr(clean($b['page'] ?? '/'), 0, 200);
    $referrer = substr(clean($b['referrer'] ?? ''), 0, 300);

    // Anti-spam basique : pas plus d'un enregistrement identique (même IP + page) toutes les 10 secondes
    $stmt = $pdo->prepare('SELECT id FROM site_visits WHERE ip=? AND page=? AND visited_at > (NOW() - INTERVAL 10 SECOND) LIMIT 1');
    $stmt->execute([$ip, $page]);
    if (!$stmt->fetch()) {
        $pdo->prepare('INSERT INTO site_visits (ip, user_agent, page, referrer) VALUES (?,?,?,?)')
            ->execute([$ip, $ua, $page, $referrer]);
    }

    ok(['tracked'=>true]);
} catch (Exception $e) {
    // On ne casse jamais la navigation du visiteur pour un souci de tracking
    ok(['tracked'=>false]);
}
