<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ScratchColumnCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_opsi_supir_column_exists(): void
    {
        $columns = Schema::getColumnListing('orders');
        $this->assertTrue(in_array('opsi_supir', $columns, true), 'opsi_supir tidak ada: '.implode(',', $columns));
    }
}
