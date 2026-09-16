<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
if ($_SERVER['REQUEST_METHOD']!=='POST'){err('POST requis.',405);exit;}
require_permission('settings');

$b   = body();
$url = trim($b['url'] ?? '');
if (!$url) { err('URL du webhook requise.'); exit; }
if (!preg_match('#^https://discord(app)?\.com/api/webhooks/#', $url)) {
    err('Cette URL ne ressemble pas à un webhook Discord valide.'); exit;
}

send_discord_notification($url, '✅ Test de connexion Equally Esport', [
    'Statut'    => 'Ça fonctionne ! Ce salon recevra les nouvelles candidatures.',
    'Envoyé le' => date('d/m/Y à H:i'),
], '5763719');

ok(['sent'=>true]);
