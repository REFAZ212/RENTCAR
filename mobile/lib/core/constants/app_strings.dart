class AppStrings {
  AppStrings._();

  static const String appName = 'UDIN RENTCAR';
  static const String appTagline = 'Sistem Manajemen Kendaraan';

  // Auth
  static const String loginTitle = 'Selamat Datang';
  static const String loginSubtitle = 'Masuk untuk melanjutkan';
  static const String email = 'Email';
  static const String password = 'Password';
  static const String loginButton = 'Masuk';
  static const String rememberMe = 'Ingat saya';
  static const String forgotPassword = 'Lupa Password?';

  // Dashboard
  static const String goodMorning = 'Selamat pagi,';
  static const String goodAfternoon = 'Selamat siang,';
  static const String goodEvening = 'Selamat malam,';
  static const String todayTasks = 'Tugas Hari Ini';
  static const String todayInspections = 'Inspeksi Hari Ini';
  static const String pendingInspections = 'Inspeksi Pending';
  static const String newNotifications = 'Notifikasi Baru';
  static const String startInspection = 'Mulai Inspeksi';
  static const String recentActivity = 'Aktivitas Terbaru';

  // Inspection
  static const String inspectionList = 'Inspeksi Kendaraan';
  static const String newInspection = 'Inspeksi Baru';
  static const String inspectionBefore = 'Sebelum Sewa';
  static const String inspectionAfter = 'Sesudah Sewa';
  static const String allInspections = 'Semua';
  static const String startInspectionAction = 'Mulai Inspeksi';
  static const String continueInspection = 'Lanjutkan Inspeksi';
  static const String viewResult = 'Lihat Hasil';
  static const String inspectionDetail = 'Detail Inspeksi';
  static const String inspectionComplete = 'Inspeksi Selesai';

  // Inspection Steps
  static const String stepGeneral = 'Data Umum';
  static const String stepExterior = 'Eksterior';
  static const String stepInterior = 'Interior';
  static const String stepEngine = 'Mesin';
  static const String stepCompleteness = 'Kelengkapan';
  static const String stepFuel = 'Bensin';
  static const String stepDocumentation = 'Dokumentasi';
  static const String stepReview = 'Review';

  // General Data
  static const String brand = 'Merk';
  static const String type = 'Tipe';
  static const String plateNumber = 'Nomor Polisi';
  static const String customer = 'Customer';
  static const String rentalPurpose = 'Tujuan Sewa';
  static const String rentalStart = 'Tanggal Mulai';
  static const String rentalEnd = 'Tanggal Selesai';
  static const String startTime = 'Jam Mulai';
  static const String endTime = 'Jam Selesai';
  static const String rentalRate = 'Tarif Sewa';
  static const String booking = 'Booking';

  // Exterior
  static const String exteriorInspection = 'Inspeksi Eksterior';
  static const String frontSection = 'Bagian Depan';
  static const String rearSection = 'Bagian Belakang';
  static const String leftSide = 'Sisi Kiri';
  static const String rightSide = 'Sisi Kanan';
  static const String roof = 'Atap';
  static const String glass = 'Kaca';
  static const String lights = 'Lampu';
  static const String tires = 'Ban/Roda';

  // Condition
  static const String good = 'Baik';
  static const String hasDamage = 'Ada Kerusakan';
  static const String needsAttention = 'Perlu Perhatian';
  static const String takePhoto = 'Ambil Foto';
  static const String notes = 'Catatan';

  // Damage Types
  static const String scratch = 'Lecet';
  static const String dent = 'Penyok';
  static const String crack = 'Retak';
  static const String broken = 'Pecah';
  static const String paintPeeling = 'Cat Terkelupas';
  static const String lightBroken = 'Lampu Rusak';
  static const String glassBroken = 'Kaca Rusak';
  static const String tireBroken = 'Ban Rusak';
  static const String other = 'Lainnya';
  static const String damageDescription = 'Deskripsi Kerusakan';

  // Interior
  static const String interiorInspection = 'Inspeksi Interior';
  static const String dashboard = 'Dashboard';
  static const String frontSeat = 'Kursi Depan';
  static const String rearSeat = 'Kursi Belakang';
  static const String carpet = 'Karpet';
  static const String trunk = 'Bagasi';
  static const String ac = 'AC';
  static const String audio = 'Audio';
  static const String otherInterior = 'Interior Lainnya';
  static const String problemType = 'Jenis Masalah';

  // Engine
  static const String engineInspection = 'Inspeksi Mesin';
  static const String engineCondition = 'Kondisi Mesin';
  static const String oil = 'Oli';
  static const String radiatorWater = 'Air Radiator';
  static const String battery = 'Aki';
  static const String leakage = 'Kebocoran';
  static const String engineComponents = 'Komponen Mesin';
  static const String normal = 'Normal';
  static const String enginePhoto = 'Foto Mesin';

  // Completeness
  static const String completenessInspection = 'Kelengkapan';
  static const String key = 'Kunci';
  static const String stnk = 'STNK';
  static const String spareTire = 'Ban Serep';
  static const String jack = 'Dongkrak';
  static const String wheelWrench = 'Kunci Roda';
  static const String missing = 'Tidak Ada';
  static const String damaged = 'Rusak';

  // Fuel
  static const String fuelLevel = 'Level Bensin';
  static const String fuelLiter = 'Jumlah Liter';
  static const String full = 'FULL';
  static const String empty = 'EMPTY';

  // Odometer
  static const String odometer = 'Kilometer/Odometer';
  static const String odometerPhoto = 'Foto Odometer';

  // Documentation
  static const String photoDocumentation = 'Dokumentasi Foto';
  static const String videoDocumentation = 'Dokumentasi Video';
  static const String requiredPhotos = 'Foto Wajib';
  static const String recordVideo = 'Rekam Video';
  static const String video = 'Video';

  // Review
  static const String reviewInspection = 'Review Inspeksi';
  static const String complete = 'Lengkap';
  static const String incomplete = 'Belum Lengkap';
  static const String backToCheck = 'Kembali Periksa';
  static const String finishInspection = 'Selesaikan Inspeksi';
  static const String inspectionNotComplete =
      'Inspeksi belum dapat diselesaikan';
  static const String dataIncomplete = 'data belum lengkap';

  // Validation
  static const String requiredField = 'Wajib diisi';

  // Status
  static const String draft = 'Belum Dimulai';
  static const String inProgress = 'Berlangsung';
  static const String completed = 'Selesai';
  static const String syncPending = 'Menunggu Sinkronisasi';
  static const String synced = 'Tersinkronisasi';

  // Comparison
  static const String before = 'SEBELUM';
  static const String after = 'SESUDAH';
  static const String compare = 'Bandingkan';
  static const String unchanged = 'Tidak Berubah';
  static const String changeDetected = 'Perubahan Ditemukan';
  static const String newDamageFound = 'Kerusakan Baru';
  static const String isNewDamage = 'Apakah ini kerusakan baru?';
  static const String yesNewDamage = 'Ya, Kerusakan Baru';
  static const String noNewDamage = 'Bukan Kerusakan Baru';

  // Summary
  static const String inspectionResult = 'Hasil Inspeksi';
  static const String totalItems = 'Total item';
  static const String unchangedItems = 'Tidak berubah';
  static const String changedItems = 'Perubahan';
  static const String newDamageItems = 'Kerusakan baru';
  static const String noNewDamageFound = 'Tidak ditemukan kerusakan baru.';
  static const String newDamageSummary = 'Ditemukan %d kerusakan baru.';
  static const String viewDetail = 'Lihat Detail';
  static const String backToList = 'Kembali ke Daftar Inspeksi';

  // Damage Detail
  static const String damageDetail = 'Detail Kerusakan';
  static const String beforeCondition = 'Kondisi Sebelum';
  static const String afterCondition = 'Kondisi Sesudah';
  static const String beforePhoto = 'Foto Sebelum';
  static const String afterPhoto = 'Foto Sesudah';

  // Tasks
  static const String taskList = 'Tugas';
  static const String taskNotStarted = 'Belum Dikerjakan';
  static const String taskInProgress = 'Sedang Dikerjakan';
  static const String taskDone = 'Selesai';
  static const String taskLate = 'Terlambat';

  // Priority
  static const String priorityNormal = 'Normal';
  static const String priorityImportant = 'Penting';
  static const String priorityUrgent = 'Mendesak';

  // Notifications
  static const String notificationList = 'Notifikasi';

  // Profile
  static const String profile = 'Profil';
  static const String logout = 'Keluar';

  // Common
  static const String save = 'Simpan';
  static const String cancel = 'Batal';
  static const String confirm = 'Konfirmasi';
  static const String loading = 'Memuat...';
  static const String noData = 'Tidak ada data';
  static const String retry = 'Coba Lagi';
  static const String camera = 'Kamera';
  static const String gallery = 'Galeri';
  static const String delete = 'Hapus';
  static const String retake = 'Ambil Ulang';
  static const String usePhoto = 'Gunakan Foto';
  static const String addPhoto = 'Tambah Foto';
  static const String preview = 'Pratinjau';
  static const String uploading = 'Mengupload...';
  static const String uploadFailed = 'Upload gagal';
  static const String syncedSuccess = 'Berhasil disinkronkan';
  static const String next = 'Selanjutnya';
  static const String previous = 'Sebelumnya';
  static const String stepOf = '%d dari %d tahap';
}
