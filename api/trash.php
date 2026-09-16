<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

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

// Tables autorisées pour la restauration (sécurité : jamais de nom de table venant du client)
const TRASH_TABLES = [
    'news'         => 'news',
    'achievements' => 'achievements',
    'partners'     => 'partners',
    'applications' => 'applications',
    'results'      => 'results',
    'staff'        => 'staff',
];

if ($_SERVER['REQUEST_METHOD']==='GET') {
    require_permission('manage_users');
    $rows = $pdo->query("SELECT id, resource, item_id, label, deleted_by,
                          DATE_FORMAT(deleted_at,'%d/%m/%Y %H:%i') AS date
                          FROM trash ORDER BY deleted_at DESC LIMIT 200")->fetchAll();
    ok($rows); exit;
}

if ($_SERVER['REQUEST_METHOD']==='POST') {
    require_permission('manage_users');
    $b  = body();
    $id = (int)($b['id'] ?? 0);
    if (!$id) { err('ID requis.'); exit; }

    $stmt = $pdo->prepare('SELECT * FROM trash WHERE id=?');
    $stmt->execute([$id]);
    $item = $stmt->fetch();
    if (!$item) { err('Élément introuvable dans la corbeille.'); exit; }

    $resource = $item['resource'];
    $data     = json_decode($item['data'], true);

    if ($resource === 'teams') {
        // Cas particulier : équipe + ses joueurs imbriqués
        $team    = $data['team']    ?? null;
        $players = $data['players'] ?? [];
        if (!$team) { err('Données corrompues.'); exit; }
        $cols = array_keys($team);
        $pdo->prepare('INSERT INTO teams (`'.implode('`,`',$cols).'`) VALUES ('.implode(',',array_fill(0,count($cols),'?')).')')
            ->execute(array_values($team));
        foreach ($players as $p) {
            $pcols = array_keys($p);
            $pdo->prepare('INSERT INTO players (`'.implode('`,`',$pcols).'`) VALUES ('.implode(',',array_fill(0,count($pcols),'?')).')')
                ->execute(array_values($p));
        }
    } else {
        if (!isset(TRASH_TABLES[$resource])) { err('Type de ressource inconnu.'); exit; }
        $table = TRASH_TABLES[$resource];
        $cols  = array_keys($data);
        try {
            $pdo->prepare('INSERT INTO `'.$table.'` (`'.implode('`,`',$cols).'`) VALUES ('.implode(',',array_fill(0,count($cols),'?')).')')
                ->execute(array_values($data));
        } catch (Exception $e) {
            err('Impossible de restaurer (l\'élément existe peut-être déjà).'); exit;
        }
    }

    $pdo->prepare('DELETE FROM trash WHERE id=?')->execute([$id]);
    ok(['restored'=>true]); exit;
}

if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    require_permission('manage_users');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { err('ID requis.'); exit; }
    $pdo->prepare('DELETE FROM trash WHERE id=?')->execute([$id]);
    ok(['deleted'=>$id]); exit;
}

err('Méthode non supportée.', 405);
