<?php

use App\Console\Commands\GarasiCheckTimeout;
use App\Console\Commands\OrderReminderH1;
use App\Console\Commands\OrderReminderPayment;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command(GarasiCheckTimeout::class)->everyMinute();
Schedule::command(OrderReminderH1::class)->dailyAt('08:00');
Schedule::command(OrderReminderPayment::class)->dailyAt('09:00');
