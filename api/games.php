<?php
/**
 * api/games.php — CRUD Jeux
 * GET    ?admin=1 → tous les jeux (admin)
 * GET              → jeux actifs uniquement (public)
 * POST   → créer/modifier (admin)
 * DELETE → supprimer (admin)
 */
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

if ($_SERVER['REQUEST_METHOD']==='GET') {
    $isAdmin = isset($_GET['admin']) && $_GET['admin'] === '1';
    if ($isAdmin) {
        $rows = db()->query('SELECT id, name, icon, color, active FROM games ORDER BY name ASC')->fetchAll();
    } else {
        $rows = db()->query('SELECT id, name, icon, color, active FROM games WHERE active=1 ORDER BY name ASC')->fetchAll();
    }
    // Convertir active en booléen
    foreach ($rows as &$r) $r['active'] = (bool)$r['active'];
    ok($rows); exit;
}

if ($_SERVER['REQUEST_METHOD']==='POST') {
    require_permission('teams');
    $b      = clean(body());
    $id     = $b['id']     ?? '';
    $name   = $b['name']   ?? '';
    $icon   = $b['icon']   ?? strtoupper(substr($name,0,3));
    $color  = $b['color']  ?? '#E5000A';
    $active = isset($b['active']) ? ($b['active'] ? 1 : 0) : 1;

    if (!$name) { err('Nom du jeu requis.'); exit; }

    if ($id) {
        // Modifier
        db()->prepare('UPDATE games SET name=?,icon=?,color=?,active=? WHERE id=?')->execute([$name,$icon,$color,$active,$id]);
        ok(['id'=>$id]); exit;
    }

    // Vérifier doublon
    $stmt = db()->prepare('SELECT id FROM games WHERE name=?');
    $stmt->execute([$name]);
    if ($stmt->fetch()) { err('Ce jeu existe déjà.', 409); exit; }

    $id = gen_id();
    db()->prepare('INSERT INTO games (id, name, icon, color, active) VALUES (?,?,?,?,?)')->execute([$id,$name,$icon,$color,$active]);
    ok(['id'=>$id, 'name'=>$name, 'icon'=>$icon, 'color'=>$color, 'active'=>true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    require_permission('teams');
    $id = clean($_GET['id'] ?? '');
    if (!$id) { err('ID requis.'); exit; }
    db()->prepare('DELETE FROM games WHERE id=?')->execute([$id]);
    ok(['deleted'=>$id]);
    exit;
}

err('Méthode non supportée.', 405);
