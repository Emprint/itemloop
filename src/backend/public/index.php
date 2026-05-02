<?php

declare(strict_types=1);

use Slim\Factory\AppFactory;
use Slim\Routing\RouteCollectorProxy;
use App\Middleware\AuthMiddleware;
use App\Middleware\OptionalAuthMiddleware;
use App\Middleware\CsrfMiddleware;
use App\Middleware\EditorMiddleware;
use App\Middleware\AdminMiddleware;
use App\Middleware\PublicModeMiddleware;
use App\Controllers\AuthController;
use App\Controllers\ProductController;
use App\Controllers\ProductImageController;
use App\Controllers\LocationController;
use App\Controllers\UserController;
use App\Controllers\ProductCategoryController;
use App\Controllers\ProductConditionController;
use App\Controllers\ProductColorController;
use App\Controllers\DashboardController;
use App\Controllers\OrderController;
use App\Controllers\AppSettingsController;

require __DIR__ . '/../vendor/autoload.php';

// Load .env
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// Start session (must happen before any output)
ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
session_start();

// Bootstrap Slim
$app = AppFactory::create();
$app->addBodyParsingMiddleware(); // parses application/json, form-urlencoded, multipart
$app->addRoutingMiddleware();
// MethodOverrideMiddleware must be outermost (added last) so it rewrites the
// HTTP method *before* routing occurs (Slim middleware is LIFO).
$app->add(new \Slim\Middleware\MethodOverrideMiddleware());
$app->addErrorMiddleware(
    (bool) ($_ENV['APP_DEBUG'] ?? false),
    true,
    true
);

// ---------------------------------------------------------------------------
// CORS — allow Angular dev server and configured APP_URL
// ---------------------------------------------------------------------------
$app->add(function ($request, $handler) {
    $origin        = $request->getHeaderLine('Origin');
    $allowedOrigin = $_ENV['APP_URL'] ?? '';
    $devOrigin     = 'http://localhost:4200';

    $cors = ($origin === $devOrigin || $origin === $allowedOrigin) ? $origin : '';

    if ($request->getMethod() === 'OPTIONS') {
        $response = new \Slim\Psr7\Response();
        return $response
            ->withHeader('Access-Control-Allow-Origin', $cors)
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, X-XSRF-TOKEN, X-Http-Method-Override')
            ->withHeader('Access-Control-Allow-Credentials', 'true')
            ->withStatus(204);
    }

    $response = $handler->handle($request);
    return $response
        ->withHeader('Access-Control-Allow-Origin', $cors)
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->withHeader('Access-Control-Allow-Headers', 'Content-Type, X-XSRF-TOKEN, X-Http-Method-Override')
        ->withHeader('Access-Control-Allow-Credentials', 'true');
});

// ---------------------------------------------------------------------------
// CSRF middleware — applied globally, skips GET/HEAD/OPTIONS internally
// ---------------------------------------------------------------------------
$app->add(new CsrfMiddleware());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// CSRF cookie (Angular fetches this before any mutating request)
$app->get('/api/csrf-cookie', function ($request, $response) {
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    setcookie('XSRF-TOKEN', $token, [
        'path'     => '/',
        'samesite' => 'Lax',
        'httponly' => false, // Must be readable by JS
        'secure'   => isset($_SERVER['HTTPS']),
    ]);
    return $response->withStatus(204);
});

// App settings — GET is public; PUT is admin-only
$app->get('/api/settings', [AppSettingsController::class, 'getAll']);
$app->put('/api/settings', [AppSettingsController::class, 'update'])->add(new AdminMiddleware())->add(new AuthMiddleware());

// Auth
$app->group('/api/auth', function (RouteCollectorProxy $group) {
    $group->post('/register', [AuthController::class, 'register']);
    $group->post('/login',    [AuthController::class, 'login']);
    $group->get('/logout',    [AuthController::class, 'logout'])->add(new AuthMiddleware());
});

