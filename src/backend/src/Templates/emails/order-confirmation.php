<?php
/**
 * Email template: order-confirmation
 * Variables: $userName, $orderId, $orderItems (array of {name,qty,price}), $orderTotal, $currency
 * Locale: $locale ('en' | 'fr')
 */
$t = $locale === 'fr' ? [
    'title'    => "Confirmation de commande #$orderId",
    'hi'       => "Bonjour $userName,",
    'body'     => "Merci pour votre commande ! Voici un récapitulatif :",
    'product'  => 'Produit',
    'qty'      => 'Qté',
    'price'    => 'Prix',
    'total'    => 'Total',
    'footer'   => "$appName — Gestion d'inventaire communautaire",
] : [
    'title'    => "Order confirmation #$orderId",
    'hi'       => "Hello $userName,",
    'body'     => "Thank you for your order! Here is a summary:",
    'product'  => 'Product',
    'qty'      => 'Qty',
    'price'    => 'Price',
    'total'    => 'Total',
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
          <p style="margin:0 0 8px;color:#374151;line-height:1.6;"><?= htmlspecialchars($t['hi']) ?></p>
          <p style="margin:0 0 24px;color:#374151;line-height:1.6;"><?= htmlspecialchars($t['body']) ?></p>

          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="text-align:left;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;"><?= htmlspecialchars($t['product']) ?></th>
                <th style="text-align:center;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;width:48px;"><?= htmlspecialchars($t['qty']) ?></th>
                <th style="text-align:right;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;width:80px;"><?= htmlspecialchars($t['price']) ?></th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($orderItems as $item): ?>
              <tr>
                <td style="color:#111827;border-bottom:1px solid #f3f4f6;"><?= htmlspecialchars($item['name']) ?></td>
                <td style="text-align:center;color:#374151;border-bottom:1px solid #f3f4f6;"><?= (int)$item['qty'] ?></td>
                <td style="text-align:right;color:#374151;border-bottom:1px solid #f3f4f6;"><?= htmlspecialchars($currency) ?> <?= number_format((float)$item['price'], 2) ?></td>
              </tr>
              <?php endforeach; ?>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="text-align:right;font-weight:700;padding-top:12px;color:#111827;"><?= htmlspecialchars($t['total']) ?></td>
                <td style="text-align:right;font-weight:700;padding-top:12px;color:#16a34a;"><?= htmlspecialchars($currency) ?> <?= number_format((float)$orderTotal, 2) ?></td>
              </tr>
            </tfoot>
          </table>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;"><?= htmlspecialchars($t['footer']) ?></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
