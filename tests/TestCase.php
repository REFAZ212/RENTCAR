<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('activity_log');
        Schema::create('activity_log', function ($t) {
            $t->bigIncrements('id');
            $t->string('log_name')->nullable();
            $t->text('description');
            $t->nullableMorphs('subject', 'subject');
            $t->nullableMorphs('causer', 'causer');
            $t->json('properties')->nullable();
            $t->string('event')->nullable()->after('subject_type');
            $t->uuid('batch_uuid')->nullable()->after('properties');
            $t->timestamps();
            $t->index('log_name');
        });
    }
}
