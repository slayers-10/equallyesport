<?php
/**
 * maintenance.php — Inclure en haut de chaque page PHP publique
 * Ou utiliser via .htaccess RewriteRule
 */
require_once __DIR__.'/config.php';

// Ne pas bloquer l'admin
$uri = $_SERVER['REQUEST_URI'] ?? '';
if (strpos($uri, 'admin') !== false || strpos($uri, 'api/') !== false) return;

if (is_maintenance()) {
    http_response_code(503);
    header('Retry-After: 3600');
    ?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Maintenance — Equally Esport</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#050505;color:#fff;font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
    .wrap{max-width:500px;padding:3rem 2rem}
    .icon{font-size:4rem;margin-bottom:1.5rem}
    h1{font-size:2.5rem;font-weight:900;font-style:italic;text-transform:uppercase;color:#e5000a;margin-bottom:.75rem;letter-spacing:-.02em}
    p{color:#666;line-height:1.6;margin-bottom:2rem}
    .logo{font-size:1.1rem;font-weight:700;color:#fff;letter-spacing:.05em;text-transform:uppercase}
    .logo span{color:#e5000a}
    .border{width:60px;height:3px;background:#e5000a;margin:1.5rem auto}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="icon">🔧</div>
    <div class="logo">EQUALLY <span>ESPORT</span></div>
    <div class="border"></div>
    <h1>Maintenance</h1>
    <p>Notre site est momentanément en maintenance.<br>Nous revenons très bientôt !</p>
    <p style="font-size:.8rem;color:#333">Retrouvez-nous sur Discord en attendant.</p>
  </div>
</body>
</html>
<?php
    exit;
}
