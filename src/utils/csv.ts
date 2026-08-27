/**
 * Split a single CSV line into fields, respecting double-quoted values.
 *
 * Spreadsheet exports quote any field containing a comma (e.g. "Doe, John"),
 * so a plain line.split(',') silently shifts every column after it.
 * A doubled quote inside a quoted field ("") is an escaped literal quote.
 */
export const parseCSVLine = (line: string): string[] => {
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

/**
 * Split CSV text into non-empty lines, handling CRLF endings and a leading
 * UTF-8 BOM (both common in files exported from Excel).
 */
export const splitCSVLines = (csvContent: string): string[] =>
  csvContent
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter(line => line.trim());
