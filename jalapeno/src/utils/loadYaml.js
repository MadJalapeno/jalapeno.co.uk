// src/utils/loadYaml.js
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export function loadYaml(filePath) {
  const fullPath = path.resolve(filePath);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  return yaml.load(fileContents);
}