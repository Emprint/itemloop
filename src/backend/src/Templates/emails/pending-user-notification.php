<?php
/**
 * Email template: pending-user-notification
 * Variables: $newUserName (string), $newUserEmail (string), $appUrl (string)
 * Locale: $locale ('en' | 'fr') — uses admin's locale
 */
$t = $locale === 'fr' ? [
    'title'    => 'Nouvel utilisateur en attente d\'approbation',
    'body'     => "Un nouveau compte a été créé et est en attente de votre validation :",
    'name'     => 'Nom',
    'email'    => 'E-mail',
    'action'   => 'Aller à la gestion des utilisateurs',
    'footer'   => "$appName — Gestion d'inventaire communautaire",
] : [
    'title'    => 'New user awaiting approval',
    'body'     => "A new account has been created and is awaiting your approval:",
    'name'     => 'Name',
    'email'    => 'Email',
    'action'   => 'Go to user management',
    'footer'   => "$appName — Community Inventory Management",
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
          <p style="margin:0 0 24px;color:#374151;line-height:1.6;"><?= htmlspecialchars($t['body']) ?></p>

          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="color:#6b7280;font-size:13px;padding-right:16px;padding-bottom:8px;"><?= htmlspecialchars($t['name']) ?></td>
              <td style="color:#111827;font-weight:600;padding-bottom:8px;"><?= htmlspecialchars($newUserName) ?></td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:13px;padding-right:16px;"><?= htmlspecialchars($t['email']) ?></td>
              <td style="color:#111827;"><?= htmlspecialchars($newUserEmail) ?></td>
            </tr>
          </table>

          <p style="text-align:center;margin:0;">
            <a href="<?= htmlspecialchars($appUrl) ?>/admin/settings/users"
               style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;">
              <?= htmlspecialchars($t['action']) ?>
            </a>
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;"><?= htmlspecialchars($t['footer']) ?></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
