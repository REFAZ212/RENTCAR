<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WhatsappLog;

class WhatsappLogPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }

    public function view(User $user, WhatsappLog $log): bool
    {
        return $this->viewAny($user);
    }

    public function retry(User $user, WhatsappLog $log): bool
    {
        return in_array($user->role, ['admin_utama', 'admin_operasional']);
    }
}
