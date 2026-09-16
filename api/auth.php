<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
if ($_SERVER['REQUEST_METHOD']!=='POST'){err('POST requis.',405);exit;}

try {
    $b        = body();
    $username = clean($b['username'] ?? '') ?: 'admin';
    $password = $b['password'] ?? '';
    $honeypot = $b['_hp']      ?? '';

    if ($honeypot !== '') { sleep(1); err('Non autorisé.',401); exit; }
    if (empty($password))  { err('Mot de passe requis.',400); exit; }

    $pdo = db();
    $now = time();
    $realIp = client_ip();
    $ua     = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 300);

    // S'assurer que les tables existent (+ migration douce pour la colonne username)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `login_history` (`id` INT AUTO_INCREMENT PRIMARY KEY, `ip` VARCHAR(100), `user_agent` VARCHAR(300), `success` TINYINT(1), `attempted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    try { $pdo->exec("ALTER TABLE login_history ADD COLUMN username VARCHAR(50) DEFAULT '' AFTER ip"); } catch (Exception $e) { /* colonne déjà présente */ }
    $pdo->exec("CREATE TABLE IF NOT EXISTS `admin_users` (`id` INT AUTO_INCREMENT PRIMARY KEY, `username` VARCHAR(32) NOT NULL UNIQUE, `password_hash` VARCHAR(255) NOT NULL, `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    try { $pdo->exec("ALTER TABLE admin_users ADD COLUMN role VARCHAR(20) DEFAULT 'manager'"); } catch (Exception $e) { /* colonne déjà présente */ }
    try { $pdo->exec("ALTER TABLE admin_sessions ADD COLUMN role VARCHAR(20) DEFAULT 'admin'"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE admin_sessions ADD COLUMN username VARCHAR(50) DEFAULT ''"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE admin_sessions ADD COLUMN ip VARCHAR(100) DEFAULT ''"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE admin_sessions ADD COLUMN user_agent VARCHAR(300) DEFAULT ''"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE admin_sessions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE admin_sessions ADD COLUMN user_id INT DEFAULT NULL"); } catch (Exception $e) {}

    // 1) Vérifier d'abord un compte individuel (username + password_hash)
    $valid  = false;
    $role   = 'admin';
    $userId = null;
    if ($username) {
        $stmt = $pdo->prepare('SELECT id, password_hash, role, username FROM admin_users WHERE username=?');
        $stmt->execute([$username]);
        $row = $stmt->fetch();
        if ($row && password_verify($password, $row['password_hash'])) {
            $valid    = true;
            $role     = $row['role'] ?: 'manager';
            $userId   = (int)$row['id'];
            $username = $row['username']; // normalise la casse/l'orthographe exacte du compte enregistré
        }
    }

    // 2) Repli : mot de passe maître (compatibilité, évite tout risque de blocage). Toujours admin, pas de compte réel.
    if (!$valid && hash_equals(ADMIN_SECRET, $password)) {
        $valid  = true;
        $role   = 'admin';
        $userId = null;
    }

    // Logger dans l'historique (visible en admin), succès ET échec
    try {
        $pdo->prepare('INSERT INTO login_history (ip, username, user_agent, success) VALUES (?,?,?,?)')->execute([$realIp, $username, $ua, $valid?1:0]);
    } catch(Exception $ex) {}

    if (!$valid) { err('Identifiants incorrects.', 401); exit; }

    // Créer session
    $token   = bin2hex(random_bytes(32));
    $expires = $now + 1800;

    $pdo->prepare('DELETE FROM admin_sessions WHERE expires_at < ?')->execute([$now]);
    $pdo->prepare('INSERT INTO admin_sessions (token_hash, expires_at, role, username, ip, user_agent, user_id) VALUES (?,?,?,?,?,?,?)')
        ->execute([hash('sha256',$token), $expires, $role, $username, $realIp, $ua, $userId]);

    echo json_encode(['ok'=>true, 'token'=>$token, 'expires'=>$expires, 'role'=>$role, 'username'=>$username, 'user_id'=>$userId]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false, 'error'=>'Erreur serveur: '.$e->getMessage()]);
}
