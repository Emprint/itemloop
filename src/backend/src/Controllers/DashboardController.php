<?php

namespace App\Controllers;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class DashboardController
{
    public function getStats(Request $request, Response $response): Response
    {
        $db   = Database::get();
        $user = $request->getAttribute('user');
        $role = $user['role'] ?? null;

        $stats = [
            'products_count'  => (int) $db->query('SELECT COUNT(*) FROM products')->fetchColumn(),
            'items_count'     => (int) $db->query('SELECT COALESCE(SUM(quantity), 0) FROM products')->fetchColumn(),
            'locations_count' => (int) $db->query('SELECT COUNT(*) FROM locations')->fetchColumn(),
        ];

        if (in_array($role, ['editor', 'admin'], true)) {
            $stats['estimated_value'] = (float) $db->query(
                'SELECT COALESCE(SUM(estimated_value * quantity), 0) FROM products WHERE estimated_value IS NOT NULL'
            )->fetchColumn();

            $stmt = $db->query(
                'SELECT pc.name, COUNT(p.id) as count
                 FROM product_categories pc
                 LEFT JOIN products p ON p.category_id = pc.id
                 GROUP BY pc.id, pc.name
                 ORDER BY count DESC'
            );
            $stats['products_by_category'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Reuse impact statistics
            $stats['reuse_impact'] = [
                'total_kg_recovered' => (float) $db->query(
                    'SELECT COALESCE(SUM(weight * quantity), 0) FROM products WHERE weight IS NOT NULL'
                )->fetchColumn(),
                'items_redistributed' => (int) $db->query(
                    'SELECT COALESCE(SUM(oi.quantity), 0)
                     FROM order_items oi
                     INNER JOIN orders o ON o.id = oi.order_id
                     WHERE o.status = "completed"'
                )->fetchColumn(),
                'value_redistributed' => (float) $db->query(
                    'SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)
                     FROM order_items oi
                     INNER JOIN orders o ON o.id = oi.order_id
                     WHERE o.status = "completed" AND oi.unit_price IS NOT NULL'
                )->fetchColumn(),
            ];
        }

        if ($role === 'admin') {
            $stats['users_count'] = (int) $db->query('SELECT COUNT(*) FROM users')->fetchColumn();
        }

        $response->getBody()->write(json_encode($stats));
        return $response->withHeader('Content-Type', 'application/json');
    }
}
