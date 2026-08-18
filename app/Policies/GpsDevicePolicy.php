<?php

namespace App\Policies;

use App\Models\GpsDevice;
use App\Models\User;

class GpsDevicePolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function view(User $user, GpsDevice $gpsDevice): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function update(User $user, GpsDevice $gpsDevice): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function delete(User $user, GpsDevice $gpsDevice): bool
    {
        return $user->role === 'admin_utama';
    }
}
