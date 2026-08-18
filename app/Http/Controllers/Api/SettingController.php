<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = Setting::getOvertimeSettings();

        return response()->json([
            'overtime_rate_per_hour' => $settings['rate'],
            'grace_period_minutes' => $settings['grace'],
            'biaya_dengan_driver_per_hari' => (float) Setting::get('biaya_dengan_driver_per_hari', Setting::DEFAULT_BIAYA_DENGAN_DRIVER_PER_HARI),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'overtime_rate_per_hour' => 'required|integer|min:0',
            'grace_period_minutes' => 'required|integer|min:0|max:60',
        ]);

        Setting::set('overtime_rate_per_hour', $validated['overtime_rate_per_hour']);
        Setting::set('grace_period_minutes', $validated['grace_period_minutes']);

        return response()->json(['message' => 'Pengaturan berhasil diperbarui.']);
    }
}