// Current user (session restore)
$app->get('/api/me', [AuthController::class, 'me'])->add(new AuthMiddleware());

// ---------------------------------------------------------------------------
// Products — public reads (when public_mode enabled), auth writes
// ---------------------------------------------------------------------------
$app->get('/api/products',         [ProductController::class, 'index'])->add(new PublicModeMiddleware())->add(new OptionalAuthMiddleware());
$app->get('/api/products/{id}',    [ProductController::class, 'show'])->add(new PublicModeMiddleware())->add(new OptionalAuthMiddleware());
$app->get('/api/product-categories', [ProductCategoryController::class, 'index']);
$app->get('/api/dashboard', [DashboardController::class, 'getStats'])->add(new PublicModeMiddleware())->add(new OptionalAuthMiddleware());

$app->group('/api', function (RouteCollectorProxy $group) {
    $group->post('/products',               [ProductController::class, 'store'])->add(new EditorMiddleware());
    $group->put('/products/{id}',           [ProductController::class, 'update'])->add(new EditorMiddleware());
    $group->delete('/products/{id}',        [ProductController::class, 'destroy'])->add(new EditorMiddleware());

    // Product images
    $group->post('/products/{id}/images',                    [ProductImageController::class, 'store'])->add(new EditorMiddleware());
    $group->patch('/products/{id}/images/reorder',           [ProductImageController::class, 'reorder'])->add(new EditorMiddleware());
    $group->delete('/products/{id}/images/{image_id}',       [ProductImageController::class, 'destroy'])->add(new EditorMiddleware());

    // Taxonomy
    $group->get('/product-conditions',  [ProductConditionController::class, 'index']);
    $group->post('/product-conditions', [ProductConditionController::class, 'store']);
    $group->get('/product-colors',      [ProductColorController::class, 'index']);
    $group->post('/product-colors',     [ProductColorController::class, 'store']);

    // Locations (editor+)
    $group->get('/buildings',       [LocationController::class, 'buildingsIndex']);
    $group->post('/buildings',      [LocationController::class, 'buildingsStore'])->add(new EditorMiddleware());
    $group->put('/buildings/{id}',  [LocationController::class, 'buildingsUpdate'])->add(new EditorMiddleware());
    $group->delete('/buildings/{id}', [LocationController::class, 'buildingsDestroy'])->add(new EditorMiddleware());

    $group->get('/zones',          [LocationController::class, 'zonesIndex']);
    $group->post('/zones',         [LocationController::class, 'zonesStore'])->add(new EditorMiddleware());
    $group->put('/zones/{id}',     [LocationController::class, 'zonesUpdate'])->add(new EditorMiddleware());
    $group->delete('/zones/{id}',  [LocationController::class, 'zonesDestroy'])->add(new EditorMiddleware());

    $group->get('/locations',          [LocationController::class, 'index']);
    $group->post('/locations',         [LocationController::class, 'store'])->add(new EditorMiddleware());
    $group->put('/locations/{id}',     [LocationController::class, 'update'])->add(new EditorMiddleware());
    $group->delete('/locations/{id}',  [LocationController::class, 'destroy'])->add(new EditorMiddleware());

    // Users — admin only
    $group->get('/users',           [UserController::class, 'index'])->add(new AdminMiddleware());
    $group->post('/users/save',     [UserController::class, 'save'])->add(new AdminMiddleware());
    $group->post('/users/delete',   [UserController::class, 'delete'])->add(new AdminMiddleware());

    // Orders — place order (any auth user); manage (editor+)
    $group->post('/orders',                    [OrderController::class, 'store']);
    $group->get('/orders/mine',               [OrderController::class, 'mine']);
    $group->get('/orders',                    [OrderController::class, 'index'])->add(new EditorMiddleware());
    $group->patch('/orders/{id}/status',      [OrderController::class, 'updateStatus'])->add(new EditorMiddleware());
})->add(new AuthMiddleware());

$app->run();
