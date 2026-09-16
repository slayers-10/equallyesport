<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

// Créer la table si elle n'existe pas
db()->exec("CREATE TABLE IF NOT EXISTS `settings` (
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// GET — public ou admin
if ($_SERVER['REQUEST_METHOD']==='GET') {
    $keys = ['twitter','discord','twitch','youtube','instagram','discord_invite','discord_widget','maintenance','banner_enabled','banner_text','banner_color'];
    $result = [];
    $stmt = db()->prepare('SELECT `key`,`value` FROM settings WHERE `key`=?');
    foreach ($keys as $k) {
        $stmt->execute([$k]);
        $row = $stmt->fetch();
        $result[$k] = $row ? $row['value'] : '';
    }

    // Champ sensible (webhook Discord) : uniquement renvoyé si la requête est authentifiée
    $token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if ($token) {
        $chk = db()->prepare('SELECT id FROM admin_sessions WHERE token_hash=? AND expires_at>?');
        $chk->execute([hash('sha256',$token), time()]);
        if ($chk->fetch()) {
            $stmt->execute(['discord_webhook_url']);
            $row = $stmt->fetch();
            $result['discord_webhook_url'] = $row ? $row['value'] : '';
        }
    }

    ok($result); exit;
}

// POST — admin seulement
if ($_SERVER['REQUEST_METHOD']==='POST') {
    require_permission('settings');
    $b = body();
    $allowed = ['twitter','discord','twitch','youtube','instagram','discord_invite','discord_widget','maintenance','banner_enabled','banner_text','banner_color','discord_webhook_url'];
    $stmt = db()->prepare('INSERT INTO settings (`key`,`value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=?');
    foreach ($allowed as $k) {
        if (isset($b[$k])) {
            $val = $k === 'discord_webhook_url' ? trim($b[$k]) : clean($b[$k]);
            $stmt->execute([$k, $val, $val]);
        }
    }
    ok(['saved'=>true]); exit;
}
err('Méthode non supportée.',405);
