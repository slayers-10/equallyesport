<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
if ($_SERVER['REQUEST_METHOD']!=='GET'){err('GET requis.',405);exit;}
require_permission('analytics');

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

// Stats rapides
$total24h    = (int)$pdo->query("SELECT COUNT(*) FROM site_visits WHERE visited_at > (NOW() - INTERVAL 24 HOUR)")->fetchColumn();
$uniqueIp24h = (int)$pdo->query("SELECT COUNT(DISTINCT ip) FROM site_visits WHERE visited_at > (NOW() - INTERVAL 24 HOUR)")->fetchColumn();
$totalAll    = (int)$pdo->query("SELECT COUNT(*) FROM site_visits")->fetchColumn();

// Évolution sur les 14 derniers jours (une entrée par jour, y compris les jours à 0 visite)
$dailyRaw = $pdo->query("SELECT DATE(visited_at) AS d, COUNT(*) AS c FROM site_visits
                          WHERE visited_at > (NOW() - INTERVAL 14 DAY)
                          GROUP BY DATE(visited_at) ORDER BY d ASC")->fetchAll();
$dailyMap = [];
foreach ($dailyRaw as $r) { $dailyMap[$r['d']] = (int)$r['c']; }
$daily = [];
for ($i = 13; $i >= 0; $i--) {
    $day = date('Y-m-d', strtotime("-$i days"));
    $daily[] = ['date' => date('d/m', strtotime($day)), 'count' => $dailyMap[$day] ?? 0];
}

// Pages les plus visitées (7 derniers jours)
$topPages = $pdo->query("SELECT page, COUNT(*) AS c FROM site_visits
                          WHERE visited_at > (NOW() - INTERVAL 7 DAY)
                          GROUP BY page ORDER BY c DESC LIMIT 10")->fetchAll();

$rows = $pdo->query("SELECT ip, user_agent, page, referrer, DATE_FORMAT(visited_at,'%d/%m/%Y %H:%i:%s') AS date
                      FROM site_visits ORDER BY visited_at DESC LIMIT 200")->fetchAll();
$rows = attach_locations($rows);

ok([
    'visits'   => $rows,
    'stats'    => ['last24h'=>$total24h, 'uniqueIp24h'=>$uniqueIp24h, 'total'=>$totalAll],
    'daily'    => $daily,
    'topPages' => $topPages,
]);
