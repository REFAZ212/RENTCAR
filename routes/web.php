<?php

use App\Http\Controllers\GarasiResponseController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('http://localhost:5173');
});

Route::get('/garasi/{token}', [GarasiResponseController::class, 'show'])->name('garasi-response.show');
Route::post('/garasi/{token}', [GarasiResponseController::class, 'submit'])->name('garasi-response.submit');
