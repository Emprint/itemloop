<?php

namespace App\Controllers;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ProductController
{
    private const DESTINATION_OPTIONS = ['review', 'keep', 'reuse', 'sell', 'donate', 'recycle', 'trash'];

    public function index(Request $request, Response $response): Response
    {
        $db     = Database::get();
        $user   = $request->getAttribute('user');
        $params = $request->getQueryParams();

        $where  = [];
        $binds  = [];

        if (!$user || !in_array($user['role'] ?? '', ['admin', 'editor', 'member'], true)) {
            $where[] = 'p.visibility = ?';
            $binds[] = 'public';
        }

        if (!empty($params['condition'])) {
            $where[] = 'c.name = ?';
            $binds[] = $params['condition'];
        }
        if (!empty($params['location_id'])) {
            $where[] = 'p.location_id = ?';
            $binds[] = (int) $params['location_id'];
        }
        if (!empty($params['keyword'])) {
            $where[] = 'p.title LIKE ?';
            $binds[] = '%' . $params['keyword'] . '%';
        }

        $sql = $this->selectProductSql($where);
        $stmt = $db->prepare($sql);
        $stmt->execute($binds);
        $rows = $stmt->fetchAll();

        $productIds = array_column($rows, 'id');
        $imagesByProduct = $this->loadImagesByProductIds($db, $productIds);

        return $this->json($response, array_map(
            fn($row) => $this->hydrate($row, $imagesByProduct[(int) $row['id']] ?? []),
            $rows
        ));
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        $db  = Database::get();
        $id  = (int) $args['id'];
        $stmt = $db->prepare($this->selectProductSql(['p.id = ?']));
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        $imgStmt = $db->prepare('SELECT id, path, format, width, height FROM images WHERE product_id = ?');
        $imgStmt->execute([$id]);
        $images = $imgStmt->fetchAll();

        return $this->json($response, $this->hydrate($row, $images));
    }

    public function store(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $db   = Database::get();
        $body = (array) $request->getParsedBody();

        [$data, $errors] = $this->validate($body, false);
        if ($errors) {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);
        }

        $this->resolveRelations($db, $body, $data);

        // Ensure every INSERT column has a value (optional fields default to null)
        $data = array_merge([
            'description'     => null,
            'estimated_value' => null,
            'barcode'         => null,
            'length'          => null,
            'width'           => null,
            'height'          => null,
            'weight'          => null,
            'destination'     => null,
            'visibility'      => 'private',
            'condition_id'    => null,
            'color_id'        => null,
            'category_id'     => null,
            'created_by'      => $user['id'],
            'updated_by'      => null,
        ], $data);

        $sql = 'INSERT INTO products
                    (title, description, quantity, estimated_value, location_id, barcode,
                     length, width, height, weight, destination, visibility,
                     condition_id, color_id, category_id, created_by, updated_by, created_at, updated_at)
                VALUES
                    (:title, :description, :quantity, :estimated_value, :location_id, :barcode,
                     :length, :width, :height, :weight, :destination, :visibility,
                     :condition_id, :color_id, :category_id, :created_by, :updated_by, NOW(), NOW())';
        $stmt = $db->prepare($sql);
        $stmt->execute($data);
        $id = (int) $db->lastInsertId();

        // Log the initial stock event
        self::applyStockMovement($db, $id, 'initial_stock', (int) $data['quantity'], (int) $user['id']);

        return $this->json($response, $this->findProduct($db, $id), 201);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db   = Database::get();
        $id   = (int) $args['id'];
        $body = (array) $request->getParsedBody();

