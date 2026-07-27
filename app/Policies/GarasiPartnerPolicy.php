<?php

namespace App\Policies;

use App\Models\GarasiPartner;
use App\Models\User;

class GarasiPartnerPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function view(User $user, GarasiPartner $garasiPartner): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional', 'petugas']);
    }

    public function update(User $user, GarasiPartner $garasiPartner): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function delete(User $user, GarasiPartner $garasiPartner): bool
    {
        return $user->role === 'admin_utama';
    }
}
