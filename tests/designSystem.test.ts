import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  LoadingState,
  NotificationBanner,
  ResizablePanel,
  Select,
  Tabs,
  Textarea,
} from '../src/components/ui';
// @ts-ignore JS script
import { auditDesignSystem } from '../scripts/check-design-system.mjs';

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function contrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lum = (rgb: [number, number, number]) =>
    0.2126 * srgbToLinear(rgb[0]) +
    0.7152 * srgbToLinear(rgb[1]) +
    0.0722 * srgbToLinear(rgb[2]);
  const l1 = lum(rgb1);
  const l2 = lum(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Design System 2.0 — Tokens, Contrast, Enforcement & Shared Primitives', () => {
  it('validates WCAG AA contrast (>= 4.5:1) for IntelliCode Obsidian and Light foreground/background pairs', () => {
    // Obsidian Dark
    const obsidianBg: [number, number, number] = [16, 17, 20];
    const obsidianPanel: [number, number, number] = [27, 29, 34];
    const obsidianText: [number, number, number] = [230, 232, 236];
    const obsidianSecondary: [number, number, number] = [161, 166, 176];
    const obsidianMuted: [number, number, number] = [119, 126, 138];
    const obsidianAccent: [number, number, number] = [91, 141, 239];
    const obsidianOnAccent: [number, number, number] = [12, 17, 27];
    const obsidianDestructive: [number, number, number] = [224, 108, 117];
    const obsidianOnDestructive: [number, number, number] = [18, 9, 11];

    assert.ok(contrastRatio(obsidianText, obsidianBg) >= 4.5);
    assert.ok(contrastRatio(obsidianText, obsidianPanel) >= 4.5);
    assert.ok(contrastRatio(obsidianSecondary, obsidianPanel) >= 4.5);
    assert.ok(contrastRatio(obsidianMuted, obsidianBg) >= 4.5);
    assert.ok(contrastRatio(obsidianOnAccent, obsidianAccent) >= 4.5);
    assert.ok(contrastRatio(obsidianOnDestructive, obsidianDestructive) >= 4.5);

    // Porcelain Light Theme
    const lightBg: [number, number, number] = [247, 247, 245];
    const lightPanel: [number, number, number] = [250, 250, 251];
    const lightText: [number, number, number] = [36, 39, 46];
    const lightSecondary: [number, number, number] = [82, 91, 104];
    const lightMuted: [number, number, number] = [100, 108, 121];
    const lightAccent: [number, number, number] = [55, 101, 197];
    const lightOnAccent: [number, number, number] = [255, 255, 255];
    const lightDestructive: [number, number, number] = [189, 63, 73];
    const lightOnDestructive: [number, number, number] = [255, 255, 255];

    assert.ok(contrastRatio(lightText, lightBg) >= 4.5);
    assert.ok(contrastRatio(lightSecondary, lightPanel) >= 4.5);
    assert.ok(contrastRatio(lightMuted, lightBg) >= 4.5);
    assert.ok(contrastRatio(lightOnAccent, lightAccent) >= 4.5);
    assert.ok(contrastRatio(lightOnDestructive, lightDestructive) >= 4.5);

    // Porcelain Syntax Highlighting Tokens on #F7F7F5
    const porcelainSyntax: Array<[string, [number, number, number]]> = [
      ['keyword', [121, 80, 161]],
      ['function', [45, 86, 143]],
      ['string', [53, 119, 91]],
      ['number', [162, 94, 40]],
      ['comment', [100, 108, 121]],
      ['type', [107, 75, 161]],
      ['tag', [181, 61, 71]],
      ['variable', [36, 39, 46]],
    ];
    for (const [tokenName, rgb] of porcelainSyntax) {
      const ratio = contrastRatio(rgb, lightBg);
      assert.ok(ratio >= 4.5, `Porcelain syntax token ${tokenName} contrast ${ratio.toFixed(2)} < 4.5`);
    }
  });

  it('enforces zero raw palette classes or hex codes in src/components/ui/ and no new debt regressions', () => {
    const { uiViolations, debtRegressions } = auditDesignSystem();
    assert.deepEqual(uiViolations, []);
    assert.deepEqual(debtRegressions, []);
  });

  it('bundles Inter and JetBrains Mono font files locally in src/main.tsx', () => {
    const mainSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/main.tsx'), 'utf8');
    assert.ok(mainSrc.includes('@fontsource/inter/'));
    assert.ok(mainSrc.includes('@fontsource/jetbrains-mono/'));
  });

  it('renders shared UI primitives with accessible semantics, defaults, and states', () => {
    const btnHtml = renderToStaticMarkup(React.createElement(Button, { variant: 'primary' }, 'Save'));
    assert.ok(btnHtml.includes('type="button"'));
    assert.ok(btnHtml.includes('Save'));

    const loadingBtnHtml = renderToStaticMarkup(React.createElement(Button, { loading: true }, 'Saving'));
    assert.ok(loadingBtnHtml.includes('disabled=""'));
    assert.ok(loadingBtnHtml.includes('aria-busy="true"'));

    const iconBtnHtml = renderToStaticMarkup(
      React.createElement(IconButton, { label: 'Close panel' }, React.createElement('span', null, 'X'))
    );
    assert.ok(iconBtnHtml.includes('aria-label="Close panel"'));
    assert.ok(iconBtnHtml.includes('title="Close panel"'));
    assert.ok(iconBtnHtml.includes('type="button"'));

    const inputHtml = renderToStaticMarkup(
      React.createElement(Input, { label: 'Branch', error: 'Required' })
    );
    assert.ok(inputHtml.includes('<label'));
    assert.ok(inputHtml.includes('aria-invalid="true"'));
    assert.ok(inputHtml.includes('role="alert"'));

    const closedDialogHtml = renderToStaticMarkup(
      React.createElement(Dialog, { open: false, onClose: () => {}, title: 'Hidden' }, 'Body')
    );
    assert.equal(closedDialogHtml, '');

    const openDialogHtml = renderToStaticMarkup(
      React.createElement(Dialog, { open: true, onClose: () => {}, title: 'Confirm' }, 'Body')
    );
    assert.ok(openDialogHtml.includes('role="dialog"'));
    assert.ok(openDialogHtml.includes('aria-modal="true"'));

    const tabsHtml = renderToStaticMarkup(
      React.createElement(Tabs, {
        activeId: 'a',
        onChange: () => {},
        items: [
          { id: 'a', label: 'Alpha' },
          { id: 'b', label: 'Beta' },
        ],
      })
    );
    assert.ok(tabsHtml.includes('role="tablist"'));
    assert.ok(tabsHtml.includes('role="tab"'));
    assert.ok(tabsHtml.includes('aria-selected="true"'));

    const resizerHtml = renderToStaticMarkup(
      React.createElement(
        ResizablePanel,
        {
          direction: 'horizontal',
          handlePosition: 'end',
          defaultSize: 248,
          minSize: 180,
          maxSize: 400,
          ariaLabel: 'Resize Explorer',
        },
        'Content'
      )
    );
    assert.ok(resizerHtml.includes('role="separator"'));
    assert.ok(resizerHtml.includes('aria-valuenow="248"'));

    const miscHtml = renderToStaticMarkup(
      React.createElement(
        'div',
        null,
        React.createElement(Textarea, { label: 'Bio' }),
        React.createElement(Select, { label: 'Mode', options: [{ value: '1', label: 'One' }] }),
        React.createElement(Checkbox, { label: 'Agree', checked: true, onChange: () => {} }),
        React.createElement(Badge, { variant: 'success' }, 'OK'),
        React.createElement(EmptyState, { title: 'Empty' }),
        React.createElement(LoadingState, { label: 'Wait' }),
        React.createElement(ErrorState, { message: 'Failed' }),
        React.createElement(NotificationBanner, { message: 'Saved' }),
        React.createElement(Divider)
      )
    );
    assert.ok(miscHtml.includes('Saved'));
  });
});
