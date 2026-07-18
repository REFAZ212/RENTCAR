<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Kendaraan;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\CSV\Writer as CsvWriter;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;

class ExportController extends Controller
{
    public function export(Request $request, string $type, string $format): Response|never
    {
        if (! in_array($format, ['csv', 'xlsx'])) {
            abort(422, 'Format tidak didukung. Gunakan csv atau xlsx.');
        }

        return match ($type) {
            'pendapatan' => $this->pendapatan($request, $format),
            'kendaraan' => $this->kendaraan($request, $format),
            'customer' => $this->customer($request, $format),
            'order' => $this->order($request, $format),
            'ringkasan' => $this->ringkasan($request, $format),
            default => abort(404),
        };
    }

    private function pendapatan(Request $request, string $format): Response
    {
        $start = $request->start_date ? Carbon::parse($request->start_date)->startOfDay() : Carbon::now()->startOfMonth();
        $end = $request->end_date ? Carbon::parse($request->end_date)->endOfDay() : Carbon::now()->endOfMonth();

        $orders = Order::with(['customer', 'kendaraan'])
            ->whereBetween('created_at', [$start, $end])
            ->where('status_pembayaran', 'paid')
            ->orderBy('created_at')
            ->get();

        $headers = ['Kode Order', 'Customer', 'Kendaraan', 'Plat Nomor', 'Tanggal Mulai', 'Tanggal Selesai', 'Durasi (Hari)', 'Harga/Hari', 'Total', 'Denda', 'Metode Bayar', 'Tanggal Order'];
        $rows = $orders->map(fn ($o) => [
            $o->kode_order,
            $o->customer?->nama_lengkap ?? '-',
            $o->kendaraan?->nama_kendaraan ?? '-',
            $o->kendaraan?->plat_nomor ?? '-',
            $o->tanggal_mulai?->toDateString() ?? '-',
            $o->tanggal_selesai?->toDateString() ?? '-',
            $o->durasi_hari,
            (float) $o->harga_per_hari,
            (float) $o->harga_total,
            (float) $o->denda_overtime,
            $o->metode_pembayaran ?? '-',
            $o->created_at->toDateString(),
        ]);

        return $this->writeExport($format, 'laporan-pendapatan', $headers, $rows);
    }

    public function kendaraan(Request $request, string $format): Response
    {
        $start = $request->start_date ? Carbon::parse($request->start_date)->startOfDay() : Carbon::now()->startOfMonth();
        $end = $request->end_date ? Carbon::parse($request->end_date)->endOfDay() : Carbon::now()->endOfMonth();

        $kendaraans = Kendaraan::withCount(['orders' => function ($q) use ($start, $end) {
            $q->whereBetween('created_at', [$start, $end]);
        }])
            ->withSum(['orders' => function ($q) use ($start, $end) {
                $q->where('status_pembayaran', 'paid')->whereBetween('created_at', [$start, $end]);
            }], 'harga_total')
            ->orderBy('orders_count', 'desc')
            ->get();

        $headers = ['Nama Kendaraan', 'Plat Nomor', 'Merek', 'Model', 'Tahun', 'Status', 'Total Order', 'Total Pendapatan'];
        $rows = $kendaraans->map(fn ($k) => [
            $k->nama_kendaraan,
            $k->plat_nomor,
            $k->merek,
            $k->model,
            $k->tahun,
            $k->status,
            $k->orders_count,
            (float) ($k->orders_sum_harga_total ?? 0),
        ]);

        return $this->writeExport($format, 'laporan-kendaraan', $headers, $rows);
    }

    public function customer(Request $request, string $format): Response
    {
        $start = $request->start_date ? Carbon::parse($request->start_date)->startOfDay() : Carbon::now()->startOfMonth();
        $end = $request->end_date ? Carbon::parse($request->end_date)->endOfDay() : Carbon::now()->endOfMonth();

        $customers = Customer::withCount(['orders' => function ($q) use ($start, $end) {
            $q->whereBetween('created_at', [$start, $end]);
        }])
            ->withSum(['orders' => function ($q) use ($start, $end) {
                $q->where('status_pembayaran', 'paid')->whereBetween('created_at', [$start, $end]);
            }], 'harga_total')
            ->orderBy('orders_count', 'desc')
            ->get();

        $headers = ['Nama', 'No. HP', 'Email', 'Total Order', 'Total Pengeluaran'];
        $rows = $customers->map(fn ($c) => [
            $c->nama_lengkap,
            $c->no_hp,
            $c->email ?? '-',
            $c->orders_count,
            (float) ($c->orders_sum_harga_total ?? 0),
        ]);

        return $this->writeExport($format, 'laporan-customer', $headers, $rows);
    }

