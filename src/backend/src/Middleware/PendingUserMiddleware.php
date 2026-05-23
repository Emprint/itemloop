<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class PendingUserMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $user = $_SESSION['user'] ?? null;

        if ($user && in_array($user['status'] ?? 'active', ['pending', 'deactivated'])) {
            $response = new \Slim\Psr7\Response();
            $response->getBody()->write(json_encode([
                'error'   => $user['status'] === 'pending' ? 'ACCOUNT_PENDING' : 'ACCOUNT_DEACTIVATED',
                'message' => $user['status'] === 'pending'
                    ? 'Your account is pending administrator approval.'
                    : 'Your account has been deactivated.',
            ]));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(403);
        }

        return $handler->handle($request);
    }
}