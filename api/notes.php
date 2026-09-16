<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
require_auth();

// Créer la table si besoin
db()->exec("CREATE TABLE IF NOT EXISTS `admin_notes` (
  `id` VARCHAR(20) NOT NULL,
  `title` VARCHAR(200) DEFAULT '',
  `content` TEXT,
  `color` VARCHAR(20) DEFAULT '#1a1a2e',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

// GET — liste toutes les notes
if ($_SERVER['REQUEST_METHOD']==='GET') {
    $rows = db()->query("SELECT id, title, content, color, DATE_FORMAT(updated_at,'%d/%m/%Y %H:%i') AS date FROM admin_notes ORDER BY updated_at DESC")->fetchAll();
    ok($rows); exit;
}

// POST — créer ou mettre à jour
if ($_SERVER['REQUEST_METHOD']==='POST') {
    $b = body();
    $id      = clean($b['id']      ?? '');
    $title   = clean($b['title']   ?? '');
    $content = trim($b['content']  ?? '');
    $color   = clean($b['color']   ?? '#1a1a2e');

    if (!$id) $id = gen_id();

    db()->prepare("INSERT INTO admin_notes (id, title, content, color) VALUES (?,?,?,?)
        ON DUPLICATE KEY UPDATE title=?, content=?, color=?, updated_at=NOW()")
        ->execute([$id, $title, $content, $color, $title, $content, $color]);

    ok(['id'=>$id]); exit;
}

// DELETE
if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    $id = clean($_GET['id'] ?? '');
    if (!$id) { err('ID requis.'); exit; }
    db()->prepare('DELETE FROM admin_notes WHERE id=?')->execute([$id]);
    ok(['deleted'=>$id]); exit;
}

err('Méthode non supportée.', 405);
