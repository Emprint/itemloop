<?php

namespace App\Controllers;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class OrderController
{
    // -----------------------------------------------------------------------
    // POST /api/orders — place an order from the cart (any authenticated user)
    // -----------------------------------------------------------------------
    public function store(Request $request, Response $response): Response
    {
        $user  = $request->getAttribute('user');
        $body  = (array) $request->getParsedBody();
        $items = $body['items'] ?? [];

        if (empty($items) || !is_array($items)) {
            return $this->json($response, ['error' => 'EMPTY_CART'], 422);
        }

        $db = Database::get();

        // Validate each item
        $resolved = [];
        foreach ($items as $item) {
            $productId = (int) ($item['product_id'] ?? 0);
            $quantity  = (int) ($item['quantity']   ?? 0);

            if ($productId <= 0 || $quantity <= 0) {
                return $this->json($response, ['error' => 'INVALID_ITEM'], 422);
            }

            $stmt = $db->prepare('SELECT id, quantity, estimated_value FROM products WHERE id = ?');
            $stmt->execute([$productId]);
            $product = $stmt->fetch();

            if (!$product) {
                return $this->json($response, ['error' => 'PRODUCT_NOT_FOUND', 'product_id' => $productId], 422);
            }

            if ($quantity > (int) $product['quantity']) {
                return $this->json($response, ['error' => 'INSUFFICIENT_STOCK', 'product_id' => $productId], 422);
            }

            $resolved[] = [
                'product_id' => $productId,
                'quantity'   => $quantity,
                'unit_price' => $product['estimated_value'],
            ];
        }

        // Insert order
        $db->beginTransaction();
        try {
            $stmt = $db->prepare('INSERT INTO orders (user_id, status, notes) VALUES (?, ?, ?)');
            $stmt->execute([$user['id'], 'pending', $body['notes'] ?? null]);
            $orderId = (int) $db->lastInsertId();

            $itemStmt = $db->prepare(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
            );
            foreach ($resolved as $r) {
                $itemStmt->execute([$orderId, $r['product_id'], $r['quantity'], $r['unit_price']]);
            }

            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            return $this->json($response, ['error' => 'SERVER_ERROR'], 500);
        }

        return $this->json($response, $this->findOrder($db, $orderId), 201);
    }

    // -----------------------------------------------------------------------
    // GET /api/orders/mine — orders for the authenticated user
    // -----------------------------------------------------------------------
    public function mine(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db   = Database::get();

        $orders = $this->fetchOrders($db, ['o.user_id = ?' => $user['id']]);
        return $this->json($response, $orders);
    }

    // -----------------------------------------------------------------------
    // GET /api/orders — all orders (editor+)
    // -----------------------------------------------------------------------
    public function index(Request $request, Response $response): Response
    {
        $db     = Database::get();
        $orders = $this->fetchOrders($db);
        return $this->json($response, $orders);
    }

    // -----------------------------------------------------------------------
    // PATCH /api/orders/{id}/status — update status (editor+)
    // -----------------------------------------------------------------------
    public function updateStatus(Request $request, Response $response, array $args): Response
    {
        $db     = Database::get();
        $id     = (int) $args['id'];
        $body   = (array) $request->getParsedBody();
        $status = $body['status'] ?? '';

        $allowed = ['pending', 'completed', 'cancelled'];
        if (!in_array($status, $allowed, true)) {
            return $this->json($response, ['error' => 'INVALID_STATUS'], 422);
        }

        $stmt = $db->prepare('UPDATE orders SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);

        if ($stmt->rowCount() === 0) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        return $this->json($response, $this->findOrder($db, $id));
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function fetchOrders(\PDO $db, array $conditions = []): array
    {
        $where  = array_keys($conditions);
        $binds  = array_values($conditions);
        $clause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "
            SELECT o.id, o.status, o.notes, o.created_at, o.updated_at,
                   u.id AS user_id, u.name AS user_name, u.email AS user_email
            FROM orders o
            JOIN users u ON u.id = o.user_id
            $clause
            ORDER BY o.created_at DESC
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute($binds);
        $rows = $stmt->fetchAll();

        if (empty($rows)) {
            return [];
        }

        $orderIds  = array_column($rows, 'id');
        $items     = $this->loadItems($db, $orderIds);

        return array_map(fn($row) => $this->hydrateOrder($row, $items[(int)$row['id']] ?? []), $rows);
    }

    private function findOrder(\PDO $db, int $id): array
    {
        $orders = $this->fetchOrders($db, ['o.id = ?' => $id]);
        return $orders[0] ?? [];
    }

    private function loadItems(\PDO $db, array $orderIds): array
    {
        if (empty($orderIds)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
        $sql = "
            SELECT oi.order_id, oi.id, oi.product_id, oi.quantity, oi.unit_price,
                   p.title AS product_title
            FROM order_items oi
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id IN ($placeholders)
            ORDER BY oi.id
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute($orderIds);
        $rows = $stmt->fetchAll();

        $map = [];
        foreach ($rows as $r) {
            $map[(int)$r['order_id']][] = [
                'id'            => (int) $r['id'],
                'product_id'    => (int) $r['product_id'],
                'product_title' => $r['product_title'],
                'quantity'      => (int) $r['quantity'],
                'unit_price'    => $r['unit_price'] !== null ? (float) $r['unit_price'] : null,
            ];
        }
        return $map;
    }

    private function hydrateOrder(array $row, array $items): array
    {
        $total = null;
        foreach ($items as $item) {
            if ($item['unit_price'] !== null) {
                $total = ($total ?? 0) + $item['unit_price'] * $item['quantity'];
            }
        }
        return [
            'id'         => (int) $row['id'],
            'status'     => $row['status'],
            'notes'      => $row['notes'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'user'       => [
                'id'    => (int) $row['user_id'],
                'name'  => $row['user_name'],
                'email' => $row['user_email'],
            ],
            'items'      => $items,
            'total'      => $total,
        ];
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
