<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DriverTaskController;
use App\Http\Controllers\Api\GarasiPartnerController;
use App\Http\Controllers\Api\GarasiRequestController;
use App\Http\Controllers\Api\GpsController;
use App\Http\Controllers\Api\InspeksiKendaraanController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\KatalogOrderRequestController;
use App\Http\Controllers\Api\KatalogPublicController;
use App\Http\Controllers\Api\KategoriController;
use App\Http\Controllers\Api\KendaraanController;
use App\Http\Controllers\Api\MobileTaskController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PengaturanController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\SupirAuthController;
use App\Http\Controllers\Api\SupirCaloController;
use App\Http\Controllers\Api\TipeController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WhatsAppLogController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/supir/login', [SupirAuthController::class, 'login'])->middleware('throttle:10,1');

Route::get('/katalog', [KatalogPublicController::class, 'index'])->middleware('throttle:120,1');
Route::get('/katalog/kategoris', [KatalogPublicController::class, 'kategoris'])->middleware('throttle:120,1');
Route::get('/katalog/tipes', [KatalogPublicController::class, 'tipes'])->middleware('throttle:120,1');
Route::post('/katalog/order-request', [KatalogOrderRequestController::class, 'store'])->middleware('throttle:5,1');
Route::get('/katalog/{kendaraan}', [KatalogPublicController::class, 'show'])->middleware('throttle:120,1');

Route::post('/gps/push', [GpsController::class, 'push'])->middleware('throttle:60,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::post('/supir/logout', [SupirAuthController::class, 'logout']);
    Route::get('/supir/me', [SupirAuthController::class, 'me']);
    Route::post('/supir/ubah-password', [SupirAuthController::class, 'ubahPassword']);
    Route::post('/supir/fcm-token', [SupirAuthController::class, 'updateFcmToken']);

    // Aplikasi mobile supir (Flutter) — khusus akun supir.
    Route::middleware('supir')->prefix('mobile')->group(function () {
        Route::get('/tasks/available', [MobileTaskController::class, 'available']);
        Route::get('/tasks/my-active', [MobileTaskController::class, 'myActive']);
        Route::get('/tasks/{task}', [MobileTaskController::class, 'show']);
        Route::post('/tasks/{task}/accept', [MobileTaskController::class, 'accept']);
        Route::post('/tasks/{task}/start', [MobileTaskController::class, 'startInspectionBefore']);
        Route::post('/tasks/{task}/start-delivery', [MobileTaskController::class, 'startDelivery'])->middleware('throttle:20,1');
        Route::post('/tasks/{task}/arrive', [MobileTaskController::class, 'arrive']);
        Route::post('/tasks/{task}/complete', [MobileTaskController::class, 'complete']);
        Route::post('/tasks/{task}/inspection/before', [MobileTaskController::class, 'inspectionBefore'])->middleware('throttle:20,1');
        Route::post('/tasks/{task}/inspection/after', [MobileTaskController::class, 'inspectionAfter'])->middleware('throttle:20,1');
        Route::post('/sync-media', [MobileTaskController::class, 'syncMedia']);

        Route::get('/notifications', [MobileTaskController::class, 'notifications']);
        Route::get('/notifications/unread-count', [MobileTaskController::class, 'unreadCount']);
        Route::patch('/notifications/{notification}/read', [MobileTaskController::class, 'markNotificationRead']);
    });

    // Kelola tugas supir dari dashboard admin.
    Route::middleware('role:admin_utama,admin_operasional')->group(function () {
        Route::get('/driver-tasks', [DriverTaskController::class, 'index']);
        Route::post('/driver-tasks', [DriverTaskController::class, 'store']);
        Route::get('/driver-tasks/{task}', [DriverTaskController::class, 'show']);
        Route::post('/driver-tasks/{task}/cancel', [DriverTaskController::class, 'cancel']);
    });

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/chart', [DashboardController::class, 'chart']);

    Route::get('/garasi-saya', [GarasiPartnerController::class, 'garasiSaya']);
    Route::apiResource('garasi-partners', GarasiPartnerController::class);
    Route::apiResource('kendaraans', KendaraanController::class)->middleware('throttle:60,1');
    Route::apiResource('customers', CustomerController::class)->withTrashed()->middleware('throttle:60,1');
    Route::post('/customers/{customer}/restore', [CustomerController::class, 'restore'])->withTrashed()->middleware('throttle:60,1');
    Route::apiResource('orders', OrderController::class)->middleware('throttle:60,1');
    Route::get('/orders/{order}/invoice', [InvoiceController::class, 'download']);
    Route::get('/orders/{order}/cancel-preview', [OrderController::class, 'cancelPreview']);
    Route::apiResource('garasi-requests', GarasiRequestController::class)->middleware('throttle:60,1');
    Route::apiResource('kategoris', KategoriController::class);
    Route::apiResource('tipes', TipeController::class);
    Route::get('/tipes/{tipe}/kendaraans', [TipeController::class, 'kendaraans']);
    Route::apiResource('supir-calos', SupirCaloController::class)->middleware('throttle:60,1');
    Route::apiResource('inspeksi-kendaraans', InspeksiKendaraanController::class)->middleware('throttle:60,1');
    Route::post('/inspeksi-kendaraans/{inspeksi}/perbaiki-ttd', [InspeksiKendaraanController::class, 'perbaikiTtd'])->middleware('throttle:20,1');
    Route::get('/orders/{order}/inspeksi', [InspeksiKendaraanController::class, 'byOrder']);
    Route::get('/inspeksi-tasks', [InspeksiKendaraanController::class, 'tasks']);
    Route::post('/orders/{order}/kirim', [InspeksiKendaraanController::class, 'kirimKendaraan'])->middleware('throttle:20,1');
    Route::post('/orders/{order}/kembali', [InspeksiKendaraanController::class, 'kembalikanKendaraan'])->middleware('throttle:20,1');

    Route::get('/gps/latest', [GpsController::class, 'latest']);
    Route::get('/gps/kendaraans/{kendaraan}/history', [GpsController::class, 'history']);
    Route::apiResource('gps-devices', GpsController::class)->except(['create', 'edit'])->middleware('throttle:60,1');

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    Route::get('/whatsapp-logs', [WhatsAppLogController::class, 'index']);
    Route::post('/whatsapp-logs/{log}/retry', [WhatsAppLogController::class, 'retry']);

    Route::middleware('role:admin_utama,admin_operasional')->prefix('laporan')->group(function () {
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
