<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

if ($_SERVER['REQUEST_METHOD']==='GET') {
    $rows = db()->query("SELECT id,title,category,summary,image_url,DATE_FORMAT(published_at,'%Y-%m-%d') AS date FROM news ORDER BY published_at DESC,created_at DESC")->fetchAll();
    ok($rows); exit;
}

if ($_SERVER['REQUEST_METHOD']==='POST') {
    require_permission('news');
    $pdo = db();
    try { $pdo->exec("ALTER TABLE news ADD COLUMN image_url VARCHAR(255) DEFAULT '' AFTER summary"); } catch (Exception $e) { /* colonne déjà présente */ }

    $b        = body();
    $id       = clean($b['id']       ?? '');
    $title    = clean($b['title']    ?? '');
    $category = clean($b['category'] ?? '');
    $summary  = clean($b['summary']  ?? '');
    $date     = clean($b['date']     ?? date('Y-m-d'));
    $image    = trim($b['image_url'] ?? '');

    if (!$title||!$category||!$summary){err('Champs requis.');exit;}

    if ($id) {
        $pdo->prepare('UPDATE news SET title=?,category=?,summary=?,image_url=?,published_at=? WHERE id=?')->execute([$title,$category,$summary,$image,$date,$id]);
    } else {
        $id = gen_id();
        $pdo->prepare('INSERT INTO news (id,title,category,summary,image_url,published_at) VALUES (?,?,?,?,?,?)')->execute([$id,$title,$category,$summary,$image,$date]);
    }
    ok(['id'=>$id]); exit;
}

if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    require_permission('news');
    $id = clean($_GET['id']??'');
    if (!$id){err('ID requis.');exit;}
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM news WHERE id=?'); $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row) move_to_trash('news', $id, $row['title'] ?? '', $row);
    $pdo->prepare('DELETE FROM news WHERE id=?')->execute([$id]);
    ok(['deleted'=>$id]); exit;
}

err('Méthode non supportée.',405);
