const { insertDataToDatabase } = require('./sheets');

(async () => {
  console.log("🚀 Memulai proses sinkronisasi GSheet ke Supabase...");

  try {
    await insertDataToDatabase();
    console.log("✅ Semua data berhasil disinkronkan.");
  } catch (err) {
    console.error("❌ Terjadi kesalahan:", err.message);
  }
})();
