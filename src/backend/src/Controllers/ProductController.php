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

        return $this->json($response, array_map([$this, 'hydrate'], $rows));
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        $db   = Database::get();
        $stmt = $db->prepare($this->selectProductSql(['p.id = ?']));
        $stmt->execute([(int) $args['id']]);
        $row = $stmt->fetch();

        if (!$row) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        return $this->json($response, $this->hydrate($row));
    }

    public function store(Request $request, Response $response): Response
    {
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
        ], $data);

        $sql = 'INSERT INTO products
                    (title, description, quantity, estimated_value, location_id, barcode,
                     length, width, height, weight, destination, visibility,
                     condition_id, color_id, category_id, created_at, updated_at)
                VALUES
                    (:title, :description, :quantity, :estimated_value, :location_id, :barcode,
                     :length, :width, :height, :weight, :destination, :visibility,
                     :condition_id, :color_id, :category_id, NOW(), NOW())';
        $stmt = $db->prepare($sql);
        $stmt->execute($data);
        $id = (int) $db->lastInsertId();

        return $this->json($response, $this->findProduct($db, $id), 201);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $db   = Database::get();
        $id   = (int) $args['id'];
        $body = (array) $request->getParsedBody();

        $stmt = $db->prepare('SELECT id FROM products WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        [$data, $errors] = $this->validate($body, true);
        if ($errors) {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => $errors], 422);
        }

        $this->resolveRelations($db, $body, $data);

        if (empty($data)) {
            return $this->json($response, $this->findProduct($db, $id));
        }

        $sets = implode(', ', array_map(fn($k) => "`{$k}` = :{$k}", array_keys($data)));
        $data['id'] = $id;
        $db->prepare("UPDATE products SET {$sets}, updated_at = NOW() WHERE id = :id")->execute($data);

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
                    b.id AS building_id, b.name AS building_name
                FROM products p
                LEFT JOIN product_conditions pc  ON pc.id  = p.condition_id
                LEFT JOIN product_colors     col ON col.id = p.color_id
                LEFT JOIN product_categories cat ON cat.id = p.category_id
                LEFT JOIN locations          l   ON l.id   = p.location_id
                LEFT JOIN zones              z   ON z.id   = l.zone_id
                LEFT JOIN buildings          b   ON b.id   = z.building_id
                {$whereClause}";
    }

    private function findProduct(\PDO $db, int $id): array
    {
        $stmt = $db->prepare($this->selectProductSql(['p.id = ?']));
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        // Load images
        $imgStmt = $db->prepare('SELECT id, path, format, width, height FROM images WHERE product_id = ?');
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
            'images'          => $images ?? [],
        ];

        return $product;
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
