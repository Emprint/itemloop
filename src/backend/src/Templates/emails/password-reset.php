<?php
/**
 * Email template: password-reset
 * Variables: $resetUrl (string), $userName (string)
 * Locale: $locale ('en' | 'fr')
 */
$t = $locale === 'fr' ? [
    'title'   => 'Réinitialisez votre mot de passe',
    'hi'      => "Bonjour $userName,",
    'body'    => 'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.',
    'btn'     => 'Réinitialiser mon mot de passe',
    'expiry'  => 'Ce lien est valable <strong>1 heure</strong>.',
    'ignore'  => 'Si vous n\'avez pas demandé de réinitialisation, ignorez simplement cet email.',
    'footer'  => "$appName — Gestion d'inventaire communautaire",
] : [
    'title'   => 'Reset your password',
    'hi'      => "Hello $userName,",
    'body'    => 'We received a request to reset the password for your account. Click the button below to choose a new password.',
    'btn'     => 'Reset my password',
    'expiry'  => 'This link is valid for <strong>1 hour</strong>.',
    'ignore'  => 'If you did not request a password reset, you can safely ignore this email.',
    'footer'  => "$appName — Community Inventory Management",
];
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($locale) ?>">
<head><meta charset="UTF-8"><title><?= htmlspecialchars($t['title']) ?></title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr><td style="background:#111827;padding:24px 32px;">
          <span style="color:#fff;font-size:20px;font-weight:700;"><?= htmlspecialchars($appName) ?></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827;"><?= htmlspecialchars($t['title']) ?></h1>
          <p style="margin:0 0 12px;color:#374151;line-height:1.6;"><?= htmlspecialchars($t['hi']) ?></p>
          <p style="margin:0 0 24px;color:#374151;line-height:1.6;"><?= $t['body'] ?></p>
          <p style="text-align:center;margin:0 0 24px;">
            <a href="<?= htmlspecialchars($resetUrl) ?>"
               style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;">
              <?= htmlspecialchars($t['btn']) ?>
            </a>
          </p>
          <p style="margin:0 0 12px;color:#6b7280;font-size:14px;"><?= $t['expiry'] ?></p>
          <p style="margin:0;color:#6b7280;font-size:14px;"><?= $t['ignore'] ?></p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;"><?= htmlspecialchars($t['footer']) ?></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
