<?php

use App\Console\Commands\BackupDatabase;
use App\Console\Commands\GarasiCheckTimeout;
use App\Console\Commands\GpsCleanup;
use App\Console\Commands\NotifyReturnTask;
use App\Console\Commands\OrderCancelNoPickup;
use App\Console\Commands\OrderExpirePending;
use App\Console\Commands\OrderReminderH1;
use App\Console\Commands\OrderReminderPayment;
use App\Console\Commands\OrderReminderVerifikasi;
use App\Console\Commands\OrderVerifyOverdue;
use App\Console\Commands\ReleaseStaleDriverTasks;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command(GarasiCheckTimeout::class)->everyMinute()->withoutOverlapping();
Schedule::command(NotifyReturnTask::class)->everyThirtyMinutes()->withoutOverlapping();
Schedule::command(OrderExpirePending::class)->everyMinute()->withoutOverlapping();
Schedule::command(OrderCancelNoPickup::class)->everyMinute()->withoutOverlapping();
Schedule::command(OrderVerifyOverdue::class)->everyFifteenMinutes()->withoutOverlapping();
Schedule::command(ReleaseStaleDriverTasks::class)->everyFifteenMinutes()->withoutOverlapping();
Schedule::command(OrderReminderH1::class)->dailyAt('08:00')->withoutOverlapping();
Schedule::command(OrderReminderPayment::class)->dailyAt('09:00')->withoutOverlapping();
Schedule::command(OrderReminderVerifikasi::class)->dailyAt('09:00')->withoutOverlapping();
Schedule::command(GpsCleanup::class)->dailyAt('03:00')->withoutOverlapping();
Schedule::command(BackupDatabase::class)->dailyAt('02:00')->withoutOverlapping();
