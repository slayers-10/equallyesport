<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

if ($_SERVER['REQUEST_METHOD']==='GET') {
    $rows = db()->query("SELECT id,game,opponent,score_us AS scoreUs,score_them AS scoreThem,tournament,DATE_FORMAT(match_date,'%Y-%m-%d') AS date,result FROM results ORDER BY match_date DESC,created_at DESC")->fetchAll();
    ok($rows); exit;
}

if ($_SERVER['REQUEST_METHOD']==='POST') {
    require_permission('results');
    $b = clean(body());
    $id         = $b['id']         ?? '';
    $game       = $b['game']       ?? '';
    $opponent   = $b['opponent']   ?? '';
    $tournament = $b['tournament'] ?? '';
    $scoreUs    = (int)($b['scoreUs']   ?? 0);
    $scoreThem  = (int)($b['scoreThem'] ?? 0);
    $date       = $b['date']       ?? date('Y-m-d');
    $result     = in_array($b['result']??'',['win','loss']) ? $b['result'] : 'win';

    if (!$game||!$opponent||!$tournament){err('Champs requis.');exit;}

    if ($id) {
        db()->prepare('UPDATE results SET game=?,opponent=?,score_us=?,score_them=?,tournament=?,match_date=?,result=? WHERE id=?')->execute([$game,$opponent,$scoreUs,$scoreThem,$tournament,$date,$result,$id]);
    } else {
        $id = gen_id();
        db()->prepare('INSERT INTO results (id,game,opponent,score_us,score_them,tournament,match_date,result) VALUES (?,?,?,?,?,?,?,?)')->execute([$id,$game,$opponent,$scoreUs,$scoreThem,$tournament,$date,$result]);
    }
    ok(['id'=>$id]); exit;
}

if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    require_permission('results');
    $id = clean($_GET['id']??'');
    if (!$id){err('ID requis.');exit;}
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM results WHERE id=?'); $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row) move_to_trash('results', $id, ($row['opponent'] ?? '').' — '.($row['tournament'] ?? ''), $row);
    $pdo->prepare('DELETE FROM results WHERE id=?')->execute([$id]);
    ok(['deleted'=>$id]); exit;
}

err('Méthode non supportée.',405);
