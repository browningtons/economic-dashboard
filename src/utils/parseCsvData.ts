import type { DataPoint } from '../types/dashboard';

export type CsvEntry = Partial<DataPoint> & Record<string, string | number | undefined>;

export interface ParsedCsvResult {
  data: DataPoint[];
  badRowCount: number;
  error: string | null;
}

// Handles quoted fields and escaped quotes ("") the way a spreadsheet export produces them.
export const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// The app's real CSV-to-DataPoint parsing path, extracted so it can run
// without a fetch or a DOM (App.tsx has no unit test coverage otherwise).
export const parseCsvData = (csvText: string, requiredColumns: string[]): ParsedCsvResult => {
  const lines = csvText.split('\n');
  if (lines.length < 2) {
    return { data: [], badRowCount: 0, error: 'CSV appears empty. Expected header + at least one row.' };
  }

  const headers = parseCsvLine(lines[0]);
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0) {
    return { data: [], badRowCount: 0, error: `Missing required columns: ${missingColumns.join(', ')}` };
  }

  const parsedData: DataPoint[] = [];
  let badRowCount = 0;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = parseCsvLine(lines[i]);
    if (values.length !== headers.length) {
      badRowCount++;
      continue;
    }

    const entry: CsvEntry = {};

    headers.forEach((header, index) => {
      let value = values[index]?.replace(/^,|,$/g, '') || '';

      if (value) {
        value = value.replace(/"/g, '').replace(/,/g, '');
      }

      if (header === 'Observed Date' && value) {
        const parsedDate = new Date(value);
        if (!Number.isNaN(parsedDate.getTime())) {
          entry.date = value;
          entry.timestamp = parsedDate.getTime();
          entry.year = parsedDate.getFullYear();
        }
      } else if (!isNaN(Number(value)) && value !== '') {
        entry[header] = Number(value);
      } else {
        entry[header] = undefined;
      }
    });

    if (!entry.date || entry.timestamp === undefined || entry.year === undefined) {
      badRowCount++;
      continue;
    }

    if (entry['Stock Market (b)'] !== undefined && entry['GDP'] !== undefined) {
      entry.buffettValue = (Number(entry['Stock Market (b)']) / Number(entry['GDP'])) * 100;
    }

    if (entry['10Y Treasury'] !== undefined && entry['2Y Treasury'] !== undefined) {
      entry['Yield Spread'] = Number(entry['10Y Treasury']) - Number(entry['2Y Treasury']);
    }

    parsedData.push(entry as DataPoint);
  }

  // Sort data chronologically just in case
  parsedData.sort((a, b) => a.timestamp - b.timestamp);

  if (parsedData.length === 0) {
    return { data: [], badRowCount, error: 'CSV validation failed: no valid rows were found.' };
  }

  return { data: parsedData, badRowCount, error: null };
};
