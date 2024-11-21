// src/utils/loadCsv.js
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export function loadCsv(filePath) {
  const fullPath = path.resolve(filePath);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const parsedData = Papa.parse(fileContents, { header: true, delimiter: ';' });
  return parsedData.data;
}