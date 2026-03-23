// exportUtils.ts

/**
 * Utility to download string content as a file.
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Escapes a string for CSV format to avoid issues with commas, quotes, and newlines.
 */
function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of objects to a CSV string.
 * @param data Array of records
 * @param separator Separator to use (e.g. ',' for standard CSV, ';' for Excel format CSV)
 */
function objectsToCsvStr(data: any[], separator: string = ','): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => escapeCsvValue(row[header])).join(separator)
  );
  return [headers.join(separator), ...rows].join('\n');
}

/**
 * Exports data to JSON format and downloads it.
 */
export function exportToJSON(data: any[], filename: string = 'export') {
  const jsonStr = JSON.stringify(data, null, 2);
  downloadFile(jsonStr, `${filename}.json`, 'application/json;charset=utf-8;');
}

/**
 * Exports data to standard CSV format and downloads it.
 */
export function exportToCSV(data: any[], filename: string = 'export') {
  const csvStr = objectsToCsvStr(data, ',');
  downloadFile(csvStr, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Exports data to Excel-readable CSV format (semicolon + BOM) and downloads it.
 */
export function exportToExcel(data: any[], filename: string = 'export') {
  const csvStr = objectsToCsvStr(data, ';');
  const bom = '\uFEFF'; // Windows BOM makes Excel read UTF-8 properly
  downloadFile(bom + csvStr, `${filename}.csv`, 'text/csv;charset=utf-8;');
}
