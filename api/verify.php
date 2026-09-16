<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
$token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
if (!$token){err('Token manquant.',401);exit;}
$stmt = db()->prepare('SELECT expires_at FROM admin_sessions WHERE token_hash=? AND expires_at>?');
$stmt->execute([hash('sha256',$token), time()]);
$row = $stmt->fetch();
if (!$row){err('Session invalide.',401);exit;}
db()->prepare('UPDATE admin_sessions SET expires_at=? WHERE token_hash=?')->execute([time()+1800, hash('sha256',$token)]);
ok(['expires'=>time()+1800]);
