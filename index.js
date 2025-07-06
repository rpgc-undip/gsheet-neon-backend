const { insertDataToDatabase } = require('./sheets');

(async () => {
  console.log("🚀 Memulai proses sinkronisasi GSheet ke Supabase...");

  const startedAt = new Date();

  try {
    await insertDataToDatabase();
    const finishedAt = new Date();
    const duration = ((finishedAt - startedAt) / 1000).toFixed(2);
    console.log(`✅ Semua data berhasil disinkronkan dalam ${duration}s`);
    process.exit(0); // sukses
  } catch (err) {
    console.error("❌ Terjadi kesalahan saat sinkronisasi:", err.message);
    process.exit(1); // error
  }
})();
