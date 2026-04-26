<?php

namespace App\Controllers;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ProductColorController
{
    public function index(Request $request, Response $response): Response
    {
        $rows = Database::get()->query('SELECT * FROM product_colors ORDER BY name')->fetchAll();
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
        $id   = (int) $db->lastInsertId();
        $stmt = $db->prepare('SELECT * FROM product_colors WHERE id = ?');
        $stmt->execute([$id]);
        return $this->json($response, $stmt->fetch(), 201);
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
