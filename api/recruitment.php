<?php
/**
 * api/recruitment.php — Formulaire de recrutement
 * Anti-spam : honeypot + rate limiting + validation
 */
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
if ($_SERVER['REQUEST_METHOD']!=='POST'){err('POST requis.',405);exit;}

try {
    $b = body();

    /* ── Anti-bot honeypot ── */
    if (!empty($b['_hp']) || !empty($b['website'])) {
        sleep(2); ok(['sent'=>true]); exit; // Fausse réponse au bot
    }

    /* ── Rate limiting : 3 envois max par IP / 10 minutes ── */
    $ip  = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $pdo = db();
    $pdo->prepare('DELETE FROM login_attempts WHERE attempted_at < ?')->execute([time() - 600]);
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip_hash=? AND attempted_at > ? AND success=2');
    $stmt->execute([$ip, time() - 600]);
    if ((int)$stmt->fetchColumn() >= 3) {
        err('Trop de candidatures envoyées. Réessayez dans 10 minutes.', 429);
        exit;
    }

    /* ── Validation ── */
    $pseudo  = trim($b['pseudo']  ?? '');
    $game    = trim($b['game']    ?? '');
    $rank    = trim($b['rank']    ?? '');
    $message = trim($b['message'] ?? '');
    $profile = trim($b['profile'] ?? '');
    $token   = trim($b['token']   ?? '');

    // Vérification token CSRF simple (timestamp dans les 30 min)
    if (!$token || abs(time() - (int)base64_decode($token)) > 1800) {
        err('Session invalide, rechargez la page.', 403); exit;
    }

    if (!$pseudo)  { err('Pseudo requis.'); exit; }
    if (!$game)    { err('Jeu requis.'); exit; }
    if (!$rank)    { err('Rang requis.'); exit; }
    if (!$message) { err('Message requis.'); exit; }
    if (mb_strlen($pseudo)  > 50)  { err('Pseudo trop long.'); exit; }
    if (mb_strlen($rank)    > 100) { err('Rang trop long.'); exit; }
    if (mb_strlen($message) > 2000){ err('Message trop long (2000 max).'); exit; }

    // Sécuriser les inputs
    $pseudo  = htmlspecialchars($pseudo,  ENT_QUOTES, 'UTF-8');
    $game    = htmlspecialchars($game,    ENT_QUOTES, 'UTF-8');
    $rank    = htmlspecialchars($rank,    ENT_QUOTES, 'UTF-8');
    $message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    $profile = filter_var($profile, FILTER_SANITIZE_URL);

    /* ── Envoi email ── */
    $to      = 'pro@equallyesport.fr';
    $subject = "=?UTF-8?B?".base64_encode("[Recrutement] Candidature - {$pseudo} ({$game})")."?=";

    $body = "NOUVELLE CANDIDATURE EQUALLY ESPORT\n";
    $body .= str_repeat("=", 50) . "\n\n";
    $body .= "Pseudo       : {$pseudo}\n";
    $body .= "Jeu          : {$game}\n";
    $body .= "Rang / Niveau: {$rank}\n";
    if ($profile) $body .= "Profil       : {$profile}\n";
    $body .= "\n--- MESSAGE ---\n\n{$message}\n\n";
    $body .= str_repeat("-", 50) . "\n";
    $body .= "IP           : " . ($_SERVER['REMOTE_ADDR'] ?? 'inconnue') . "\n";
    $body .= "Date         : " . date('d/m/Y H:i:s') . "\n";

    $headers_mail  = "From: noreply@equallyesport.fr\r\n";
    $headers_mail .= "Reply-To: noreply@equallyesport.fr\r\n";
    $headers_mail .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    $headers_mail .= "Content-Type: text/plain; charset=UTF-8\r\n";

    /* ── Sauvegarder en BDD ── */
    $appId = gen_id();
    $pdo->prepare('INSERT INTO applications (id, pseudo, game, rank, message, profile, ip_hash) VALUES (?,?,?,?,?,?,?)')
        ->execute([$appId, $pseudo, $game, $rank, $message, $profile, $ip]);

    /* ── Envoyer mail ── */
    $sent = mail($to, $subject, $body, $headers_mail);

    /* ── Notification Discord ── */
    $webhookUrl = get_setting('discord_webhook_url');
    send_discord_notification($webhookUrl, '🎮 Nouvelle candidature reçue', [
        'Pseudo'        => $pseudo,
        'Jeu'           => $game,
        'Rang / Niveau' => $rank,
        'Profil'        => $profile ?: '—',
        'Message'       => mb_strlen($message) > 300 ? mb_substr($message, 0, 300).'…' : $message,
    ]);

    /* ── Logger ── */
    $pdo->prepare('INSERT INTO login_attempts (ip_hash, attempted_at, success) VALUES (?,?,2)')
        ->execute([$ip, time()]);

    ok(['sent' => true, 'message' => 'Candidature envoyée avec succès !']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Erreur serveur.']);
}
