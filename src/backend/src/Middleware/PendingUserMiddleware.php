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

        if ($user && ($user['status'] ?? 'active') === 'pending') {
            $response = new \Slim\Psr7\Response();
            $response->getBody()->write(json_encode([
                'error'   => 'ACCOUNT_PENDING',
                'message' => 'Your account is pending administrator approval.',
            ]));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(403);
        }

        return $handler->handle($request);
    }
}