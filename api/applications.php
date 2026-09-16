<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

// GET — liste des candidatures (admin)
if ($_SERVER['REQUEST_METHOD']==='GET') {
    require_auth();
    $status = $_GET['status'] ?? 'all';
    if ($status === 'all') {
        $rows = db()->query("SELECT id, pseudo, game, rank, message, profile, status, DATE_FORMAT(created_at,'%Y-%m-%d %H:%i') AS date FROM applications ORDER BY created_at DESC")->fetchAll();
    } else {
        $stmt = db()->prepare("SELECT id, pseudo, game, rank, message, profile, status, DATE_FORMAT(created_at,'%Y-%m-%d %H:%i') AS date FROM applications WHERE status=? ORDER BY created_at DESC");
        $stmt->execute([$status]);
        $rows = $stmt->fetchAll();
    }
    ok($rows); exit;
}

// POST — changer le statut (admin)
if ($_SERVER['REQUEST_METHOD']==='POST') {
    require_permission('applications');
    $b      = body();
    $id     = clean($b['id']     ?? '');
    $status = clean($b['status'] ?? '');
    if (!$id || !in_array($status, ['pending','accepted','refused'])) {
        err('ID et statut requis.'); exit;
    }
    db()->prepare('UPDATE applications SET status=? WHERE id=?')->execute([$status, $id]);
    ok(['id'=>$id, 'status'=>$status]); exit;
}

// DELETE — supprimer une candidature (admin)
if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    require_permission('applications');
    $id = clean($_GET['id'] ?? '');
    if (!$id) { err('ID requis.'); exit; }
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM applications WHERE id=?'); $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row) move_to_trash('applications', $id, $row['pseudo'] ?? '', $row);
    $pdo->prepare('DELETE FROM applications WHERE id=?')->execute([$id]);
    ok(['deleted'=>$id]); exit;
}

err('Méthode non supportée.', 405);
