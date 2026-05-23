<?php

namespace App\Middleware;

use App\Database;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Checks that the session has an authenticated user.
 * Re-fetches user from DB on each request so role/status changes take effect immediately.
 * Attaches the fresh user array to the request attribute 'user'.
 */
class AuthMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $sessionUser = $_SESSION['user'] ?? null;

        if (!$sessionUser) {
            $response = new Response();
            $response->getBody()->write(json_encode(['error' => 'UNAUTHENTICATED']));
            return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
        }

        // Re-fetch from DB to ensure role/status changes are immediately enforced
        $stmt = Database::get()->prepare('SELECT id, name, email, role, status, last_login FROM users WHERE id = ?');
        $stmt->execute([$sessionUser['id']]);
        $user = $stmt->fetch();

        if (!$user) {
            // User was deleted — clear the session
            $_SESSION = [];
            session_destroy();
            $response = new Response();
            $response->getBody()->write(json_encode(['error' => 'UNAUTHENTICATED']));
            return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
        }

        // Keep session in sync
        $_SESSION['user'] = $user;

        return $handler->handle($request->withAttribute('user', $user));
    }
}
