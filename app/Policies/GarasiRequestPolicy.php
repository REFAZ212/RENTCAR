<?php

namespace App\Policies;

use App\Models\GarasiRequest;
use App\Models\User;

class GarasiRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function view(User $user, GarasiRequest $garasiRequest): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function update(User $user, GarasiRequest $garasiRequest): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function delete(User $user, GarasiRequest $garasiRequest): bool
    {
        return $user->role === 'admin_utama';
    }
}
