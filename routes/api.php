<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GarasiPartnerController;
use App\Http\Controllers\Api\GarasiRequestController;
use App\Http\Controllers\Api\KatalogPublicController;
use App\Http\Controllers\Api\KategoriController;
use App\Http\Controllers\Api\KendaraanController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\TipeController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::get('/katalog', [KatalogPublicController::class, 'index']);
Route::get('/katalog/kategoris', [KatalogPublicController::class, 'kategoris']);
Route::get('/katalog/tipes', [KatalogPublicController::class, 'tipes']);
Route::get('/katalog/{kendaraan}', [KatalogPublicController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::get('/garasi-saya', [GarasiPartnerController::class, 'garasiSaya']);
    Route::apiResource('garasi-partners', GarasiPartnerController::class);
    Route::apiResource('kendaraans', KendaraanController::class);
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('orders', OrderController::class);
    Route::apiResource('garasi-requests', GarasiRequestController::class);
    Route::apiResource('kategoris', KategoriController::class);
    Route::apiResource('tipes', TipeController::class);

    Route::prefix('laporan')->group(function () {
        Route::get('ringkasan', [ReportController::class, 'ringkasan']);
        Route::get('pendapatan', [ReportController::class, 'pendapatan']);
        Route::get('kendaraan', [ReportController::class, 'kendaraan']);
        Route::get('customer', [ReportController::class, 'customer']);
        Route::get('order', [ReportController::class, 'order']);

        Route::get('export/{type}/{format}', [ReportController::class, 'export']);
    });
});
