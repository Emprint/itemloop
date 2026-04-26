<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Requires the authenticated user to have 'editor' or 'admin' role.
 * Must be used after AuthMiddleware (relies on the 'user' request attribute).
 */
class EditorMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $user = $request->getAttribute('user');
        $role = $user['role'] ?? '';

        if (!in_array($role, ['editor', 'admin'], true)) {
            $response = new Response();
            $response->getBody()->write(json_encode(['error' => 'FORBIDDEN']));
            return $response->withStatus(403)->withHeader('Content-Type', 'application/json');
        }

        return $handler->handle($request);
    }
}
