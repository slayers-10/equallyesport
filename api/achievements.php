<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

if ($_SERVER['REQUEST_METHOD']==='GET') {
    $rows = db()->query('SELECT id,name,game,year,icon FROM achievements ORDER BY year DESC,sort_order ASC')->fetchAll();
    ok($rows); exit;
}

if ($_SERVER['REQUEST_METHOD']==='POST') {
    require_permission('achievements');
    $b    = clean(body());
    $id   = $b['id']   ?? '';
    $name = $b['name'] ?? '';
    $game = $b['game'] ?? '';
    $year = $b['year'] ?? date('Y');
    $icon = $b['icon'] ?? '🏆';

    if (!$name||!$game||!$year){err('Champs requis.');exit;}

    if ($id) {
        db()->prepare('UPDATE achievements SET name=?,game=?,year=?,icon=? WHERE id=?')->execute([$name,$game,$year,$icon,$id]);
    } else {
        $id = gen_id();
        db()->prepare('INSERT INTO achievements (id,name,game,year,icon) VALUES (?,?,?,?,?)')->execute([$id,$name,$game,$year,$icon]);
    }
    ok(['id'=>$id]); exit;
}

if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    require_permission('achievements');
    $id = clean($_GET['id']??'');
    if (!$id){err('ID requis.');exit;}
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM achievements WHERE id=?'); $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row) move_to_trash('achievements', $id, $row['name'] ?? '', $row);
    $pdo->prepare('DELETE FROM achievements WHERE id=?')->execute([$id]);
    ok(['deleted'=>$id]); exit;
}

err('Méthode non supportée.',405);
