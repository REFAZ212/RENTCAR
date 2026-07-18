<?php

use App\Console\Commands\GarasiCheckTimeout;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command(GarasiCheckTimeout::class)->everyMinute();
