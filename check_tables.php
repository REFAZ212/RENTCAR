<?php

require __DIR__.'/vendor/autoload.php';

$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$tables = DB::select('SHOW TABLES');
echo "Tables in database:\n";
foreach ($tables as $t) {
    $name = $t->Tables_in_rentcar;
    echo "  - $name\n";
}
