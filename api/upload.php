<?php
require_once __DIR__.'/config.php';
headers();
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

if ($_SERVER['REQUEST_METHOD']!=='POST') { err('Méthode non supportée.',405); exit; }

// Le contexte détermine la permission requise : uploader une image d'actu nécessite la permission "news",
// un logo de partenaire nécessite la permission "partners" (réservée admin).
$context = $_POST['context'] ?? 'partners';
$permissionMap = ['news' => 'news', 'roster' => 'teams', 'partners' => 'partners'];
require_permission($permissionMap[$context] ?? 'partners');

if (empty($_FILES['file'])) { err('Aucun fichier reçu.'); exit; }

$file = $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) { err('Erreur lors de l\'upload.'); exit; }

// Limite : 2 Mo
if ($file['size'] > 2 * 1024 * 1024) { err('Fichier trop volumineux (2 Mo max).'); exit; }

// Vérification du type réel (pas juste l'extension)
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowed = [
    'image/png'  => 'png',
    'image/jpeg' => 'jpg',
    'image/webp' => 'webp',
    'image/svg+xml' => 'svg',
];

if (!isset($allowed[$mime])) { err('Format non supporté (PNG, JPG, WEBP ou SVG uniquement).'); exit; }
$ext = $allowed[$mime];

// Contexte d'upload (dossier + préfixe de fichier). Repli sur "partners" pour compatibilité avec l'existant.
$context = $_POST['context'] ?? 'partners';
$contexts = [
    'partners' => 'partners',
    'news'     => 'news',
    'roster'   => 'roster',
];
$folder = $contexts[$context] ?? 'partners';
$prefix = $folder === 'news' ? 'news_' : ($folder === 'roster' ? 'roster_' : 'partner_');

// Dossier de destination : /assets/uploads/{folder}/
$destDir = __DIR__.'/../assets/uploads/'.$folder;
if (!is_dir($destDir)) { mkdir($destDir, 0755, true); }

$filename = $prefix.gen_id().'.'.$ext;
$destPath = $destDir.'/'.$filename;

if (!move_uploaded_file($file['tmp_name'], $destPath)) { err('Impossible d\'enregistrer le fichier.'); exit; }

// URL publique relative (le front la stocke telle quelle en BDD)
ok(['url' => 'assets/uploads/'.$folder.'/'.$filename]);