        // Fetch old row before update for comparison
        $stmt = $db->prepare('SELECT id, quantity, location_id FROM products WHERE id = ?');
        $stmt->execute([$id]);
        $old = $stmt->fetch();
        if (!$old) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        [$data, $errors] = $this->validate($body, true);
        if ($errors) {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);
        }

        // Quantity is managed via stock movements only — remove it from direct edits
        unset($data['quantity']);

        $this->resolveRelations($db, $body, $data);

        $data['updated_by'] = $user['id'];

        $sets = implode(', ', array_map(fn($k) => "`{$k}` = :{$k}", array_keys($data)));
        $data['id'] = $id;
        $db->prepare("UPDATE products SET {$sets}, updated_at = NOW() WHERE id = :id")->execute($data);

        // Log history events for tracked field changes
        $newLocationId = isset($body['location_id']) ? (int) $body['location_id'] : null;
        if ($newLocationId !== null && $newLocationId !== (int) $old['location_id']) {
            $oldLoc = $this->fetchLocationLabel($db, (int) $old['location_id']);
            $newLoc = $this->fetchLocationLabel($db, $newLocationId);
            self::logHistory($db, $id, 'location_move', null, (int) $user['id'], [
                'old_code'  => $oldLoc['code']  ?? null,
                'new_code'  => $newLoc['code']  ?? null,
                'old_label' => $oldLoc['label'] ?? null,
                'new_label' => $newLoc['label'] ?? null,
            ]);
        } else {
            self::logHistory($db, $id, 'field_update', null, (int) $user['id']);
        }

        return $this->json($response, $this->findProduct($db, $id));
    }

    public function destroy(Request $request, Response $response, array $args): Response
    {
        $db   = Database::get();
        $id   = (int) $args['id'];
        $stmt = $db->prepare('SELECT id FROM products WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        $db->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
        return $this->json($response, ['success' => true]);
    }

    // -------------------------------------------------------------------------
    // GET /api/products/{id}/history
    // -------------------------------------------------------------------------
    public function getHistory(Request $request, Response $response, array $args): Response
    {
        $db = Database::get();
        $id = (int) $args['id'];

        $stmt = $db->prepare('SELECT id FROM products WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        $stmt = $db->prepare('
            SELECT ph.id, ph.event_type, ph.delta, ph.meta, ph.created_at,
                   u.name AS user_name
            FROM product_history ph
            LEFT JOIN users u ON u.id = ph.user_id
            WHERE ph.product_id = ?
            ORDER BY ph.created_at DESC, ph.id DESC
        ');
        $stmt->execute([$id]);
        $rows = $stmt->fetchAll();

        $entries = array_map(fn($row) => [
            'id'         => (int) $row['id'],
            'event_type' => $row['event_type'],
            'delta'      => $row['delta'] !== null ? (int) $row['delta'] : null,
            'user_name'  => $row['user_name'] ?? null,
            'meta'       => $row['meta'] ? json_decode($row['meta'], true) : null,
            'created_at' => $row['created_at'],
        ], $rows);

        return $this->json($response, $entries);
    }

    // -------------------------------------------------------------------------
    // POST /api/products/{id}/stock-movement
    // -------------------------------------------------------------------------
    public function createStockMovement(Request $request, Response $response, array $args): Response
    {
        $user = $request->getAttribute('user');
        $db   = Database::get();
        $id   = (int) $args['id'];
        $body = (array) $request->getParsedBody();

        $delta = isset($body['delta']) ? (int) $body['delta'] : null;
        if ($delta === null || $delta === 0) {
            return $this->json($response, ['error' => 'INVALID_DELTA', 'message' => 'delta must be a non-zero integer.'], 422);
        }

        $stmt = $db->prepare('SELECT id, quantity FROM products WHERE id = ? FOR UPDATE');
        $db->beginTransaction();
        try {
            $stmt->execute([$id]);
            $product = $stmt->fetch();
            if (!$product) {
                $db->rollBack();
                return $this->json($response, ['error' => 'NOT_FOUND'], 404);
            }

            $newQty = (int) $product['quantity'] + $delta;
            if ($newQty < 0) {
                $db->rollBack();
                return $this->json($response, ['error' => 'INSUFFICIENT_STOCK', 'message' => 'Adjustment would result in negative stock.'], 422);
            }

            $meta = [];
            if (!empty($body['reason'])) {
                $meta['reason'] = (string) $body['reason'];
            }

            self::applyStockMovement($db, $id, 'stock_adjustment', $delta, (int) $user['id'], $meta);
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            return $this->json($response, ['error' => 'SERVER_ERROR'], 500);
        }

        return $this->json($response, $this->findProduct($db, $id));
    }

    // -------------------------------------------------------------------------
    // Stock movement helper — inserts history record and updates products.quantity
    // atomically. Call inside a transaction for multi-step operations.
    // -------------------------------------------------------------------------
    public static function applyStockMovement(
        \PDO $db,
        int $productId,
        string $eventType,
        ?int $delta,
        ?int $userId,
        array $meta = []
    ): void {
        $db->prepare(
            'INSERT INTO product_history (product_id, event_type, delta, user_id, meta, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())'
        )->execute([
            $productId,
            $eventType,
            $delta,
            $userId,
            $meta ? json_encode($meta) : null,
        ]);

        if ($delta !== null) {
            $db->prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?')
               ->execute([$delta, $productId]);
        }
    }

    // Log a non-quantity history event
    public static function logHistory(
        \PDO $db,
        int $productId,
        string $eventType,
        ?int $delta,
        ?int $userId,
        array $meta = []
    ): void {
        $db->prepare(
            'INSERT INTO product_history (product_id, event_type, delta, user_id, meta, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())'
        )->execute([
            $productId,
            $eventType,
            $delta,
            $userId,
            $meta ? json_encode($meta) : null,
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function validate(array $body, bool $partial): array
    {
        $errors = [];
        $data   = [];

        $required = !$partial;

        $this->field($body, $data, $errors, 'title', $required, fn($v) =>
            is_string($v) && strlen($v) <= 255 ? null : 'The title must be a string of max 255 characters.'
        );
        $this->optionalField($body, $data, 'description');
        $this->field($body, $data, $errors, 'quantity', $required, fn($v) =>
            is_numeric($v) && (int) $v >= 0 ? null : 'Quantity must be a non-negative integer.',
            fn($v) => (int) $v
        );
        $this->optionalField($body, $data, 'estimated_value', fn($v) => $v !== '' && $v !== null ? (float) $v : null);
        $this->field($body, $data, $errors, 'location_id', $required, function ($v) {
            if (!is_numeric($v) || (int) $v <= 0) return 'location_id must be a positive integer.';
            $stmt = Database::get()->prepare('SELECT id FROM locations WHERE id = ?');
            $stmt->execute([(int) $v]);
            return $stmt->fetch() ? null : 'The selected location does not exist.';
        }, fn($v) => (int) $v);
        $this->optionalField($body, $data, 'barcode');
        foreach (['length', 'width', 'height', 'weight'] as $dim) {
            $this->optionalField($body, $data, $dim, fn($v) => $v !== '' && $v !== null ? (float) $v : null);
        }
        $this->optionalField($body, $data, 'destination', function ($v) {
            if ($v === null || $v === '') return null;
            return in_array($v, self::DESTINATION_OPTIONS, true) ? $v : null;
        });
        $this->optionalField($body, $data, 'visibility', function ($v) {
            return in_array($v, ['public', 'private'], true) ? $v : 'private';
        });

        // condition_id / color_id / category_id — resolved in resolveRelations
        $this->optionalField($body, $data, 'condition_id', fn($v) => is_numeric($v) ? (int) $v : null);
        $this->optionalField($body, $data, 'color_id',     fn($v) => is_numeric($v) ? (int) $v : null);
        $this->optionalField($body, $data, 'category_id',  fn($v) => is_numeric($v) ? (int) $v : null);

        return [$data, $errors];
    }

    /**
     * Upsert pattern: if *_id is 0 and a name is provided in the nested object,
     * find-or-create the record and replace the id.
     */
    private function resolveRelations(\PDO $db, array $body, array &$data): void
    {
        $map = [
            'condition' => ['table' => 'product_conditions', 'field' => 'condition_id'],
            'color'     => ['table' => 'product_colors',     'field' => 'color_id'],
            'category'  => ['table' => 'product_categories', 'field' => 'category_id'],
        ];

        foreach ($map as $key => ['table' => $table, 'field' => $field]) {
            $id   = $data[$field] ?? null;
            $name = trim(($body[$key]['name'] ?? '') ?: ($body[$key] ?? ''));

            if (($id === 0 || $id === null) && $name !== '') {
                $stmt = $db->prepare("SELECT id FROM {$table} WHERE name = ?");
                $stmt->execute([$name]);
                $existing = $stmt->fetchColumn();
                if ($existing) {
                    $data[$field] = (int) $existing;
                } else {
                    $db->prepare("INSERT INTO {$table} (name) VALUES (?)")->execute([$name]);
                    $data[$field] = (int) $db->lastInsertId();
                }
            } elseif ($id === 0) {
                $data[$field] = null;
            }
        }
    }

    private function fetchLocationLabel(\PDO $db, int $locationId): array
    {
        $stmt = $db->prepare('
            SELECT l.code, CONCAT(b.name, " › ", z.name, " › ", l.shelf) AS label
            FROM locations l
            JOIN zones z ON z.id = l.zone_id
            JOIN buildings b ON b.id = z.building_id
            WHERE l.id = ?
        ');
        $stmt->execute([$locationId]);
        return $stmt->fetch() ?: [];
    }

    private function field(array $body, array &$data, array &$errors, string $key, bool $required, callable $validate, ?callable $cast = null): void
    {
        if (!array_key_exists($key, $body)) {
            if ($required) $errors[$key] = ["The {$key} field is required."];
            return;
        }
        $val = $body[$key];
        $err = $validate($val);
        if ($err !== null) {
            $errors[$key] = [$err];
            return;
        }
        $data[$key] = $cast ? $cast($val) : $val;
    }

    private function optionalField(array $body, array &$data, string $key, ?callable $cast = null): void
    {
        if (!array_key_exists($key, $body)) return;
        $data[$key] = $cast ? $cast($body[$key]) : $body[$key];
    }

    private function selectProductSql(array $where = []): string
    {
        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        return "SELECT p.*,
                    pc.id AS condition_id, pc.name AS condition_name,
                    col.id AS color_id, col.name AS color_name,
                    cat.id AS category_id, cat.name AS category_name,
                    l.id AS location_id, l.shelf AS location_shelf, l.code AS location_code,
                    z.id AS zone_id, z.name AS zone_name,
                    b.id AS building_id, b.name AS building_name,
                    cu.name AS created_by_name,
                    uu.name AS updated_by_name
                FROM products p
                LEFT JOIN product_conditions pc  ON pc.id  = p.condition_id
                LEFT JOIN product_colors     col ON col.id = p.color_id
                LEFT JOIN product_categories cat ON cat.id = p.category_id
                LEFT JOIN locations          l   ON l.id   = p.location_id
                LEFT JOIN zones              z   ON z.id   = l.zone_id
                LEFT JOIN buildings          b   ON b.id   = z.building_id
                LEFT JOIN users              cu  ON cu.id  = p.created_by
                LEFT JOIN users              uu  ON uu.id  = p.updated_by
                {$whereClause}";
    }

    private function loadImagesByProductIds(\PDO $db, array $ids): array
    {
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $db->prepare(
            "SELECT id, product_id, path, thumbnail_path, format, width, height, sort_order
             FROM images WHERE product_id IN ($placeholders)
             ORDER BY product_id, sort_order ASC"
        );
        $stmt->execute($ids);
        $grouped = [];
        foreach ($stmt->fetchAll() as $img) {
            $grouped[(int) $img['product_id']][] = $img;
        }
        return $grouped;
    }

    private function findProduct(\PDO $db, int $id): array
    {
        $stmt = $db->prepare($this->selectProductSql(['p.id = ?']));
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        // Load images ordered by sort_order
        $imgStmt = $db->prepare(
            'SELECT id, path, thumbnail_path, format, width, height, sort_order
             FROM images WHERE product_id = ? ORDER BY sort_order ASC'
        );
        $imgStmt->execute([$id]);
        $images = $imgStmt->fetchAll();

        return $this->hydrate($row, $images);
    }

    private function hydrate(array $row, ?array $images = null): array
    {
        $product = [
            'id'              => (int) $row['id'],
            'title'           => $row['title'],
            'description'     => $row['description'],
            'quantity'        => (int) $row['quantity'],
            'estimated_value' => $row['estimated_value'] !== null ? (float) $row['estimated_value'] : null,
            'barcode'         => $row['barcode'],
            'length'          => $row['length'] !== null ? (float) $row['length'] : null,
            'width'           => $row['width']  !== null ? (float) $row['width']  : null,
            'height'          => $row['height'] !== null ? (float) $row['height'] : null,
            'weight'          => $row['weight'] !== null ? (float) $row['weight'] : null,
            'destination'     => $row['destination'],
            'visibility'      => $row['visibility'],
            'created_at'      => $row['created_at'],
            'updated_at'      => $row['updated_at'],
            'created_by_name' => $row['created_by_name'] ?? null,
            'updated_by_name' => $row['updated_by_name'] ?? null,
            'condition'       => $row['condition_id'] ? ['id' => (int) $row['condition_id'], 'name' => $row['condition_name']] : null,
            'color'           => $row['color_id']     ? ['id' => (int) $row['color_id'],     'name' => $row['color_name']]     : null,
            'category'        => $row['category_id']  ? ['id' => (int) $row['category_id'],  'name' => $row['category_name']]  : null,
            'location'        => $row['location_id']  ? [
                'id'    => (int) $row['location_id'],
                'shelf' => $row['location_shelf'],
                'code'  => $row['location_code'],
                'zone'  => $row['zone_id'] ? ['id' => (int) $row['zone_id'], 'name' => $row['zone_name']] : null,
                'building' => $row['building_id'] ? ['id' => (int) $row['building_id'], 'name' => $row['building_name']] : null,
            ] : null,
            'images'          => array_map(fn($img) => [
                'id'            => (int) $img['id'],
                'url'           => '/' . $img['path'],
                'thumbnail_url' => isset($img['thumbnail_path']) && $img['thumbnail_path']
                                    ? '/' . $img['thumbnail_path']
                                    : '/' . $img['path'],
                'path'          => $img['path'],
                'format'        => $img['format'],
                'width'         => $img['width']  ? (int) $img['width']  : null,
                'height'        => $img['height'] ? (int) $img['height'] : null,
                'sort_order'    => (int) ($img['sort_order'] ?? 0),
            ], $images ?? []),
        ];

        return $product;
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

}