    public function order(Request $request, string $format): Response
    {
        $start = $request->start_date ? Carbon::parse($request->start_date)->startOfDay() : Carbon::now()->startOfMonth();
        $end = $request->end_date ? Carbon::parse($request->end_date)->endOfDay() : Carbon::now()->endOfMonth();

        $orders = Order::with(['customer', 'kendaraan'])
            ->whereBetween('created_at', [$start, $end])
            ->orderBy('created_at', 'desc')
            ->get();

        $headers = ['Kode Order', 'Customer', 'No. HP', 'Kendaraan', 'Plat Nomor', 'Tanggal Mulai', 'Tanggal Selesai', 'Durasi', 'Harga Total', 'Denda', 'Status Order', 'Status Bayar', 'Metode Bayar', 'Status Pengiriman', 'Tanggal Order'];
        $rows = $orders->map(fn ($o) => [
            $o->kode_order,
            $o->customer?->nama_lengkap ?? '-',
            $o->customer?->no_hp ?? '-',
            $o->kendaraan?->nama_kendaraan ?? '-',
            $o->kendaraan?->plat_nomor ?? '-',
            $o->tanggal_mulai?->toDateString() ?? '-',
            $o->tanggal_selesai?->toDateString() ?? '-',
            $o->durasi_hari,
            (float) $o->harga_total,
            (float) $o->denda_overtime,
            $o->status_order,
            $o->status_pembayaran,
            $o->metode_pembayaran ?? '-',
            $o->status_pengiriman,
            $o->created_at->toDateString(),
        ]);

        return $this->writeExport($format, 'laporan-order', $headers, $rows);
    }

    public function ringkasan(Request $request, string $format): Response
    {
        $start = $request->start_date ? Carbon::parse($request->start_date)->startOfDay() : Carbon::now()->startOfMonth();
        $end = $request->end_date ? Carbon::parse($request->end_date)->endOfDay() : Carbon::now()->endOfMonth();

        $orderQuery = Order::whereBetween('created_at', [$start, $end]);

        $totalOrder = (clone $orderQuery)->count();
        $orderSelesai = (clone $orderQuery)->where('status_order', 'completed')->count();
        $orderDibatalkan = (clone $orderQuery)->where('status_order', 'cancelled')->count();
        $pendapatan = (clone $orderQuery)->where('status_pembayaran', 'paid')->sum('harga_total');
        $denda = (clone $orderQuery)->where('status_pembayaran', 'paid')->sum('denda_overtime');
        $kendaraanBaru = Kendaraan::whereBetween('created_at', [$start, $end])->count();
        $customerBaru = Customer::whereBetween('created_at', [$start, $end])->count();

        $headers = ['Metrik', 'Nilai'];
        $rows = [
            ['Total Order', $totalOrder],
            ['Order Selesai', $orderSelesai],
            ['Order Dibatalkan', $orderDibatalkan],
            ['Pendapatan', (float) $pendapatan],
            ['Denda Overtime', (float) $denda],
            ['Total Penerimaan', (float) ($pendapatan + $denda)],
            ['Kendaraan Baru', $kendaraanBaru],
            ['Customer Baru', $customerBaru],
        ];

        return $this->writeExport($format, 'laporan-ringkasan', $headers, $rows);
    }

    private function writeExport(string $format, string $filename, array $headers, iterable $rows): Response|JsonResponse
    {
        try {
            $extension = $format === 'csv' ? 'csv' : 'xlsx';
            $tempPath = sys_get_temp_dir().'/laporan_'.uniqid('', true).'.'.$extension;

            $writer = $format === 'csv' ? new CsvWriter : new XlsxWriter;
            $writer->openToFile($tempPath);
            $writer->addRow(Row::fromValues($headers));
            foreach ($rows as $row) {
                $writer->addRow(Row::fromValues(array_values((array) $row)));
            }
            $writer->close();

            $contentType = $format === 'csv'
                ? 'text/csv'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

            return response()->file($tempPath, [
                'Content-Type' => $contentType,
                'Content-Disposition' => "attachment; filename=\"{$filename}.{$extension}\"",
            ])->deleteFileAfterSend(true);
        } catch (\Throwable $e) {
            File::delete($tempPath ?? '');
            report($e);

            return response()->json([
                'message' => 'Gagal membuat file export: '.$e->getMessage(),
            ], 500);
        }
    }
}
