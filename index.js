#!/usr/bin/env node
/**
 * EVENTHUB - Main Entry Point for Node / Web Browser
 * Starts the full-stack server and directs traffic to the web browser application.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Execute server using tsx
const child = spawn('npx', ['tsx', path.join(__dirname, 'server.ts')], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('error', (err) => {
  console.error('Failed to launch EVENTHUB server:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
