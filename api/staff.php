<?php
/**
 * api/staff.php — CRUD Staff (équipe dirigeante de l'association)
 * GET    → liste publique/admin (identique, pas de champ sensible)
 * POST   → créer/modifier (admin/manager)
 * DELETE → supprimer (admin/manager) — passe par la corbeille
 */
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

$pdo = db();
$pdo->exec("CREATE TABLE IF NOT EXISTS `staff` (
    `id` VARCHAR(64) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `role` VARCHAR(100) NOT NULL,
    `photo_url` VARCHAR(255) DEFAULT '',
    `twitter` VARCHAR(255) DEFAULT '',
    `birthdate` DATE DEFAULT NULL,
    `joined_date` DATE DEFAULT NULL,
    `bio` VARCHAR(400) DEFAULT '',
    `sort_order` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if ($_SERVER['REQUEST_METHOD']==='GET') {
    $rows = $pdo->query("SELECT id, name, role, photo_url, twitter, bio,
                          DATE_FORMAT(birthdate,'%Y-%m-%d') AS birthdate,
                          DATE_FORMAT(joined_date,'%Y-%m-%d') AS joined_date
                          FROM staff ORDER BY sort_order ASC, created_at ASC")->fetchAll();
    ok($rows); exit;
}

if ($_SERVER['REQUEST_METHOD']==='POST') {
    require_permission('teams');
    $b       = clean(body());
    $id      = $b['id']    ?? '';
    $name    = trim($b['name'] ?? '');
    $role    = trim($b['role'] ?? '');
    $photo   = $b['photo_url'] ?? '';
    $twitter = $b['twitter']   ?? '';
    $bio     = mb_substr(trim($b['bio'] ?? ''), 0, 400);
    $birthdate  = !empty($b['birthdate'])   ? $b['birthdate']   : null;
    $joinedDate = !empty($b['joined_date']) ? $b['joined_date'] : null;

    if (!$name) { err('Nom requis.'); exit; }
    if (!$role) { err('Rôle requis.'); exit; }

    if ($id) {
        $pdo->prepare('UPDATE staff SET name=?, role=?, photo_url=?, twitter=?, bio=?, birthdate=?, joined_date=? WHERE id=?')
            ->execute([$name, $role, $photo, $twitter, $bio, $birthdate, $joinedDate, $id]);
    } else {
        $id = gen_id();
        $maxOrder = (int)$pdo->query('SELECT COALESCE(MAX(sort_order),0) FROM staff')->fetchColumn();
        $pdo->prepare('INSERT INTO staff (id, name, role, photo_url, twitter, bio, birthdate, joined_date, sort_order) VALUES (?,?,?,?,?,?,?,?,?)')
            ->execute([$id, $name, $role, $photo, $twitter, $bio, $birthdate, $joinedDate, $maxOrder + 1]);
    }
    ok(['id' => $id]); exit;
}

if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    require_permission('teams');
    $id = clean($_GET['id'] ?? '');
    if (!$id) { err('ID requis.'); exit; }

    $stmt = $pdo->prepare('SELECT * FROM staff WHERE id=?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row) move_to_trash('staff', $id, $row['name'].' — '.$row['role'], $row);

    $pdo->prepare('DELETE FROM staff WHERE id=?')->execute([$id]);
    ok(['deleted' => $id]); exit;
}

err('Méthode non supportée.', 405);
