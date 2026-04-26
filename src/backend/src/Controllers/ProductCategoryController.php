<?php

namespace App\Controllers;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ProductCategoryController
{
    public function index(Request $request, Response $response): Response
    {
        $rows = Database::get()->query('SELECT * FROM product_categories ORDER BY name')->fetchAll();
        return $this->json($response, $rows);
    }

    private function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
