import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const UI_DIR = path.join(ROOT, 'src', 'components', 'ui');
const COMPONENTS_DIR = path.join(ROOT, 'src', 'components');

const RAW_PALETTE_RE = /\b(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|cyan|sky|blue|indigo|emerald|green|teal|rose|red|amber|yellow|orange|purple|violet|pink)-\d{2,3}\b/g;
const RAW_HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

// Recorded legacy debt baseline (count of raw palette + hex matches outside src/components/ui/).
// New components or files in src/components/ui/ MUST have 0 violations.
const LEGACY_DEBT_BASELINE = {
  'src/components/editor/CodeEditor.tsx': 2,
  'src/components/layout/TopNav.tsx': 1,
};

function walkTsx(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTsx(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

export function auditDesignSystem() {
  const files = walkTsx(COMPONENTS_DIR);
  const uiViolations = [];
  const debtRegressions = [];
  const legacyDebt = {};

  for (const filePath of files) {
    const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');
    const paletteMatches = content.match(RAW_PALETTE_RE) || [];
    const hexMatches = content.match(RAW_HEX_RE) || [];
    const total = paletteMatches.length + hexMatches.length;

    if (filePath.startsWith(UI_DIR)) {
      if (total > 0) {
        uiViolations.push({ file: rel, count: total, matches: [...paletteMatches, ...hexMatches] });
      }
      continue;
    }

    if (total > 0) {
      legacyDebt[rel] = total;
      const allowed = LEGACY_DEBT_BASELINE[rel] ?? 0;
      if (total > allowed) {
        debtRegressions.push({ file: rel, count: total, allowed });
      }
    }
  }

  return { uiViolations, debtRegressions, legacyDebt };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('check-design-system.mjs')) {
  const { uiViolations, debtRegressions, legacyDebt } = auditDesignSystem();
  if (uiViolations.length > 0) {
    console.error('Design System violation in src/components/ui/:', uiViolations);
    process.exit(1);
  }
  if (debtRegressions.length > 0) {
    console.error('New design-system violations exceed recorded legacy debt:', debtRegressions);
    process.exit(1);
  }
  console.log('Design System check passed. Recorded legacy debt files:', legacyDebt);
}
