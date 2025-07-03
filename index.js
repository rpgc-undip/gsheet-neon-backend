const { readMultipleSheets } = require('./sheets');

(async () => {
  console.log("🚀 Membaca dari beberapa Google Sheets...");

  const data = await readMultipleSheets();

  console.log("✅ Data berhasil dibaca:");
  console.log(JSON.stringify(data, null, 2));
})();
