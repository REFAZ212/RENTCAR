<?php

namespace App\Policies;

use App\Models\SupirCalo;
use App\Models\User;

class SupirCaloPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function view(User $user, SupirCalo $supirCalo): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function update(User $user, SupirCalo $supirCalo): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function delete(User $user, SupirCalo $supirCalo): bool
    {
        return $user->role === 'admin_utama';
    }
}
