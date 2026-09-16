<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

$pdo = db();
$pdo->exec("CREATE TABLE IF NOT EXISTS `admin_users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(32) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
try { $pdo->exec("ALTER TABLE admin_users ADD COLUMN role VARCHAR(20) DEFAULT 'manager'"); } catch (Exception $e) { /* colonne déjà présente */ }

const VALID_ROLES = ['admin', 'manager'];

if ($_SERVER['REQUEST_METHOD']==='GET') {
    // Voir la liste des comptes = action sensible, réservée aux admins
    require_permission('manage_users');
    $rows = $pdo->query("SELECT id, username, role, DATE_FORMAT(created_at,'%d/%m/%Y') AS created FROM admin_users ORDER BY created_at ASC")->fetchAll();
    ok($rows); exit;
}

if ($_SERVER['REQUEST_METHOD']==='POST') {
    $session = require_permission('manage_users');
    $b = body();

    // ── Changement de rôle sur un compte existant ──
    if (($b['action'] ?? '') === 'update_role') {
        $id   = (int)($b['id'] ?? 0);
        $role = clean($b['role'] ?? '');
        if (!$id)                              { err('ID requis.'); exit; }
        if (!in_array($role, VALID_ROLES, true)){ err('Rôle invalide.'); exit; }

        $stmt = $pdo->prepare('SELECT username FROM admin_users WHERE id=?');
        $stmt->execute([$id]);
        $target = $stmt->fetch();
        if (!$target) { err('Compte introuvable.'); exit; }

        // Sécurité : on ne peut pas changer son propre rôle (évite l'auto-verrouillage accidentel)
        if ($id === (int)($session['user_id'] ?? 0)) {
            err('Tu ne peux pas changer ton propre rôle. Demande à un autre administrateur.', 403); exit;
        }

        $pdo->prepare('UPDATE admin_users SET role=? WHERE id=?')->execute([$role, $id]);
        ok(['updated'=>true, 'role'=>$role]); exit;
    }

    // ── Création d'un nouveau compte ──
    $username = trim(clean($b['username'] ?? ''));
    $password = $b['password'] ?? '';
    $role     = clean($b['role'] ?? 'manager');
    if (!in_array($role, VALID_ROLES, true)) $role = 'manager';

    if (!$username || mb_strlen($username) < 3)  { err('Identifiant trop court (3 caractères min).'); exit; }
    if (mb_strlen($username) > 32)               { err('Identifiant trop long (32 caractères max).'); exit; }
    if (!preg_match('/^[a-zA-Z0-9_.\-]+$/', $username)) { err('Identifiant : lettres, chiffres, - _ . uniquement.'); exit; }
    if (strlen($password) < 10)                  { err('Mot de passe trop court (10 caractères min).'); exit; }

    $stmt = $pdo->prepare('SELECT id FROM admin_users WHERE username=?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) { err('Cet identifiant existe déjà.'); exit; }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $pdo->prepare('INSERT INTO admin_users (username, password_hash, role) VALUES (?,?,?)')->execute([$username, $hash, $role]);

    ok(['created'=>true]); exit;
}

if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    $session = require_permission('manage_users');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { err('ID requis.'); exit; }

    $stmt = $pdo->prepare('SELECT username FROM admin_users WHERE id=?');
    $stmt->execute([$id]);
    $target = $stmt->fetch();
    if ($target && $id === (int)($session['user_id'] ?? 0)) {
        err('Tu ne peux pas supprimer ton propre compte pendant que tu es connecté avec.', 403); exit;
    }

    $pdo->prepare('DELETE FROM admin_users WHERE id=?')->execute([$id]);
    ok(['deleted'=>$id]); exit;
}

err('Méthode non supportée.', 405);
