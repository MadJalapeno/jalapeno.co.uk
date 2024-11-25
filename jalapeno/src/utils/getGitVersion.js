// src/utils/getGitVersion.js
import { execSync } from 'child_process';

export function getGitVersion() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    return commitHash;
  } catch (error) {
    console.error('Error getting Git version:', error);
    return 'unknown';
  }
}