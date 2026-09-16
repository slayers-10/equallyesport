<?php
// ════════════════════════════════════════
// REMPLIS CES VALEURS AVEC TES INFOS HOSTINGER
// ════════════════════════════════════════
define('DB_HOST',      'localhost');
define('DB_NAME', 'u732787368_equally_esport');
define('DB_USER', 'u732787368_equally_user');
define('DB_PASS', 'Gn0;M$4c+');
define('ADMIN_SECRET', 'Equally@2025!');

date_default_timezone_set('Europe/Paris');

// Connexion PDO
function db(): PDO {
    static $pdo;
    if ($pdo) return $pdo;
    $pdo = new PDO(
        'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]
    );
    // Aligner le fuseau horaire de MySQL sur celui de PHP (Europe/Paris),
    // pour que NOW()/CURRENT_TIMESTAMP et DATE_FORMAT() ne soient pas décalés de 1h ou 2h.
    // On calcule un décalage numérique (+02:00 en été, +01:00 en hiver) car les hébergements
    // mutualisés n'ont pas toujours la table mysql.time_zone chargée (SET time_zone='Europe/Paris' échouerait).
    try {
        $tz     = new DateTimeZone('Europe/Paris');
        $offset = $tz->getOffset(new DateTime('now', $tz)) / 3600;
        $offsetStr = sprintf('%+03d:00', $offset);
        $pdo->exec("SET time_zone = '$offsetStr'");
    } catch (Exception $e) { /* si ça échoue, on garde le fuseau par défaut du serveur MySQL */ }
    return $pdo;
}

// Headers JSON + sécurité
function headers(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    $origin = (isset($_SERVER['HTTPS'])?'https':'http').'://'.$_SERVER['HTTP_HOST'];
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Admin-Token');
}

// Vérifie le token de session en BDD et retourne les infos de session (id, role, username, user_id)
function require_auth(): array {
    $token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if (!$token) { err('Non autorisé.', 401); exit; }
    $pdo = db();
    try { $pdo->exec("ALTER TABLE admin_sessions ADD COLUMN role VARCHAR(20) DEFAULT 'admin'"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE admin_sessions ADD COLUMN username VARCHAR(50) DEFAULT ''"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE admin_sessions ADD COLUMN ip VARCHAR(100) DEFAULT ''"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE admin_sessions ADD COLUMN user_agent VARCHAR(300) DEFAULT ''"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE admin_sessions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE admin_sessions ADD COLUMN user_id INT DEFAULT NULL"); } catch (Exception $e) {}

    $stmt = $pdo->prepare('SELECT id, role, username, user_id FROM admin_sessions WHERE token_hash=? AND expires_at>?');
    $stmt->execute([hash('sha256',$token), time()]);
    $row = $stmt->fetch();
    if (!$row) { err('Session expirée.', 401); exit; }
    // Prolonge la session
    $pdo->prepare('UPDATE admin_sessions SET expires_at=? WHERE token_hash=?')
       ->execute([time()+1800, hash('sha256',$token)]);
    $row['role'] = $row['role'] ?: 'admin'; // repli : anciennes sessions sans rôle = admin (compatibilité)
    $GLOBALS['_session'] = $row;
    return $row;
}

// ── Système de rôles & permissions ──
const ROLE_PERMISSIONS = [
    'admin'   => ['*'], // accès total
    'manager' => ['news', 'teams', 'results', 'achievements', 'applications'],
];

function role_can(string $role, string $resource): bool {
    if ($role === 'admin') return true;
    $perms = ROLE_PERMISSIONS[$role] ?? [];
    return in_array('*', $perms, true) || in_array($resource, $perms, true);
}

// Vérifie l'authentification ET la permission sur une ressource donnée. Bloque avec 403 si refusé.
function require_permission(string $resource): array {
    $session = require_auth();
    $role = $session['role'] ?? 'admin';
    if (!role_can($role, $resource)) {
        err('Accès refusé : ton rôle ("'.$role.'") n\'a pas la permission d\'effectuer cette action.', 403); exit;
    }
    return $session;
}

