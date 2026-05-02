<?php

namespace App\Middleware;

use App\Controllers\AppSettingsController;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Blocks anonymous access to product routes when public_mode is disabled.
 * Authenticated users (editor+) are always allowed through.
 */
class PublicModeMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $user = $_SESSION['user'] ?? null;

        // Authenticated users with editor+ roles bypass the check
        if ($user && in_array($user['role'] ?? '', ['admin', 'editor', 'member'], true)) {
            return $handler->handle($request);
        }

        // Anonymous access — check public_mode
        if (!AppSettingsController::isEnabled('public_mode', true)) {
            $response = new \Slim\Psr7\Response();
            $response->getBody()->write(json_encode(['error' => 'APP_NOT_PUBLIC']));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(403);
        }

        return $handler->handle($request);
    }
}
