<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\ProductImageController;
use App\Http\Controllers\Api\UserController;

Route::prefix('auth')->as('auth.')->group(function() {
    Route::post('login', [AuthController::class, 'login'])->name('login');
    Route::post('register', [AuthController::class, 'register'])->name('register');
    Route::middleware('auth:sanctum')->get('logout', [AuthController::class, 'logout'])->name('logout');
});

// Public product listing and details
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
// Public product categories
Route::get('/product-categories', [\App\Http\Controllers\Api\ProductCategoryController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    // Product conditions
    Route::get('/product-conditions', [\App\Http\Controllers\Api\ProductConditionController::class, 'index']);
    Route::post('/product-conditions', [\App\Http\Controllers\Api\ProductConditionController::class, 'store']);

    // Product colors
    Route::get('/product-colors', [\App\Http\Controllers\Api\ProductColorController::class, 'index']);
    Route::post('/product-colors', [\App\Http\Controllers\Api\ProductColorController::class, 'store']);
    // User management (admin only)
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users/save', [UserController::class, 'save']);
    Route::post('/users/delete', [UserController::class, 'delete']);

    // Get me to reactivate session
    Route::get('/me', [AuthController::class, 'me']);

    // Products management
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // Product images
    Route::post('/products/{id}/images', [ProductImageController::class, 'store']);
    Route::delete('/products/{id}/images/{image_id}', [ProductImageController::class, 'destroy']);

    // Buildings management
    Route::get('/buildings', [LocationController::class, 'buildingsIndex']);
    Route::post('/buildings', [LocationController::class, 'buildingsStore']);
    Route::put('/buildings/{id}', [LocationController::class, 'buildingsUpdate']);
    Route::delete('/buildings/{id}', [LocationController::class, 'buildingsDestroy']);

    // Zones management
    Route::get('/zones', [LocationController::class, 'zonesIndex']);
    Route::post('/zones', [LocationController::class, 'zonesStore']);
    Route::put('/zones/{id}', [LocationController::class, 'zonesUpdate']);
    Route::delete('/zones/{id}', [LocationController::class, 'zonesDestroy']);

    // Locations management
    Route::get('/locations', [LocationController::class, 'index']);
    Route::post('/locations', [LocationController::class, 'store']);
    Route::put('/locations/{id}', [LocationController::class, 'update']);
    Route::delete('/locations/{id}', [LocationController::class, 'destroy']);
});
