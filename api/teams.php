<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

// Migration douce : s'assure que les nouvelles colonnes existent, quelle que soit la méthode appelée
$pdo = db();
try { $pdo->exec("ALTER TABLE players ADD COLUMN birthdate DATE DEFAULT NULL"); } catch (Exception $e) {}
try { $pdo->exec("ALTER TABLE players ADD COLUMN joined_date DATE DEFAULT NULL"); } catch (Exception $e) {}
try { $pdo->exec("ALTER TABLE players ADD COLUMN bio VARCHAR(400) DEFAULT ''"); } catch (Exception $e) {}
try { $pdo->exec("ALTER TABLE players ADD COLUMN photo_url VARCHAR(255) DEFAULT ''"); } catch (Exception $e) {}

if ($_SERVER['REQUEST_METHOD']==='GET') {
    $teams = $pdo->query('SELECT id, game, team_name AS teamName, game_icon AS gameIcon, game_color AS gameColor FROM teams ORDER BY created_at ASC')->fetchAll();
    foreach ($teams as &$t) {
        $s = $pdo->prepare("SELECT pseudo, role, country, twitter, twitch, youtube, age, numero, category, agent, bio, photo_url,
                             DATE_FORMAT(birthdate,'%Y-%m-%d') AS birthdate,
                             DATE_FORMAT(joined_date,'%Y-%m-%d') AS joined_date
                             FROM players WHERE team_id=? ORDER BY sort_order ASC");
        $s->execute([$t['id']]);
        $t['players'] = $s->fetchAll();
    }
    ok($teams); exit;
}

if ($_SERVER['REQUEST_METHOD']==='POST') {
    require_permission('teams');
    $b       = clean(body());
    $id      = $b['id']       ?? '';
    $game    = $b['game']     ?? '';
    $name    = $b['teamName'] ?? '';
    $icon    = $b['gameIcon'] ?? strtoupper(substr($game,0,3));
    $color   = $b['gameColor']?? '#E5000A';
    $players = body()['players'] ?? [];

    if (!$game||!$name){err('Jeu et nom requis.');exit;}

    if ($id) {
        $pdo->prepare('UPDATE teams SET game=?,team_name=?,game_icon=?,game_color=?,updated_at=NOW() WHERE id=?')->execute([$game,$name,$icon,$color,$id]);
        $pdo->prepare('DELETE FROM players WHERE team_id=?')->execute([$id]);
    } else {
        $id = gen_id();
        $pdo->prepare('INSERT INTO teams (id,game,team_name,game_icon,game_color) VALUES (?,?,?,?,?)')->execute([$id,$game,$name,$icon,$color]);
    }
    $s = $pdo->prepare('INSERT INTO players (team_id,pseudo,role,country,twitter,twitch,youtube,age,numero,category,agent,birthdate,joined_date,bio,photo_url,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    foreach ($players as $i=>$p) {
        $pseudo  = htmlspecialchars(strip_tags(trim($p['pseudo']  ??'')),ENT_QUOTES,'UTF-8');
        $role    = htmlspecialchars(strip_tags(trim($p['role']    ??'')),ENT_QUOTES,'UTF-8');
        $country = htmlspecialchars(strip_tags(trim($p['country'] ??'')),ENT_QUOTES,'UTF-8');
        $twitter = htmlspecialchars(strip_tags(trim($p['twitter'] ??'')),ENT_QUOTES,'UTF-8');
        $twitch  = htmlspecialchars(strip_tags(trim($p['twitch']  ??'')),ENT_QUOTES,'UTF-8');
        $youtube = htmlspecialchars(strip_tags(trim($p['youtube'] ??'')),ENT_QUOTES,'UTF-8');
        $category= htmlspecialchars(strip_tags(trim($p['category']??'player')),ENT_QUOTES,'UTF-8');
        $agent   = htmlspecialchars(strip_tags(trim($p['agent']   ??'')),ENT_QUOTES,'UTF-8');
        $age     = !empty($p['age'])    ? (int)$p['age']  : null;
        $numero  = !empty($p['numero']) ? (int)$p['numero'] : null;
        $bio        = mb_substr(htmlspecialchars(strip_tags(trim($p['bio']??'')),ENT_QUOTES,'UTF-8'), 0, 400);
        $birthdate  = !empty($p['birthdate'])   ? $p['birthdate']   : null;
        $joinedDate = !empty($p['joined_date']) ? $p['joined_date'] : null;
        $photoUrl   = trim($p['photo_url'] ?? '');
        if ($pseudo) $s->execute([$id,$pseudo,$role,$country,$twitter,$twitch,$youtube,$age,$numero,$category,$agent,$birthdate,$joinedDate,$bio,$photoUrl,$i]);
    }
    ok(['id'=>$id]); exit;
}

if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    require_permission('teams');
    $id = clean($_GET['id']??'');
    if (!$id){err('ID requis.');exit;}
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM teams WHERE id=?'); $stmt->execute([$id]);
    $team = $stmt->fetch();
    if ($team) {
        $ps = $pdo->prepare('SELECT * FROM players WHERE team_id=?'); $ps->execute([$id]);
        $players = $ps->fetchAll();
        move_to_trash('teams', $id, $team['team_name'] ?? '', ['team'=>$team, 'players'=>$players]);
    }
    $pdo->prepare('DELETE FROM players WHERE team_id=?')->execute([$id]);
    $pdo->prepare('DELETE FROM teams WHERE id=?')->execute([$id]);
    ok(['deleted'=>$id]); exit;
}

err('Méthode non supportée.',405);
