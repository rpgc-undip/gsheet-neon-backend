const { google } = require('googleapis');

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheetsList = [
  {
    id: '1AB5faE_-2SRwa4OaCKoelrmmaZFWLSuXNXUpMZAGM1U',
    range: 'Recent!A3:P3',
    name: 'Sheet1'
  },
  {
    id: '1bZe-Fpk380O8PvKIr8l_xXTc7okV7_tHF6wY7Bk_RuE',
    range: 'Recent!A3:Y3',
    name: 'Sheet2'
  },
  {
    id: '1vcx507sIXFwaGqqvqIl5iqSET5gLFFje8E2hyoL_Hag',
    range: 'Recent!A3:C3',
    name: 'Sheet3'
  },
  {
    id: '1M2mD4HN8jqTJPBAodWBPjcm7_mGk25tzkmc8Qi27k30',
    range: 'Recent!A3:G3',
    name: 'Sheet4'
  },
];

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

module.exports = { readMultipleSheets };
