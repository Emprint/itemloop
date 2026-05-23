<?php

namespace App\Controllers;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ProductColorController
{
    public function index(Request $request, Response $response): Response
    {
        $rows = Database::get()->query(
            'SELECT c.*, COUNT(p.id) AS product_count
             FROM product_colors c
             LEFT JOIN products p ON p.color_id = c.id
             GROUP BY c.id
             ORDER BY c.name'
        )->fetchAll();
        return $this->json($response, $rows);
    }

    public function store(Request $request, Response $response): Response
    {
        $db   = Database::get();
        $body = (array) $request->getParsedBody();
        $name = trim($body['name'] ?? '');

        if ($name === '') {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['name' => ['Name is required.']]], 422);
        }

        $stmt = $db->prepare('SELECT * FROM product_colors WHERE name = ?');
        $stmt->execute([$name]);
        $existing = $stmt->fetch();
        if ($existing) return $this->json($response, $existing);

        $db->prepare('INSERT INTO product_colors (name) VALUES (?)')->execute([$name]);
        $id = (int) $db->lastInsertId();
        return $this->json($response, ['id' => $id, 'name' => $name, 'product_count' => 0], 201);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $db   = Database::get();
        $id   = (int) $args['id'];
        $body = (array) $request->getParsedBody();
        $name = trim($body['name'] ?? '');

        if ($name === '') {
            return $this->json($response, ['error' => 'ERROR_VALIDATION', 'errors' => ['name' => ['Name is required.']]], 422);
        }

        $stmt = $db->prepare('SELECT id FROM product_colors WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        $db->prepare('UPDATE product_colors SET name = ? WHERE id = ?')->execute([$name, $id]);

        $stmt = $db->prepare(
            'SELECT c.*, COUNT(p.id) AS product_count
             FROM product_colors c
             LEFT JOIN products p ON p.color_id = c.id
             WHERE c.id = ?
             GROUP BY c.id'
        );
        $stmt->execute([$id]);
        return $this->json($response, $stmt->fetch());
    }

    public function destroy(Request $request, Response $response, array $args): Response
    {
        $db         = Database::get();
        $id         = (int) $args['id'];
        $reassignTo = (int) ($request->getQueryParams()['reassign_to'] ?? 0);

        $stmt = $db->prepare('SELECT id FROM product_colors WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            return $this->json($response, ['error' => 'NOT_FOUND'], 404);
        }

        if ($reassignTo > 0) {
            $db->prepare('UPDATE products SET color_id = ? WHERE color_id = ?')
               ->execute([$reassignTo, $id]);
        }

        $db->prepare('DELETE FROM product_colors WHERE id = ?')->execute([$id]);
        return $this->json($response, ['success' => true]);
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
