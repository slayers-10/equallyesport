<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

$pdo = db();

if ($_SERVER['REQUEST_METHOD']==='GET') {
    require_permission('manage_users');
    $myToken = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    $myHash  = hash('sha256', $myToken);

    $rows = $pdo->query("SELECT id, token_hash, role, username, user_id, ip, user_agent,
                          DATE_FORMAT(created_at,'%d/%m/%Y %H:%i') AS created,
                          DATE_FORMAT(FROM_UNIXTIME(expires_at),'%d/%m/%Y %H:%i') AS expires
                          FROM admin_sessions WHERE expires_at > UNIX_TIMESTAMP()
                          ORDER BY created_at DESC")->fetchAll();

    foreach ($rows as &$r) {
        $r['is_current'] = ($r['token_hash'] === $myHash);
        unset($r['token_hash']); // jamais exposer le hash du token
    }
    $rows = attach_locations($rows);
    ok($rows); exit;
}

if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    require_permission('manage_users');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { err('ID requis.'); exit; }
    $pdo->prepare('DELETE FROM admin_sessions WHERE id=?')->execute([$id]);
    ok(['revoked'=>$id]); exit;
}

err('Méthode non supportée.', 405);
