<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Checks that the session has an authenticated user.
 * Attaches the user array to the request attribute 'user'.
 */
class AuthMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $user = $_SESSION['user'] ?? null;

        if (!$user) {
            $response = new Response();
            $response->getBody()->write(json_encode(['error' => 'UNAUTHENTICATED']));
            return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
        }

        return $handler->handle($request->withAttribute('user', $user));
    }
}
