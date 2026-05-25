<?php

namespace App\Controllers;

use App\Database;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class EmailLogController extends BaseController
{
    public function index(Request $request, Response $response): Response
    {
        $db   = Database::get();
        $logs = $db->query(
            'SELECT id, recipient, template, subject, status, error, created_at
             FROM email_logs
             ORDER BY created_at DESC
             LIMIT 200'
        )->fetchAll();

        return $this->json($response, $logs);
    }
}
