<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GarasiPartnerController;
use App\Http\Controllers\Api\GarasiRequestController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\KatalogOrderRequestController;
use App\Http\Controllers\Api\KatalogPublicController;
use App\Http\Controllers\Api\KategoriController;
use App\Http\Controllers\Api\KendaraanController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PengaturanController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\SupirCaloController;
use App\Http\Controllers\Api\TipeController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::get('/katalog', [KatalogPublicController::class, 'index'])->middleware('throttle:120,1');
Route::get('/katalog/kategoris', [KatalogPublicController::class, 'kategoris'])->middleware('throttle:120,1');
Route::get('/katalog/tipes', [KatalogPublicController::class, 'tipes'])->middleware('throttle:120,1');
Route::post('/katalog/order-request', [KatalogOrderRequestController::class, 'store'])->middleware('throttle:5,1');
Route::get('/katalog/{kendaraan}', [KatalogPublicController::class, 'show'])->middleware('throttle:120,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/chart', [DashboardController::class, 'chart']);

    Route::get('/garasi-saya', [GarasiPartnerController::class, 'garasiSaya']);
    Route::apiResource('garasi-partners', GarasiPartnerController::class);
    Route::apiResource('kendaraans', KendaraanController::class)->middleware('throttle:60,1');
    Route::apiResource('customers', CustomerController::class)->middleware('throttle:60,1');
    Route::apiResource('orders', OrderController::class)->middleware('throttle:60,1');
    Route::get('/orders/{order}/invoice', [InvoiceController::class, 'download']);
    Route::apiResource('garasi-requests', GarasiRequestController::class)->middleware('throttle:60,1');
    Route::apiResource('kategoris', KategoriController::class);
    Route::apiResource('tipes', TipeController::class);
    Route::get('/tipes/{tipe}/kendaraans', [TipeController::class, 'kendaraans']);
    Route::apiResource('supir-calos', SupirCaloController::class)->middleware('throttle:60,1');

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    Route::prefix('laporan')->group(function () {
        Route::get('ringkasan', [ReportController::class, 'ringkasan']);
        Route::get('pendapatan', [ReportController::class, 'pendapatan']);
        Route::get('kendaraan', [ReportController::class, 'kendaraan']);
        Route::get('customer', [ReportController::class, 'customer']);
        Route::get('order', [ReportController::class, 'order']);
        Route::get('bagi-hasil', [ReportController::class, 'bagiHasil']);
        Route::get('komisi-calo', [ReportController::class, 'komisiCalo']);

        Route::get('export/{type}/{format}', [ReportController::class, 'export'])->middleware('throttle:5,1');
    });

    Route::middleware('role:admin_utama')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::get('/activity-log', [ActivityLogController::class, 'index']);

        Route::get('/settings', [SettingController::class, 'show']);
        Route::patch('/settings', [SettingController::class, 'update']);

        Route::prefix('pengaturan')->group(function () {
            Route::get('/profil', [PengaturanController::class, 'getProfil']);
            Route::post('/profil', [PengaturanController::class, 'updateProfil']);
            Route::put('/password', [PengaturanController::class, 'updatePassword']);
            Route::get('/bisnis', [PengaturanController::class, 'getBisnis']);
            Route::post('/bisnis', [PengaturanController::class, 'updateBisnis']);
            Route::get('/harga', [PengaturanController::class, 'getHarga']);
            Route::put('/harga', [PengaturanController::class, 'updateHarga']);
            Route::get('/notifikasi', [PengaturanController::class, 'getNotifikasi']);
            Route::put('/notifikasi', [PengaturanController::class, 'updateNotifikasi']);
            Route::post('/notifikasi/test', [PengaturanController::class, 'testNotifikasi']);
            Route::get('/sistem', [PengaturanController::class, 'getSistem']);
            Route::put('/sistem', [PengaturanController::class, 'updateSistem']);
            Route::get('/backup', [PengaturanController::class, 'backup']);
        });
    });
});
