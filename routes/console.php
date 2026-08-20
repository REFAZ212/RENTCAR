<?php

use App\Console\Commands\BackupDatabase;
use App\Console\Commands\GarasiCheckTimeout;
use App\Console\Commands\GpsCleanup;
use App\Console\Commands\NotifyReturnTask;
use App\Console\Commands\OrderCancelNoPickup;
use App\Console\Commands\OrderCheckClaimTimeout;
use App\Console\Commands\OrderExpirePending;
use App\Console\Commands\OrderReminderH1;
use App\Console\Commands\OrderReminderPayment;
use App\Console\Commands\OrderReminderVerifikasi;
use App\Console\Commands\OrderVerifyOverdue;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command(GarasiCheckTimeout::class)->everyMinute();
Schedule::command(OrderCheckClaimTimeout::class)->everyMinute();
Schedule::command(NotifyReturnTask::class)->everyThirtyMinutes();
Schedule::command(OrderExpirePending::class)->everyMinute();
Schedule::command(OrderCancelNoPickup::class)->everyMinute();
Schedule::command(OrderVerifyOverdue::class)->everyFifteenMinutes();
Schedule::command(OrderReminderH1::class)->dailyAt('08:00');
Schedule::command(OrderReminderPayment::class)->dailyAt('09:00');
Schedule::command(OrderReminderVerifikasi::class)->dailyAt('09:00');
Schedule::command(GpsCleanup::class)->dailyAt('03:00');
Schedule::command(BackupDatabase::class)->dailyAt('02:00');
