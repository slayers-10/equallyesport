<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

if ($_SERVER['REQUEST_METHOD']==='GET') {
    $rows = db()->query("SELECT id,name,initials,logo_url,tier,url FROM partners ORDER BY FIELD(tier,'gold','silver','bronze'),sort_order ASC")->fetchAll();
    ok($rows); exit;
}

if ($_SERVER['REQUEST_METHOD']==='POST') {
    require_permission('partners');
    $b        = clean(body());
    $id       = $b['id']       ?? '';
    $name     = $b['name']     ?? '';
    $initials = $b['initials'] ?? strtoupper(substr($name,0,2));
    $logo_url = $b['logo_url'] ?? '';
    $tier     = in_array($b['tier']??'',['gold','silver','bronze']) ? $b['tier'] : 'bronze';
    $url      = $b['url']      ?? '';

    if (!$name){err('Nom requis.');exit;}

    if ($id) {
        db()->prepare('UPDATE partners SET name=?,initials=?,logo_url=?,tier=?,url=? WHERE id=?')->execute([$name,$initials,$logo_url,$tier,$url,$id]);
    } else {
        $id = gen_id();
        db()->prepare('INSERT INTO partners (id,name,initials,logo_url,tier,url) VALUES (?,?,?,?,?,?)')->execute([$id,$name,$initials,$logo_url,$tier,$url]);
    }
    ok(['id'=>$id]); exit;
}

if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    require_permission('partners');
    $id = clean($_GET['id']??'');
    if (!$id){err('ID requis.');exit;}
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM partners WHERE id=?'); $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row) move_to_trash('partners', $id, $row['name'] ?? '', $row);
    $pdo->prepare('DELETE FROM partners WHERE id=?')->execute([$id]);
    ok(['deleted'=>$id]); exit;
}

err('Méthode non supportée.',405);
