<?php
/**
 * api/newsletter-send.php — Envoie une actualité aux abonnés newsletter (admin uniquement)
 */
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
if ($_SERVER['REQUEST_METHOD']!=='POST'){err('POST requis.',405);exit;}

require_permission('newsletter');
$pdo = db();

try {
    $b     = body();
    $newsId = clean($b['news_id'] ?? '');
    if (!$newsId) { err('ID de l\'actualité requis.'); exit; }

    $stmt = $pdo->prepare('SELECT title, summary, image_url FROM news WHERE id=?');
    $stmt->execute([$newsId]);
    $news = $stmt->fetch();
    if (!$news) { err('Actualité introuvable.'); exit; }

    $subs = $pdo->query('SELECT email FROM newsletter_subscribers')->fetchAll();
    if (!count($subs)) { err('Aucun abonné à la newsletter pour le moment.'); exit; }

    $emails = array_column($subs, 'email');
    $link   = 'https://equallyesport.fr/pages/actualites.html';
    $siteUrl = 'https://equallyesport.fr';
    $logoUrl = $siteUrl.'/assets/logo/logo.png';
    $imgUrl  = !empty($news['image_url']) ? $siteUrl.'/'.ltrim($news['image_url'], '/') : '';

    $title   = htmlspecialchars($news['title'], ENT_QUOTES, 'UTF-8');
    $summary = nl2br(htmlspecialchars($news['summary'], ENT_QUOTES, 'UTF-8'));

    $subject = "=?UTF-8?B?".base64_encode("[Equally Esport] {$news['title']}")."?=";

    /* ── Version texte (fallback) ── */
    $textBody  = "EQUALLY ESPORT — NOUVELLE ACTUALITÉ\n";
    $textBody .= str_repeat("=", 50)."\n\n";
    $textBody .= $news['title']."\n\n";
    $textBody .= $news['summary']."\n\n";
    $textBody .= str_repeat("-", 50)."\n";
    $textBody .= "Lire l'actualité complète : {$link}\n\n";
    $textBody .= "Tu reçois cet e-mail car tu es inscrit(e) à la newsletter Equally Esport.\n";
    $textBody .= "Pour te désinscrire, contacte-nous à pro@equallyesport.fr.\n";

    /* ── Version HTML (email stylé, inline CSS obligatoire pour la compatibilité) ── */
    $imgBlock = $imgUrl ? "
        <tr><td style=\"padding:0\">
            <img src=\"{$imgUrl}\" alt=\"\" width=\"600\" style=\"display:block;width:100%;max-width:600px;height:auto;\" />
        </td></tr>" : '';

    $htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#111111;border:1px solid #262626;border-radius:10px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background-color:#e5000a;padding:20px 32px;text-align:center;">
          <img src="{$logoUrl}" alt="Equally Esport" width="40" height="40" style="display:inline-block;vertical-align:middle;margin-right:10px;" />
          <span style="color:#ffffff;font-size:20px;font-weight:bold;font-style:italic;letter-spacing:1px;vertical-align:middle;">EQUALLY ESPORT</span>
        </td></tr>

        {$imgBlock}

        <!-- Content -->
        <tr><td style="padding:32px;">
          <p style="color:#e5000a;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px 0;">Nouvelle actualité</p>
          <h1 style="color:#ffffff;font-size:24px;font-weight:800;font-style:italic;margin:0 0 20px 0;line-height:1.3;">{$title}</h1>
          <p style="color:#b3b3b3;font-size:15px;line-height:1.7;margin:0 0 28px 0;">{$summary}</p>

          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="border-radius:6px;background-color:#e5000a;">
              <a href="{$link}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:bold;font-style:italic;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Lire l'actualité complète →</a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid #262626;">
          <p style="color:#666666;font-size:12px;line-height:1.6;margin:0;">
            Tu reçois cet e-mail car tu es inscrit(e) à la newsletter Equally Esport.<br>
            Pour te désinscrire, contacte-nous à <a href="mailto:pro@equallyesport.fr" style="color:#e5000a;text-decoration:none;">pro@equallyesport.fr</a>.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;

    /* ── Assemblage multipart/alternative (texte + HTML, un seul envoi groupé en BCC) ── */
    $boundary = md5(uniqid((string)time(), true));

    $headers_mail  = "From: Equally Esport <noreply@equallyesport.fr>\r\n";
    $headers_mail .= "Reply-To: pro@equallyesport.fr\r\n";
    $headers_mail .= "Bcc: " . implode(',', $emails) . "\r\n";
    $headers_mail .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    $headers_mail .= "MIME-Version: 1.0\r\n";
    $headers_mail .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";

    $mimeBody  = "--{$boundary}\r\n";
    $mimeBody .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $mimeBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $mimeBody .= $textBody."\r\n\r\n";
    $mimeBody .= "--{$boundary}\r\n";
    $mimeBody .= "Content-Type: text/html; charset=UTF-8\r\n";
    $mimeBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $mimeBody .= $htmlBody."\r\n\r\n";
    $mimeBody .= "--{$boundary}--";

    $sent = mail('noreply@equallyesport.fr', $subject, $mimeBody, $headers_mail);

    if (!$sent) { err('L\'envoi a échoué côté serveur mail.'); exit; }

    ok(['sent' => true, 'count' => count($emails)]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false, 'error'=>'Erreur serveur.']);
}
