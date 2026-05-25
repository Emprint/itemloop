<?php
/**
 * Email template: order-status-update
 * Variables: $userName, $orderId, $newStatus, $currency
 * Locale: $locale ('en' | 'fr')
 */
$statusLabels = [
    'en' => ['pending' => 'Pending', 'completed' => 'Completed', 'cancelled' => 'Cancelled'],
    'fr' => ['pending' => 'En attente', 'completed' => 'Terminée', 'cancelled' => 'Annulée'],
];
$lang        = isset($statusLabels[$locale]) ? $locale : 'en';
$statusLabel = $statusLabels[$lang][$newStatus] ?? $newStatus;

$t = $locale === 'fr' ? [
    'title'  => "Mise à jour de votre commande #$orderId",
    'hi'     => "Bonjour $userName,",
    'body'   => "Le statut de votre commande <strong>#$orderId</strong> a été mis à jour :",
    'status' => 'Nouveau statut',
    'footer' => 'Itemloop — Gestion d\'inventaire communautaire',
] : [
    'title'  => "Order #$orderId status update",
    'hi'     => "Hello $userName,",
    'body'   => "Your order <strong>#$orderId</strong> status has been updated:",
    'status' => 'New status',
    'footer' => 'Itemloop — Community Inventory Management',
];

$badgeColor = match($newStatus) {
    'completed' => '#16a34a',
    'cancelled'  => '#dc2626',
    default      => '#d97706',
};
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($locale) ?>">
<head><meta charset="UTF-8"><title><?= htmlspecialchars($t['title']) ?></title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr><td style="background:#111827;padding:24px 32px;">
          <span style="color:#fff;font-size:20px;font-weight:700;">Itemloop</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827;"><?= htmlspecialchars($t['title']) ?></h1>
          <p style="margin:0 0 8px;color:#374151;line-height:1.6;"><?= htmlspecialchars($t['hi']) ?></p>
          <p style="margin:0 0 24px;color:#374151;line-height:1.6;"><?= $t['body'] ?></p>
          <p style="margin:0;text-align:center;">
            <span style="display:inline-block;background:<?= $badgeColor ?>;color:#fff;padding:8px 20px;border-radius:99px;font-weight:700;font-size:15px;">
              <?= htmlspecialchars($statusLabel) ?>
            </span>
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
