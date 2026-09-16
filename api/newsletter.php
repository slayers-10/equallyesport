<?php
/**
 * api/newsletter.php — Inscription newsletter (public) + gestion (admin)
 */
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

$pdo = db();
$pdo->exec("CREATE TABLE IF NOT EXISTS `newsletter_subscribers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(190) NOT NULL UNIQUE,
    `subscribed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// POST — inscription publique (pas d'auth requise)
if ($_SERVER['REQUEST_METHOD']==='POST') {
    $b     = body();
    $email = trim(strtolower(clean($b['email'] ?? '')));
    $hp    = $b['_hp'] ?? '';

    if (!empty($hp)) { sleep(1); ok(['subscribed'=>true]); exit; } // honeypot : fausse réponse au bot
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) { err('Adresse e-mail invalide.'); exit; }

    try {
        $pdo->prepare('INSERT INTO newsletter_subscribers (email) VALUES (?)')->execute([$email]);
    } catch (Exception $e) {
        // Déjà inscrit : on répond quand même succès pour ne pas révéler si un email existe déjà (confidentialité)
    }
    ok(['subscribed'=>true]); exit;
}

// GET — liste des inscrits (admin uniquement)
if ($_SERVER['REQUEST_METHOD']==='GET') {
    require_permission('newsletter');
    $rows = $pdo->query("SELECT id, email, DATE_FORMAT(subscribed_at,'%d/%m/%Y %H:%i') AS date FROM newsletter_subscribers ORDER BY subscribed_at DESC")->fetchAll();
    ok($rows); exit;
}

// DELETE — désinscrire un contact (admin)
if ($_SERVER['REQUEST_METHOD']==='DELETE') {
    require_permission('newsletter');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { err('ID requis.'); exit; }
    $pdo->prepare('DELETE FROM newsletter_subscribers WHERE id=?')->execute([$id]);
    ok(['deleted'=>$id]); exit;
}

err('Méthode non supportée.', 405);