// ── Corbeille (soft delete) ──
function move_to_trash(string $resource, string $itemId, string $label, array $data): void {
    try {
        $pdo = db();
        $pdo->exec("CREATE TABLE IF NOT EXISTS `trash` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `resource` VARCHAR(30) NOT NULL,
            `item_id` VARCHAR(64) NOT NULL,
            `label` VARCHAR(200) DEFAULT '',
            `data` LONGTEXT NOT NULL,
            `deleted_by` VARCHAR(50) DEFAULT '',
            `deleted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $deletedBy = $GLOBALS['_session']['username'] ?? '';
        $pdo->prepare('INSERT INTO trash (resource, item_id, label, data, deleted_by) VALUES (?,?,?,?,?)')
            ->execute([$resource, $itemId, $label, json_encode($data), $deletedBy]);
    } catch (Exception $e) { /* si la mise en corbeille échoue, on ne bloque jamais la suppression elle-même */ }
}

// Nettoyage XSS
function clean(mixed $v): mixed {
    if (is_string($v)) return htmlspecialchars(strip_tags(trim($v)), ENT_QUOTES, 'UTF-8');
    if (is_array($v))  return array_map('clean', $v);
    if (is_int($v))    return (int)$v;
    if (is_float($v))  return (float)$v;
    return $v;
}

function ok(mixed $data=null): void { echo json_encode(['ok'=>true,'data'=>$data]); }
function err(string $msg, int $code=400): void { http_response_code($code); echo json_encode(['ok'=>false,'error'=>$msg]); }
function gen_id(): string { return bin2hex(random_bytes(8)); }
function body(): array { return json_decode(file_get_contents('php://input'),true) ?? []; }

// Récupère la vraie IP du visiteur, même derrière un proxy/CDN (Cloudflare, LiteSpeed, etc.)
function client_ip(): string {
    $headers = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR'];
    foreach ($headers as $h) {
        if (!empty($_SERVER[$h])) {
            // X-Forwarded-For peut contenir une liste "client, proxy1, proxy2"
            $parts = explode(',', $_SERVER[$h]);
            $ip = trim($parts[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

// Envoie une notification vers un salon Discord via webhook (silencieux si non configuré ou en erreur)
function send_discord_notification(string $webhookUrl, string $title, array $fields, string $color = '15548997'): void {
    if (!$webhookUrl) return;
    try {
        $embed = [
            'title'     => $title,
            'color'     => (int)$color,
            'fields'    => array_map(fn($k, $v) => ['name' => $k, 'value' => $v ?: '—', 'inline' => strlen((string)$v) < 40], array_keys($fields), array_values($fields)),
            'timestamp' => date('c'),
        ];
        $payload = json_encode(['embeds' => [$embed]]);

        $ch = curl_init($webhookUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_exec($ch);
        curl_close($ch);
    } catch (Exception $e) { /* on ne bloque jamais le flux principal pour une notif ratée */ }
}

// Récupère une valeur stockée dans la table settings (retourne '' si absente)
function get_setting(string $key): string {
    try {
        db()->exec("CREATE TABLE IF NOT EXISTS `settings` (`key` VARCHAR(100) NOT NULL, `value` TEXT, `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (`key`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $stmt = db()->prepare('SELECT `value` FROM settings WHERE `key`=?');
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        return $row ? (string)$row['value'] : '';
    } catch (Exception $e) { return ''; }
}

// Résout une IP en "Ville, Pays" approximatif, avec cache local (évite de spammer l'API externe).
// Retourne '' pour les IP privées/locales ou en cas d'échec — ne bloque jamais l'appelant.
function get_ip_location(string $ip): string {
    if (!$ip || $ip === 'unknown' || $ip === '127.0.0.1' || $ip === '::1') return '';
    if (preg_match('/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)/', $ip)) return ''; // IP privées
    try {
        $pdo = db();
        $pdo->exec("CREATE TABLE IF NOT EXISTS `ip_geo_cache` (
            `ip` VARCHAR(100) PRIMARY KEY,
            `country` VARCHAR(100) DEFAULT '',
            `city` VARCHAR(100) DEFAULT '',
            `cached_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $stmt = $pdo->prepare('SELECT country, city FROM ip_geo_cache WHERE ip=?');
        $stmt->execute([$ip]);
        $cached = $stmt->fetch();
        if ($cached) {
            return trim(($cached['city'] ? $cached['city'].', ' : '').$cached['country']);
        }

        $ch = curl_init('https://api.ip2location.io/?ip='.urlencode($ip).'&format=json');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
        $res = curl_exec($ch);
        curl_close($ch);
        $data = json_decode($res, true);

        $country = $data['country_name'] ?? '';
        $city    = $data['city'] ?? ($data['city_name'] ?? '');
        if (isset($data['error'])) { $country = ''; $city = ''; }

        // On met en cache même les échecs (chaîne vide) pour ne pas re-taper l'API en boucle sur une IP qui échoue
        $pdo->prepare('INSERT INTO ip_geo_cache (ip, country, city) VALUES (?,?,?) ON DUPLICATE KEY UPDATE country=?, city=?')
            ->execute([$ip, $country, $city, $country, $city]);

        return trim(($city ? $city.', ' : '').$country);
    } catch (Exception $e) { return ''; }
}

// Résout un tableau de lignes ayant chacune une clé 'ip' en ajoutant 'location'.
// Ne résout qu'une fois par IP unique (évite les appels redondants).
function attach_locations(array $rows): array {
    $uniqueIps = array_unique(array_filter(array_column($rows, 'ip')));
    $locations = [];
    foreach ($uniqueIps as $ip) { $locations[$ip] = get_ip_location($ip); }
    foreach ($rows as &$r) { $r['location'] = $locations[$r['ip'] ?? ''] ?? ''; }
    return $rows;
}
