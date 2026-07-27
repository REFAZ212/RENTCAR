<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $customers = DB::table('customers')->select('id', 'no_hp')->get();

        foreach ($customers as $customer) {
            if (! $customer->no_hp) {
                continue;
            }
            $normalized = preg_replace('/[^0-9]/', '', $customer->no_hp);
            if (str_starts_with($normalized, '0')) {
                $normalized = '62'.substr($normalized, 1);
            } elseif (str_starts_with($normalized, '8')) {
                $normalized = '62'.$normalized;
            }
            if ($normalized !== $customer->no_hp) {
                DB::table('customers')
                    ->where('id', $customer->id)
                    ->update(['no_hp' => $normalized]);
            }
        }
    }

    public function down(): void
    {
        // Normalisasi bersifat idempoten — tidak perlu di-rollback.
    }
};
