<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\SupirCalo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Notification::class);

        $notifications = Notification::where(function ($q) {
            $q->where('user_id', auth()->id())->orWhereNull('user_id');
        })->orderBy('created_at', 'desc')
            ->paginate(min((int) $request->input('per_page', 20), 50));

        return response()->json($notifications);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        abort_if($request->user() instanceof SupirCalo, 403, 'Akses ditolak. Anda tidak memiliki izin yang cukup.');

        $count = Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')->count();

        return response()->json(['count' => $count]);
    }

    public function markAsRead(Notification $notification): JsonResponse
    {
        $this->authorize('update', $notification);

        $notification->markAsRead();

        return response()->json(['message' => 'Notifikasi ditandai sudah dibaca']);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        abort_if($request->user() instanceof SupirCalo, 403, 'Akses ditolak. Anda tidak memiliki izin yang cukup.');

        Notification::where('user_id', auth()->id())
            ->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['message' => 'Semua notifikasi ditandai sudah dibaca']);
    }
}
