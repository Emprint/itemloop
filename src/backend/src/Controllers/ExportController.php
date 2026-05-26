<?php

namespace App\Controllers;

use App\Database;
use Dompdf\Dompdf;
use Dompdf\Options;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ExportController
{
    // ── Products PDF ─────────────────────────────────────────────────────────

    public function productsPdf(Request $request, Response $response): Response
    {
        $db = Database::get();

        $stmt = $db->query("
            SELECT p.id, p.title, p.quantity, p.estimated_value, p.barcode,
                   p.visibility, p.created_at,
                   pc.name  AS condition_name,
                   col.name AS color_name,
                   cat.name AS category_name,
                   l.shelf  AS location_shelf,
                   z.name   AS zone_name,
                   b.name   AS building_name
            FROM products p
            LEFT JOIN product_conditions pc  ON pc.id  = p.condition_id
            LEFT JOIN product_colors     col ON col.id = p.color_id
            LEFT JOIN product_categories cat ON cat.id = p.category_id
            LEFT JOIN locations          l   ON l.id   = p.location_id
            LEFT JOIN zones              z   ON z.id   = l.zone_id
            LEFT JOIN buildings          b   ON b.id   = z.building_id
            ORDER BY p.id ASC
        ");
        $products = $stmt->fetchAll();

        $rows = '';
        foreach ($products as $p) {
            $code     = 'PRD-' . str_pad($p['id'], 4, '0', STR_PAD_LEFT);
            $location = $p['building_name'] ? esc($p['building_name']) . ' / ' . esc($p['location_shelf'] ?? '') : '—';
            $rows .= '<tr>'
                . '<td>' . esc($code) . '</td>'
                . '<td>' . esc($p['title']) . '</td>'
                . '<td>' . esc($p['category_name'] ?? '—') . '</td>'
                . '<td>' . esc($p['condition_name'] ?? '—') . '</td>'
                . '<td>' . esc($p['color_name'] ?? '—') . '</td>'
                . '<td>' . $location . '</td>'
                . '<td class="num">' . (int)$p['quantity'] . '</td>'
                . '<td class="num">' . ($p['estimated_value'] !== null ? number_format($p['estimated_value'], 2) : '—') . '</td>'
                . '<td>' . esc($p['barcode'] ?? '—') . '</td>'
                . '<td>' . date('d/m/Y', strtotime($p['created_at'])) . '</td>'
                . '</tr>';
        }

        $total = count($products);
        $date  = date('d/m/Y H:i');

        $html = pdfLayout('Inventory – Products', "
            <p class='meta'>Exported on {$date} &nbsp;·&nbsp; {$total} products</p>
            <table>
                <thead>
                    <tr>
                        <th>Code</th><th>Title</th><th>Category</th><th>Condition</th>
                        <th>Color</th><th>Location</th><th>Qty</th><th>Est. Value</th>
                        <th>Barcode</th><th>Date Added</th>
                    </tr>
                </thead>
                <tbody>{$rows}</tbody>
            </table>
        ");

        return $this->streamPdf($response, $html, 'products-inventory.pdf');
    }

    // ── Orders PDF ────────────────────────────────────────────────────────────

    public function ordersPdf(Request $request, Response $response): Response
    {
        $db = Database::get();

        $stmt = $db->query("
            SELECT o.id, o.status, o.notes, o.created_at,
                   u.name AS user_name, u.email AS user_email
            FROM orders o
            JOIN users u ON u.id = o.user_id
            ORDER BY o.created_at DESC
        ");
        $orders = $stmt->fetchAll();

        if (empty($orders)) {
            $orderIds = [];
            $itemMap  = [];
        } else {
            $orderIds    = array_column($orders, 'id');
            $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
            $iStmt = $db->prepare("
                SELECT oi.order_id, oi.quantity, oi.unit_price, p.title AS product_title
                FROM order_items oi
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id IN ($placeholders)
                ORDER BY oi.order_id, oi.id
            ");
            $iStmt->execute($orderIds);
            $itemMap = [];
            foreach ($iStmt->fetchAll() as $row) {
                $itemMap[(int)$row['order_id']][] = $row;
            }
        }

        $rows = '';
        foreach ($orders as $o) {
            $items    = $itemMap[(int)$o['id']] ?? [];
            $total    = array_reduce($items, fn($s, $i) => $s + ($i['quantity'] * ($i['unit_price'] ?? 0)), 0);
            $itemList = implode('<br>', array_map(
                fn($i) => esc($i['product_title'] ?? '?') . ' ×' . $i['quantity'],
                $items
            ));
            $statusClass = match ($o['status']) {
                'completed' => 'status-completed',
                'cancelled' => 'status-cancelled',
                default     => 'status-pending',
            };
            $rows .= '<tr>'
                . '<td>#' . $o['id'] . '</td>'
                . '<td>' . esc($o['user_name']) . '<br><small>' . esc($o['user_email']) . '</small></td>'
                . '<td>' . date('d/m/Y', strtotime($o['created_at'])) . '</td>'
                . '<td><span class="' . $statusClass . '">' . ucfirst($o['status']) . '</span></td>'
                . '<td>' . ($itemList ?: '—') . '</td>'
                . '<td class="num">' . ($total > 0 ? number_format($total, 2) : '—') . '</td>'
                . '</tr>';
        }

        $total = count($orders);
        $date  = date('d/m/Y H:i');

        $html = pdfLayout('Inventory – Orders', "
            <p class='meta'>Exported on {$date} &nbsp;·&nbsp; {$total} orders</p>
            <table>
                <thead>
                    <tr>
                        <th>#</th><th>Customer</th><th>Date</th>
                        <th>Status</th><th>Items</th><th>Total</th>
                    </tr>
                </thead>
                <tbody>{$rows}</tbody>
            </table>
        ");

        return $this->streamPdf($response, $html, 'orders-export.pdf');
    }

    // ── Helper: stream PDF response ───────────────────────────────────────────

    private function streamPdf(Response $response, string $html, string $filename): Response
    {
        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);

        $dompdf = new Dompdf($options);
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->render();

        $pdf = $dompdf->output();

        $response->getBody()->write($pdf);

        return $response
            ->withHeader('Content-Type', 'application/pdf')
            ->withHeader('Content-Disposition', 'attachment; filename="' . $filename . '"')
            ->withHeader('Content-Length', strlen($pdf));
    }
}

// ── File-scope helpers (not in class to avoid namespace issues) ───────────────

function esc(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function pdfLayout(string $title, string $body): string
{
    return '<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>' . esc($title) . '</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1a1a1a; padding: 20px; }
        h1 { font-size: 14px; font-weight: 700; margin-bottom: 4px; color: #111; }
        p.meta { font-size: 8px; color: #666; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1a1a1a; color: #fff; text-align: left; padding: 5px 6px; font-size: 8px; font-weight: 600; }
        td { padding: 4px 6px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
        tr:nth-child(even) td { background: #f9f9f9; }
        td.num { text-align: right; }
        small { color: #888; font-size: 7.5px; }
        .status-completed { color: #166534; font-weight: 600; }
        .status-cancelled { color: #991b1b; font-weight: 600; }
        .status-pending   { color: #92400e; font-weight: 600; }
    </style>
    </head><body>
    <h1>' . esc($title) . '</h1>
    ' . $body . '
    </body></html>';
}
