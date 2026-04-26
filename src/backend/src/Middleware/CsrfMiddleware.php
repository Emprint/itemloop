<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

/**
 * Validates the XSRF-TOKEN on state-changing requests (POST, PUT, DELETE, PATCH).
 * Skips GET and OPTIONS. Matches the token in the X-XSRF-TOKEN header against
 * the value stored in the session — identical to what Laravel Sanctum does.
 */
class CsrfMiddleware implements MiddlewareInterface
{
    private const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $method = strtoupper($request->getMethod());

        if (in_array($method, self::SAFE_METHODS, true)) {
            return $handler->handle($request);
        }

        $headerToken  = $request->getHeaderLine('X-XSRF-TOKEN');
        $sessionToken = $_SESSION['csrf_token'] ?? null;

        if (!$sessionToken || !hash_equals($sessionToken, $headerToken)) {
            $response = new Response();
            $response->getBody()->write(json_encode(['error' => 'CSRF_TOKEN_MISMATCH']));
            return $response->withStatus(419)->withHeader('Content-Type', 'application/json');
        }

        return $handler->handle($request);
    }
}
