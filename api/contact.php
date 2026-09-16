<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
if ($_SERVER['REQUEST_METHOD']!=='POST'){err('POST requis.',405);exit;}

try {
    $b = body();

    /* Honeypot */
    if (!empty($b['_hp']) || !empty($b['website'])) { sleep(2); ok(['sent'=>true]); exit; }

    /* Rate limiting : 5 messages / 10 min */
    $ip  = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $pdo = db();
    $pdo->prepare('DELETE FROM login_attempts WHERE attempted_at < ?')->execute([time()-600]);
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip_hash=? AND attempted_at>? AND success=3');
    $stmt->execute([$ip, time()-600]);
    if ((int)$stmt->fetchColumn() >= 5) { err('Trop de messages. Réessayez dans 10 minutes.', 429); exit; }

    /* Token CSRF */
    $token = trim($b['token'] ?? '');
    if (!$token || abs(time() - (int)base64_decode($token)) > 1800) { err('Session invalide, rechargez la page.', 403); exit; }

    /* Validation */
    $name    = trim($b['name']    ?? '');
    $email   = trim($b['email']   ?? '');
    $subject = trim($b['subject'] ?? '');
    $message = trim($b['message'] ?? '');

    if (!$name)                        { err('Nom requis.'); exit; }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { err('Email invalide.'); exit; }
    if (!$subject)                     { err('Sujet requis.'); exit; }
    if (strlen($message) < 20)        { err('Message trop court.'); exit; }
    if (strlen($message) > 2000)      { err('Message trop long.'); exit; }

    $name    = htmlspecialchars($name,    ENT_QUOTES, 'UTF-8');
    $email   = htmlspecialchars($email,   ENT_QUOTES, 'UTF-8');
    $subject = htmlspecialchars($subject, ENT_QUOTES, 'UTF-8');
    $message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

    /* Envoi */
    $to      = 'pro@equallyesport.fr';
    $subj    = "=?UTF-8?B?".base64_encode("[Contact] {$subject} — {$name}")."?=";
    $body    = "NOUVEAU MESSAGE — EQUALLY ESPORT\n" . str_repeat("=",50) . "\n\n";
    $body   .= "Nom     : {$name}\n";
    $body   .= "Email   : {$email}\n";
    $body   .= "Sujet   : {$subject}\n";
    $body   .= "\n--- MESSAGE ---\n\n{$message}\n\n";
    $body   .= str_repeat("-",50) . "\n";
    $body   .= "IP      : " . ($_SERVER['REMOTE_ADDR'] ?? '?') . "\n";
    $body   .= "Date    : " . date('d/m/Y H:i:s') . "\n";

    $headers  = "From: noreply@equallyesport.fr\r\n";
    $headers .= "Reply-To: {$email}\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    $sent = mail($to, $subj, $body, $headers);

    $pdo->prepare('INSERT INTO login_attempts (ip_hash,attempted_at,success) VALUES (?,?,3)')->execute([$ip, time()]);

    if ($sent) {
        ok(['sent'=>true]);
    } else {
        err('Erreur envoi. Écrivez-nous directement à pro@equallyesport.fr', 500);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Erreur serveur.']);
}
