const { google } = require('googleapis');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheetsList = [
  {
    id: '1AB5faE_-2SRwa4OaCKoelrmmaZFWLSuXNXUpMZAGM1U',
    range: 'Recent!A3:P3',
    name: 'electricity',
  },
  {
    id: '1bZe-Fpk380O8PvKIr8l_xXTc7okV7_tHF6wY7Bk_RuE',
    range: 'Recent!A3:Y3',
    name: 'co2',
  },
  {
    id: '1vcx507sIXFwaGqqvqIl5iqSET5gLFFje8E2hyoL_Hag',
    range: 'Recent!A3:C3',
    name: 'water',
  },
  {
    id: '1M2mD4HN8jqTJPBAodWBPjcm7_mGk25tzkmc8Qi27k30',
    range: 'Recent!A3:G3',
    name: 'vehicle',
  },
];

// 🔁 Helper: konversi waktu WIB → UTC ISO
function parseWIBtoUTC(wibString) {
  if (!wibString) return null;
  return new Date(wibString + '+07:00').toISOString();
}

// 🔁 Fungsi baca data dari Google Sheets
async function readMultipleSheets() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const results = {};

  for (const sheet of sheetsList) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheet.id,
        range: sheet.range,
      });

      const values = res.data.values?.[0] || [];
      results[sheet.name] = values;
    } catch (err) {
      console.error(`❌ Gagal membaca ${sheet.name}:`, err.message);
      results[sheet.name] = null;
    }
  }

  return results;
}

// 🔁 Insert ke Supabase
async function insertToSupabase(table, data) {
  const response = await fetch(`${SUPABASE_URL}/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([data]),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`❌ Gagal insert ke ${table}: ${response.status} - ${err}`);
  }
}

// 🔁 Transformasi baris sesuai tabel
function mapRowToObject(table, row) {
  switch (table) {
    case 'electricity':
      return {
        last_read: parseWIBtoUTC(row[0]),
        l1_l2_v: parseFloat(row[1]),
        l1_l3_v: parseFloat(row[2]),
        l3_l1_v: parseFloat(row[3]),
        l1_n_v: parseFloat(row[4]),
        l2_n_v: parseFloat(row[5]),
        l3_n_v: parseFloat(row[6]),
        i1_a: parseFloat(row[7]),
        i2_a: parseFloat(row[8]),
        i3_a: parseFloat(row[9]),
        p_kw: parseFloat(row[10]),
        q_var: parseFloat(row[11]),
        pf: parseFloat(row[12]),
        freq: parseFloat(row[13]),
        energy_kwh: parseFloat(row[14]),
        cost_mrp: parseFloat(row[15]),
      };

    case 'co2':
      return {
        s1_last_read: parseWIBtoUTC(row[0]),
        s1_humidity_percent: parseFloat(row[1]),
        s1_temperature_c: parseFloat(row[2]),
        s1_co2_ppm: parseFloat(row[3]),
        s1_temp_co2_c: parseFloat(row[4]),
        s2_last_read: parseWIBtoUTC(row[5]),
        s2_humidity_percent: parseFloat(row[6]),
        s2_temperature_c: parseFloat(row[7]),
        s2_co2_ppm: parseFloat(row[8]),
        s2_temp_co2_c: parseFloat(row[9]),
        s3_last_read: parseWIBtoUTC(row[10]),
        s3_humidity_percent: parseFloat(row[11]),
        s3_temperature_c: parseFloat(row[12]),
        s3_co2_ppm: parseFloat(row[13]),
        s3_temp_co2_c: parseFloat(row[14]),
        s4_last_read: parseWIBtoUTC(row[15]),
        s4_humidity_percent: parseFloat(row[16]),
        s4_temperature_c: parseFloat(row[17]),
        s4_co2_ppm: parseFloat(row[18]),
        s4_temp_co2_c: parseFloat(row[19]),
        daily_avg_1: parseFloat(row[20]),
        daily_avg_2: parseFloat(row[21]),
        daily_avg_3: parseFloat(row[22]),
        daily_avg_4: parseFloat(row[23]),
        combined_daily_avg: parseFloat(row[24]),
      };

    case 'water':
      return {
        datetime: parseWIBtoUTC(row[0]),
        flow_lpm: parseFloat(row[1]),
        total_l: parseFloat(row[2]),
      };

    case 'vehicle':
      return {
        last_read: parseWIBtoUTC(row[0]),
        mobil_per_min: parseFloat(row[1]),
        motor_per_min: parseFloat(row[2]),
        truk_per_min: parseFloat(row[3]),
        total_mobil: parseInt(row[4]),
        total_motor: parseInt(row[5]),
        total_truk: parseInt(row[6]),
      };

    default:
      throw new Error(`Unknown table: ${table}`);
  }
}

// 🔁 Cek duplikat berdasarkan primary key
async function isDuplicate(table, keyField, keyValue) {
  const url = `${SUPABASE_URL}/${table}?${keyField}=eq.${encodeURIComponent(keyValue)}&select=${keyField}&limit=1`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal cek duplikat di ${table}: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.length > 0;
}

// 🔁 Fungsi utama: sinkronisasi
async function insertDataToDatabase() {
  const results = await readMultipleSheets();

  for (const table in results) {
    const row = results[table];
    if (!row || row.length === 0) {
      console.warn(`⚠️ Data kosong untuk ${table}, dilewati.`);
      continue;
    }

    const record = mapRowToObject(table, row);

    const keyField = {
      electricity: 'last_read',
      co2: 's1_last_read',
      water: 'datetime',
      vehicle: 'last_read',
    }[table];

    const keyValue = record[keyField];

    if (!keyValue) {
      console.warn(`⚠️ Tidak ada nilai ${keyField} untuk ${table}, dilewati.`);
      continue;
    }

    const duplicate = await isDuplicate(table, keyField, keyValue);
    if (duplicate) {
      console.log(`ℹ️ Data ${keyField} = ${keyValue} sudah ada di ${table}, dilewati.`);
      continue;
    }

    await insertToSupabase(table, record);
    console.log(`✅ Data berhasil dikirim ke tabel ${table}`);
  }
}

module.exports = { insertDataToDatabase };
