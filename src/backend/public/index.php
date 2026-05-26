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
use App\Middleware\PendingUserMiddleware;
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
use App\Controllers\EmailLogController;
use App\Controllers\ExportController;

require __DIR__ . '/../vendor/autoload.php';

// Load .env
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// Start session (must happen before any output)
ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_secure', isset($_SERVER['HTTPS']) ? '1' : '0');
ini_set('session.cookie_samesite', 'Lax');
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
    $devOrigin     = ($_ENV['APP_ENV'] ?? 'production') === 'local' ? 'http://localhost:4200' : '';

    $cors = ($devOrigin && $origin === $devOrigin) || $origin === $allowedOrigin ? $origin : '';

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
// Security response headers
// ---------------------------------------------------------------------------
$app->add(function ($request, $handler) {
    $response = $handler->handle($request);
    return $response
        ->withHeader('X-Content-Type-Options', 'nosniff')
        ->withHeader('X-Frame-Options', 'DENY')
        ->withHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
});

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
$app->get('/api/admin/email-logs', [EmailLogController::class, 'index'])->add(new AdminMiddleware())->add(new AuthMiddleware());

// Export (editor+)
$app->get('/api/export/products.pdf', [ExportController::class, 'productsPdf'])->add(new EditorMiddleware())->add(new AuthMiddleware());
$app->get('/api/export/orders.pdf',   [ExportController::class, 'ordersPdf'])->add(new EditorMiddleware())->add(new AuthMiddleware());

// Auth
$app->group('/api/auth', function (RouteCollectorProxy $group) {
    $group->post('/register',        [AuthController::class, 'register']);
    $group->post('/login',           [AuthController::class, 'login']);
    $group->post('/logout',          [AuthController::class, 'logout'])->add(new AuthMiddleware());
    $group->post('/forgot-password', [AuthController::class, 'forgotPassword']);
    $group->post('/reset-password',  [AuthController::class, 'resetPassword']);
});

// Current user (session restore)
$app->get('/api/me', [AuthController::class, 'me'])->add(new AuthMiddleware());

// User profile (self-service — any authenticated user)
$app->get('/api/me/profile',          [UserController::class, 'getProfile'])->add(new AuthMiddleware());
$app->patch('/api/me/profile',        [UserController::class, 'updateProfile'])->add(new AuthMiddleware());
$app->post('/api/me/change-password', [UserController::class, 'changePassword'])->add(new AuthMiddleware());

// ---------------------------------------------------------------------------
// Products — public reads (when public_mode enabled), auth writes
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
    $group->get('/products/{id}/history',                    [ProductController::class, 'getHistory'])->add(new EditorMiddleware());
    $group->post('/products/{id}/stock-movement',            [ProductController::class, 'createStockMovement'])->add(new EditorMiddleware());

    // Taxonomy (editor+)
    $group->post('/product-categories',          [ProductCategoryController::class, 'store'])->add(new EditorMiddleware());
    $group->put('/product-categories/{id}',      [ProductCategoryController::class, 'update'])->add(new EditorMiddleware());
    $group->delete('/product-categories/{id}',   [ProductCategoryController::class, 'destroy'])->add(new EditorMiddleware());
    $group->get('/product-conditions',           [ProductConditionController::class, 'index']);
    $group->post('/product-conditions',          [ProductConditionController::class, 'store'])->add(new EditorMiddleware());
    $group->put('/product-conditions/{id}',      [ProductConditionController::class, 'update'])->add(new EditorMiddleware());
    $group->delete('/product-conditions/{id}',   [ProductConditionController::class, 'destroy'])->add(new EditorMiddleware());
    $group->get('/product-colors',               [ProductColorController::class, 'index']);
    $group->post('/product-colors',              [ProductColorController::class, 'store'])->add(new EditorMiddleware());
    $group->put('/product-colors/{id}',          [ProductColorController::class, 'update'])->add(new EditorMiddleware());
    $group->delete('/product-colors/{id}',       [ProductColorController::class, 'destroy'])->add(new EditorMiddleware());

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
    $group->get('/users/pending',         [UserController::class, 'pending'])->add(new AdminMiddleware());
    $group->get('/users/pending/count', [UserController::class, 'pendingCount'])->add(new AdminMiddleware());
    $group->patch('/users/{id}/validate', [UserController::class, 'validate'])->add(new AdminMiddleware());
    $group->patch('/users/{id}/deactivate', [UserController::class, 'deactivate'])->add(new AdminMiddleware());

    // Orders — place order (any auth user); manage (editor+)
    $group->post('/orders',                    [OrderController::class, 'store']);
    $group->get('/orders/mine',               [OrderController::class, 'mine']);
    $group->get('/orders',                    [OrderController::class, 'index'])->add(new EditorMiddleware());
    $group->patch('/orders/{id}/status',      [OrderController::class, 'updateStatus'])->add(new EditorMiddleware());
})->add(new PendingUserMiddleware())->add(new AuthMiddleware());

$app->run();
