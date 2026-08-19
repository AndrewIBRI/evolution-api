'use strict';

const fs = require('fs');
const path = require('path');

const templatePath = path.resolve(process.cwd(), process.argv[2] || '.env.example');
const outputPath = path.resolve(process.cwd(), process.argv[3] || '.env');

if (!fs.existsSync(templatePath)) {
  console.error(`Env template not found: ${templatePath}`);
  process.exit(1);
}

function isInjected(name) {
  return Object.prototype.hasOwnProperty.call(process.env, name) && process.env[name] !== '';
}

function quoteEnvValue(value) {
  const str = value ?? '';
  if (/^[A-Za-z0-9_./:=+,?@%&*~-]*$/.test(str)) {
    return str;
  }

  return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
}

function parseKey(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const eq = trimmed.indexOf('=');
  if (eq <= 0) {
    return null;
  }

  return trimmed.slice(0, eq).trim();
}

const template = fs.readFileSync(templatePath, 'utf8');
const lines = template.split(/\r?\n/);
const keysInFile = new Set();
let replaced = 0;

const outputLines = lines.map((line) => {
  const key = parseKey(line);
  if (!key) {
    return line;
  }

  keysInFile.add(key);

  if (isInjected(key)) {
    replaced += 1;
    return `${key}=${quoteEnvValue(process.env[key])}`;
  }

  return line;
});

if (isInjected('DATABASE_URL') && !isInjected('DATABASE_CONNECTION_URI')) {
  const mapped = `DATABASE_CONNECTION_URI=${quoteEnvValue(process.env.DATABASE_URL)}`;
  const idx = outputLines.findIndex((line) => parseKey(line) === 'DATABASE_CONNECTION_URI');
  if (idx !== -1) {
    outputLines[idx] = mapped;
  } else {
    outputLines.push(mapped);
  }
  replaced += 1;
}

if (isInjected('DATABASE_CONNECTION_URI') && !isInjected('DATABASE_URL')) {
  outputLines.push(`DATABASE_URL=${quoteEnvValue(process.env.DATABASE_CONNECTION_URI)}`);
}

const body = outputLines.join('\n');
fs.writeFileSync(outputPath, body.endsWith('\n') ? body : `${body}\n`);

console.log(`Merged ${path.basename(templatePath)} -> ${path.basename(outputPath)} (${replaced} key(s) from injected environment)`);
