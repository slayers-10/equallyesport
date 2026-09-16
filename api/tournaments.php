<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

if ($_SERVER['REQUEST_METHOD']==='GET') {
    $admin = isset($_GET['admin']) && $_GET['admin']==='1';
    if ($admin) {
        require_auth();
        $rows = db()->query("SELECT id, name, game, DATE_FORMAT(date,'%Y-%m-%dT%H:%i:%s') AS date, location FROM tournaments ORDER BY date DESC")->fetchAll();
    } else {
        $rows = db()->query("SELECT id, name, game, DATE_FORMAT(date,'%Y-%m-%dT%H:%i:%s') AS date, location FROM tournaments WHERE date > NOW() ORDER BY date ASC")->fetchAll();
    }
    ok($rows); exit;
}

if ($_SERVER['REQUEST_METHOD']==='POST') {
    require_auth();
    $b = clean(body());
    $id       = $b['id']       ?? '';
    $name     = $b['name']     ?? '';
    $game     = $b['game']     ?? '';
    $date     = $b['date']     ?? '';
    $location = $b['location'] ?? 'En ligne';
    if (!$name||!$date){err('Nom et date requis.');exit;}
    if ($id) {
        db()->prepare('UPDATE tournaments SET name=?,game=?,date=?,location=? WHERE id=?')->execute([$name,$game,$date,$location,$id]);
    } else {
        $id=gen_id();
        db()->prepare('INSERT INTO tournaments (id,name,game,date,location) VALUES (?,?,?,?,?)')->execute([$id,$name,$game,$date,$location]);
    }
    ok(['id'=>$id]); exit;
}

if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    require_auth();
    $id=clean($_GET['id']??''); if(!$id){err('ID requis.');exit;}
    db()->prepare('DELETE FROM tournaments WHERE id=?')->execute([$id]);
    ok(['deleted'=>$id]); exit;
}
err('Méthode non supportée.',405);
