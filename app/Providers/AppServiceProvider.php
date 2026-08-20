<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Semua policy hanya boleh dipanggil oleh pengguna staff (User).
        // Authenticatable lain (mis. SupirCalo) selalu ditolak — tanpa ini
        // type-hint User pada policy memunculkan TypeError (500) alih-alih 403.
        Gate::before(function ($user, $ability) {
            return $user instanceof User ? null : false;
        });
    }
}
