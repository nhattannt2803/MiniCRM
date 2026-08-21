import { google } from 'googleapis';

export interface SheetDataResponse {
  spreadsheetId: string;
  sheetName: string;
  availableSheets: string[];
  totalRows: number;
  totalColumns: number;
  columns: string[];
  rows: Array<Record<string, any>>;
  rawRows: string[][];
  updatedAt: string;
}

export class GoogleSheetService {
  /**
   * Fetch data from the Google Sheet specified by env or parameters.
   */
  static async getMoveDataSheet(
    customSpreadsheetId?: string,
    customSheetName?: string
  ): Promise<SheetDataResponse> {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const spreadsheetId = customSpreadsheetId || process.env.GOOGLE_SHEETS_MOVE_DATA_SPREADSHEET_ID;
    const sheetName = customSheetName || process.env.GOOGLE_SHEETS_MOVE_DATA_SHEET_NAME || 'DRAFF';

    if (!clientEmail || !privateKey) {
      throw new Error(
        'Cấu hình Google Service Account chưa đầy đủ. Vui lòng kiểm tra GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL và GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY trong file .env.'
      );
    }

    if (!spreadsheetId) {
      throw new Error(
        'Chưa cấu hình GOOGLE_SHEETS_MOVE_DATA_SPREADSHEET_ID trong file .env.'
      );
    }

    // Format private key (convert literal \n to actual newlines if needed)
    privateKey = privateKey.replace(/\\n/g, '\n');

    // Create Google Auth Client
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch spreadsheet metadata to get list of sheet names
    let availableSheets: string[] = [];
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      availableSheets = (meta.data.sheets || [])
        .map((s) => s.properties?.title)
        .filter((title): title is string => Boolean(title));
    } catch (metaErr) {
      console.warn('Could not fetch spreadsheet metadata for sheet names:', metaErr);
      availableSheets = [sheetName];
    }

    if (!availableSheets.includes(sheetName) && availableSheets.length > 0) {
      availableSheets.unshift(sheetName);
    }

    // Fetch range values from Google Sheets API
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });

    const rawRows: string[][] = (response.data.values as string[][]) || [];

    if (rawRows.length === 0) {
      return {
        spreadsheetId,
        sheetName,
        availableSheets,
        totalRows: 0,
        totalColumns: 0,
        columns: [],
        rows: [],
        rawRows: [],
        updatedAt: new Date().toISOString(),
      };
    }

    // First row is assumed to be column header
    const columns: string[] = rawRows[0].map((col, index) => col?.trim() || `Cột ${index + 1}`);

    // Data rows
    const dataRows = rawRows.slice(1);
    const rows: Array<Record<string, any>> = dataRows.map((rowArr, rowIndex) => {
      const rowObj: Record<string, any> = { _rowIndex: rowIndex + 2 }; // 1-indexed in sheet (header is row 1)
      columns.forEach((colName, colIndex) => {
        rowObj[colName] = rowArr[colIndex] !== undefined ? rowArr[colIndex] : '';
      });
      return rowObj;
    });

    return {
      spreadsheetId,
      sheetName,
      availableSheets,
      totalRows: dataRows.length,
      totalColumns: columns.length,
      columns,
      rows,
      rawRows,
      updatedAt: new Date().toISOString(),
    };
  }
}
