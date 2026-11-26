import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR =
  'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\1dfa92d6-ec79-452d-b8a2-eb04d05d7b89\\scratch';

test.describe('IntelliCode Phase C Browser Regression Suite', () => {
  test('starts cleanly, toggles Explorer 22x, switches views, resizes panels, and preserves unsaved edits', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // 1. Shell & TopNav visible
    await expect(page.getByText('IntelliCode')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Explorer' })).toBeVisible();

    // 2. Toggle Explorer 22 times (>= 20) — verify no React Hooks crash
    const explorerBtn = page.getByRole('button', { name: 'Explorer' });
    for (let i = 0; i < 22; i += 1) {
      await explorerBtn.click();
    }
    // Ensure sidebar is open after even count (was open initially -> still open)
    await expect(page.locator('[data-purpose="multi-view-sidebar"]')).toBeVisible();

    // 3. Resize Explorer sidebar via keyboard separator
    const explorerResizer = page.getByRole('separator', { name: 'Resize Explorer sidebar' });
    await explorerResizer.focus();
    const initialVal = Number(await explorerResizer.getAttribute('aria-valuenow'));
    await page.keyboard.press('ArrowRight');
    const resizedVal = Number(await explorerResizer.getAttribute('aria-valuenow'));
    expect(resizedVal).toBeGreaterThan(initialVal);

    // 4. Capture welcome state, create a file, edit (unsaved content), switch views, return to Editor
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-c-welcome-1440x900.png` });
    await page.locator('main#editor-workspace').getByRole('button', { name: 'New file' }).click();
    const newFileInput = page.locator('#welcome-new-file');
    await newFileInput.fill('src/demo.ts');
    await newFileInput.press('Enter');

    const editorTextarea = page.locator('main#editor-workspace textarea').first();
    await expect(editorTextarea).toBeVisible();
    const originalText = await editorTextarea.inputValue();
    await editorTextarea.fill(`${originalText}\n// phase-c-unsaved-marker`);

    await page.getByRole('button', { name: 'Knowledge graph' }).click();
    await expect(page.getByText('Knowledge graph').first()).toBeVisible();

    await page.getByRole('button', { name: 'Impact analysis' }).click();
    await expect(page.getByText('Impact analysis').first()).toBeVisible();

    // Tools menu -> MCP Hub
    await page.getByRole('button', { name: 'Tools' }).click();
    await page.getByRole('menuitem', { name: 'MCP Hub' }).click();
    await expect(page.getByText('MCP Hub').first()).toBeVisible();

    // Return to Editor and verify unsaved edit is preserved
    await page.getByRole('button', { name: 'Back to editor' }).click();
    await expect(editorTextarea).toHaveValue(`${originalText}\n// phase-c-unsaved-marker`);

    // 5. Open Bottom Panel (Terminal + Problems tabs) and resize via keyboard
    await page.locator('footer').getByRole('button', { name: 'Terminal' }).click();
    await expect(page.getByRole('tab', { name: 'Terminal' })).toBeVisible();
    await page.getByRole('tab', { name: 'Problems' }).click();
    await expect(page.getByRole('tab', { name: 'Problems', selected: true })).toBeVisible();

    const bottomResizer = page.getByRole('separator', { name: 'Resize bottom panel' });
    await bottomResizer.focus();
    const bottomBefore = Number(await bottomResizer.getAttribute('aria-valuenow'));
    await page.keyboard.press('ArrowUp');
    const bottomAfter = Number(await bottomResizer.getAttribute('aria-valuenow'));
    expect(bottomAfter).toBeGreaterThan(bottomBefore);

    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-c-ide-1440x900.png` });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('verifies dropdown interaction and dialog focus trapping in dev showcase', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/?showcase=1');

    await expect(page.getByText('IntelliCode Design System 2.0 Showcase')).toBeVisible();

    // Switch to Forms & Overlays tab via keyboard
    await page.getByRole('tab', { name: 'Forms & Overlays' }).click();

    // Dropdown (Select) interaction
    const themeSelect = page.getByRole('combobox', { name: 'Theme preview' });
    await themeSelect.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeHidden();

    // Dialog open, focus trap, and Escape focus restoration
    const openDialogBtn = page.getByRole('button', { name: 'Open Dialog' });
    await openDialogBtn.click();
    const dialog = page.getByRole('dialog', { name: 'Sample Accessible Dialog' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(openDialogBtn).toBeFocused();
  });

  test('renders without horizontal page overflow at 1280x720, 1440x900, and 1920x1080', async ({
    page,
  }) => {
    for (const vp of [
      { width: 1280, height: 720 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto('/');
      await expect(page.getByText('IntelliCode')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflow).toBe(false);
    }
  });

  test('verifies Phase D Assistant, Model Picker, Provider Settings, Accounts, Settings, and Theme persistence', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // 1. Verify computed Inter font on UI
    const uiFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(uiFont.toLowerCase()).toContain('inter');

    // 2. Open Assistant & resize via keyboard
    await page.getByRole('button', { name: /Assistant/i }).click();
    await expect(page.getByText('Ask about your workspace')).toBeVisible();
    const aiResizer = page.getByRole('separator', { name: 'Resize AI Assistant sidebar' });
    await aiResizer.focus();
    const aiBefore = Number(await aiResizer.getAttribute('aria-valuenow'));
    await page.keyboard.press('ArrowLeft');
    const aiAfter = Number(await aiResizer.getAttribute('aria-valuenow'));
    expect(aiAfter).toBeGreaterThan(aiBefore);

    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-d-assistant-1440x900.png` });

    // 3. Open Model Picker from composer -> verify menu opens ABOVE trigger with all options visible
    const modelTrigger = page.getByRole('button', { name: /Gemini|Claude|GPT/i }).first();
    await modelTrigger.click();
    const modelMenu = page.getByRole('menu');
    await expect(modelMenu).toBeVisible();
    const triggerBox = await modelTrigger.boundingBox();
    const menuBox = await modelMenu.boundingBox();
    expect(triggerBox && menuBox).toBeTruthy();
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(triggerBox!.y + 2);
    await page.getByRole('menuitem', { name: /Manage models & providers/i }).click();
    const modelsDialog = page.getByRole('dialog', { name: 'AI models' });
    await expect(modelsDialog).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-d-models-1440x900.png` });

    await modelsDialog.getByRole('tab', { name: 'Provider settings' }).click();
    await expect(modelsDialog.getByRole('button', { name: 'Test connection' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modelsDialog).toBeHidden();

    // 4. Open Accounts popover -> Connect GitHub modal -> Escape
    await page.getByRole('button', { name: 'Accounts and connected services' }).click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-d-accounts-1440x900.png` });
    await page.getByRole('dialog', { name: 'Accounts and connected services' }).getByRole('button', { name: 'Connect GitHub' }).click();
    await expect(page.getByRole('dialog', { name: 'Connect GitHub' })).toBeVisible();
    await page.keyboard.press('Escape');

    // 5. Open Settings -> Appearance -> switch to Light -> reload -> verify persisted -> switch back to Obsidian
    await page.getByRole('button', { name: 'Settings' }).click();
    const settingsDialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(settingsDialog).toBeVisible();
    await settingsDialog.getByRole('button', { name: 'Appearance' }).click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-d-settings-1440x900.png` });

    await settingsDialog.getByRole('combobox', { name: 'Color theme' }).click();
    await page.getByRole('option', { name: /IntelliCode Light/i }).click();
    await expect(page.locator('html')).toHaveClass(/light/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/light/);

    // Reset back to Obsidian default
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Appearance' }).click();
    await page.getByRole('combobox', { name: 'Color theme' }).click();
    await page.getByRole('option', { name: /IntelliCode Obsidian/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('verifies Phase E Knowledge Graph, Impact Analysis, Tools (MCP, Validation, Analyzer, Benchmarks), and Light/Dark themes', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Create a deterministic file with a symbol so graph & CIA have real data
    await page.locator('main#editor-workspace').getByRole('button', { name: 'New file' }).click();
    const newFileInput = page.locator('#welcome-new-file');
    await newFileInput.fill('src/calc.ts');
    await newFileInput.press('Enter');
    const editorTextarea = page.locator('main#editor-workspace textarea').first();
    await editorTextarea.fill('export function computeSum(a: number, b: number) {\n  return a + b;\n}\n');

    // 1. Open Knowledge Graph, test Details toggle, Graph queries, Call hierarchy, Communities
    await page.getByRole('button', { name: 'Knowledge graph' }).click();
    await expect(page.getByRole('tab', { name: 'Graph', selected: true })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e-graph-1440x900.png` });

    // Collapse & expand Details panel
    await page.getByRole('button', { name: 'Details' }).click();
    await expect(page.getByText('Select a node on the graph')).toBeHidden();
    await page.getByRole('button', { name: 'Details' }).click();
    await expect(page.getByText('Select a node on the graph')).toBeVisible();

    await page.getByRole('tab', { name: 'Graph queries' }).click();
    await page.getByRole('tab', { name: 'Call hierarchy' }).click();
    await page.getByRole('tab', { name: 'Communities' }).click();
    await page.getByRole('tab', { name: 'Graph', exact: true }).click();

    // 2. Impact Analysis
    await page.getByRole('button', { name: 'Impact analysis' }).click();
    await expect(page.getByRole('heading', { name: 'Impact analysis' })).toBeVisible();
    await page.getByRole('button', { name: 'Analyze' }).click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e-impact-1440x900.png` });

    // 3. Tools menu: MCP Hub, Validation, Prompt analyzer, Benchmarks
    await page.getByRole('button', { name: 'Tools' }).click();
    await page.getByRole('menuitem', { name: 'MCP Hub' }).click();
    await expect(page.getByRole('heading', { name: 'MCP Hub' })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e-mcp-1440x900.png` });

    await page.getByRole('button', { name: 'Tools' }).click();
    await page.getByRole('menuitem', { name: 'Validation' }).click();
    await expect(page.getByRole('heading', { name: 'Validation' })).toBeVisible();

    await page.getByRole('button', { name: 'Tools' }).click();
    await page.getByRole('menuitem', { name: 'Prompt analyzer' }).click();
    await expect(page.getByRole('heading', { name: 'Prompt analyzer' })).toBeVisible();

    await page.getByRole('button', { name: 'Tools' }).click();
    await page.getByRole('menuitem', { name: 'Benchmarks' }).click();
    await expect(page.getByRole('heading', { name: 'Evaluation benchmarks' })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e-benchmarks-1440x900.png` });

    // 4. Return to Editor and verify unsaved content preserved
    await page.getByRole('button', { name: 'Back to editor' }).click();
    await expect(editorTextarea).toHaveValue('export function computeSum(a: number, b: number) {\n  return a + b;\n}\n');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('verifies Phase E.1 Knowledge Graph progressive modes, Porcelain Light theme, and syntax highlighting', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Create two connected files across different folders
    await page.locator('main#editor-workspace').getByRole('button', { name: 'New file' }).click();
    const welcomeInput = page.locator('#welcome-new-file');
    await welcomeInput.fill('src/utils/math.ts');
    await welcomeInput.press('Enter');
    const editorTextarea = page.locator('main#editor-workspace textarea').first();
    await editorTextarea.fill(
      '// Math utility\nexport function addNumbers(a: number, b: number): number {\n  return a + b;\n}\n',
    );

    // Create second file via Explorer New File button or Top/Explorer
    await page.getByRole('button', { name: 'New file' }).first().click();
    const newFileModalInput = page.getByRole('dialog').locator('input').first();
    if (await newFileModalInput.isVisible().catch(() => false)) {
      await newFileModalInput.fill('src/components/CalcView.tsx');
      await newFileModalInput.press('Enter');
    } else {
      await page.keyboard.type('src/components/CalcView.tsx');
      await page.keyboard.press('Enter');
    }
    await editorTextarea.fill(
      "import { addNumbers } from '../utils/math';\nexport function CalcView() {\n  const total = addNumbers(2, 3);\n  return <div className=\"card\">{total}</div>;\n}\n",
    );

    // Capture Obsidian syntax + workspace screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e1-obsidian.png` });

    // Open Knowledge Graph -> Overview mode
    await page.getByRole('button', { name: 'Knowledge graph' }).click();
    await expect(page.getByRole('group', { name: 'Graph exploration mode' })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e1-overview.png` });

    // Expand group(s) in Overview
    await page.getByRole('button', { name: 'Expand all', exact: true }).click();

    // Switch to Files mode
    await page.getByRole('button', { name: 'Files', exact: true }).click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e1-files.png` });

    // Switch to Symbols mode, capture screenshot, select a node, and enter Focus mode
    await page.getByRole('button', { name: 'Symbols', exact: true }).click();
    const firstNode = page.locator('.react-flow [data-node-id]').first();
    await expect(firstNode).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e1-symbols.png` });
    await firstNode.click();
    await page.getByRole('button', { name: 'Focus neighborhood' }).click();
    await expect(page.getByText('Depth')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e1-focus.png` });

    // Test Fit, Zoom in, Search, and Details toggle
    await page.getByRole('button', { name: 'Fit' }).click();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.getByLabel('Search graph nodes').fill('Calc');
    await page.getByLabel('Search graph nodes').fill('');

    // Switch to Porcelain Light Theme via Settings
    await page.getByRole('button', { name: 'Settings' }).click();
    const settingsDialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(settingsDialog).toBeVisible();
    await settingsDialog.getByRole('button', { name: 'Appearance' }).click();
    await settingsDialog.getByRole('combobox', { name: 'Color theme' }).click();
    await page.getByRole('option', { name: /IntelliCode Light/i }).click();
    await page.keyboard.press('Escape');

    // Verify Porcelain workspace background (#F7F7F5 -> rgb(247, 247, 245))
    const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bgColor).toBe('rgb(247, 247, 245)');

    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e1-porcelain.png` });

    // Return to Editor and capture Porcelain syntax highlighting + verify distinct syntax colors
    await page.getByRole('button', { name: 'Back to editor' }).click();
    const keywordSpanColor = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('main#editor-workspace [aria-hidden="true"] span'));
      const kw = spans.find((s) => s.textContent === 'export');
      return kw ? getComputedStyle(kw).color : null;
    });
    expect(keywordSpanColor).toBe('rgb(121, 80, 161)');
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e1-syntax-porcelain.png` });

    // Create additional modules to exercise large-graph layout + minimap (> 18 nodes)
    const extraFiles = [
      ['src/services/auth.ts', 'export function login() { return true; }\nexport function logout() { return false; }\nexport function refreshToken() { return true; }'],
      ['src/services/api.ts', "import { login } from './auth';\nexport function fetchUser() { return login(); }\nexport function fetchPosts() { return []; }\nexport function fetchComments() { return []; }"],
      ['src/hooks/useAuth.ts', "import { fetchUser } from '../services/api';\nexport function useAuth() { return fetchUser(); }\nexport function useSession() { return null; }\nexport function usePermissions() { return []; }"],
      ['src/components/Header.tsx', "import { useAuth } from '../hooks/useAuth';\nexport function Header() { return useAuth(); }\nexport function HeaderLogo() { return 'logo'; }\nexport function HeaderMenu() { return 'menu'; }"],
      ['src/components/Sidebar.tsx', "export function Sidebar() { return 'nav'; }\nexport function SidebarItem() { return 'item'; }\nexport function SidebarFooter() { return 'footer'; }"],
      ['src/tests/math.test.ts', "import { addNumbers } from '../utils/math';\nexport function testAdd() { return addNumbers(1, 2); }\nexport function testSub() { return 0; }\nexport function testMul() { return 0; }"],
    ];
    for (const [fPath, fContent] of extraFiles) {
      await page.getByRole('button', { name: 'New file' }).first().click();
      await page.keyboard.type(fPath);
      await page.keyboard.press('Enter');
      await editorTextarea.fill(fContent);
    }
    await page.getByRole('button', { name: 'Knowledge graph' }).click();
    await page.getByRole('button', { name: 'Symbols', exact: true }).click();
    await expect(page.getByLabel('Graph minimap')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e1-large.png` });

    // Check responsive viewports without overflow
    for (const vp of [
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(vp);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
    }

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('verifies Phase E.2 Progressive Graph Explorer: persistent parent, independent selection, containment, multi-expansion, scoped group, and themes', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Helper to create a file at exact project root via Explorer root selection
    const createRootFile = async (filePath: string, content: string) => {
      const welcomeNewBtn = page.locator('main#editor-workspace').getByRole('button', { name: 'New file' });
      if (await welcomeNewBtn.isVisible().catch(() => false)) {
        await welcomeNewBtn.click();
        const input = page.locator('#welcome-new-file').or(page.getByPlaceholder('filename.ts'));
        await input.first().fill(filePath);
        await input.first().press('Enter');
      } else {
        await page.getByTitle('Project root (click to select root folder)').click();
        await page.getByRole('button', { name: 'New file', exact: true }).first().click();
        await page.keyboard.type(filePath);
        await page.keyboard.press('Enter');
      }
      const textarea = page.locator('main#editor-workspace textarea').first();
      await textarea.fill(content);
    };

    // Create deterministic fixture workspace: anas (2), core (package.json), idcard (package.json + README), idcard/src (App.tsx + symbol)
    await createRootFile('anas/config.ts', 'export const APP_ENV = "dev";\n');
    await createRootFile('anas/index.ts', "import { APP_ENV } from './config';\nexport function bootAnas() { return APP_ENV; }\n");
    await createRootFile('core/package.json', '{\n  "name": "@intellicode/core",\n  "version": "1.0.0"\n}\n');
    await createRootFile('idcard/package.json', '{\n  "name": "@intellicode/idcard",\n  "version": "1.0.0"\n}\n');
    await createRootFile('idcard/README.md', '# IDCard Module\n');
    await createRootFile(
      'idcard/src/App.tsx',
      "import { bootAnas } from '../../anas/index';\nexport function renderCard() {\n  return bootAnas();\n}\n",
    );

    // Open Knowledge Graph (Overview mode)
    await page.getByRole('button', { name: 'Knowledge graph' }).click();
    const coreGroup = page.locator('.react-flow [data-node-id="group:core"]');
    const idcardGroup = page.locator('.react-flow [data-node-id="group:idcard"]');
    const anasGroup = page.locator('.react-flow [data-node-id="group:anas"]');
    const idcardSrcGroup = page.locator('.react-flow [data-node-id="group:idcard/src"]');

    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Fit' }).click();
    await expect(coreGroup).toBeVisible();
    await expect(idcardGroup).toBeVisible();
    await expect(anasGroup).toBeVisible();
    await expect(idcardSrcGroup).toBeVisible();

    // Verify no graph-wide dimming in Overview
    const coreOpacity = await coreGroup.evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(coreOpacity)).toBe(1);

    // 1. Screenshot: Architecture overview before expansion
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e2-1-overview-before.png` });

    // 2. Single-click core body -> selects core WITHOUT expanding it
    await coreGroup.click();
    await expect(coreGroup).toHaveAttribute('data-selected', 'true');
    await expect(coreGroup).toHaveAttribute('data-expanded', 'false');
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e2-2-selected-core.png` });

    // 3. Click Expand core chevron -> core stays visible, package.json appears beside core with CONTAINS edge
    await page.getByRole('button', { name: 'Expand core' }).click();
    await expect(coreGroup).toBeVisible();
    await expect(coreGroup).toHaveAttribute('data-expanded', 'true');
    const corePkgNode = page.locator('.react-flow [data-node-id]:has-text("core/package.json")');
    await expect(corePkgNode).toBeVisible();
    const containsEdge = page.locator('.react-flow g[data-edge-kind="contains"][data-edge-source="group:core"]');
    await expect(containsEdge).toHaveCount(1);
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e2-3-expanded-core.png` });

    // 4. Click core/package.json -> selects that exact file and shows exact path in Details
    await corePkgNode.click();
    await expect(corePkgNode).toHaveAttribute('data-selected', 'true');
    const detailsPanel = page.getByRole('complementary', { name: 'Selected graph node details' });
    await expect(detailsPanel.getByText('core/package.json')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e2-4-selected-package.png` });

    // 5. Expand idcard simultaneously -> both core and idcard remain expanded, duplicate package.json stays distinct
    await page.getByRole('button', { name: 'Expand idcard', exact: true }).click();
    await expect(corePkgNode).toBeVisible();
    const idcardPkgNode = page.locator('.react-flow [data-node-id]:has-text("idcard/package.json")');
    await expect(idcardPkgNode).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e2-5-multi-expanded.png` });

    // 6. Collapse core -> hides only core's package.json, keeps idcard expanded
    await page.getByRole('button', { name: 'Collapse core' }).click();
    await expect(coreGroup).toBeVisible();
    await expect(corePkgNode).toBeHidden();
    await expect(idcardPkgNode).toBeVisible();

    // 7. Click empty canvas -> clears selection without collapsing idcard
    await page.locator('.react-flow__pane').click({ position: { x: 20, y: 20 } });
    await expect(detailsPanel.getByText('No selection')).toBeVisible();
    await expect(idcardPkgNode).toBeVisible();

    // 8. Search reveals hidden file in collapsed anas group
    const searchInput = page.getByLabel('Search graph nodes');
    await searchInput.fill('anas/index.ts');
    await page.getByRole('listbox', { name: 'Matching graph nodes' }).getByRole('button').first().click();
    await expect(page.locator('.react-flow [data-node-id]:has-text("anas/index.ts")')).toBeVisible();

    // 9. Explore group (idcard/src) -> scoped subgraph -> return to Overview restoring expansion
    await idcardSrcGroup.click();
    await detailsPanel.getByRole('button', { name: 'Explore group' }).click();
    await expect(page.getByText('idcard/src').first()).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e2-6-scoped-group.png` });
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(idcardPkgNode).toBeVisible();

    // 10. Graph in Obsidian Dark & Porcelain Light
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e2-7-obsidian.png` });
    await page.getByRole('button', { name: 'Settings' }).click();
    const settingsDialog = page.getByRole('dialog', { name: 'Settings' });
    await settingsDialog.getByRole('button', { name: 'Appearance' }).click();
    await settingsDialog.getByRole('combobox', { name: 'Color theme' }).click();
    await page.getByRole('option', { name: /IntelliCode Light/i }).click();
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e2-8-porcelain.png` });

    // 11. Double-click idcard/README.md opens source in editor
    await page.locator('.react-flow [data-node-id]:has-text("idcard/README.md")').dblclick();
    await expect(page.locator('main#editor-workspace textarea').first()).toHaveValue('# IDCard Module\n');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('verifies Phase E.4 Interactive Knowledge Graph: hover previews, multi-edge inspector, context menu, cross-panel DnD, and AI context', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const createRootFile = async (filePath: string, content: string) => {
      const welcomeNewBtn = page.locator('main#editor-workspace').getByRole('button', { name: 'New file' });
      if (await welcomeNewBtn.isVisible().catch(() => false)) {
        await welcomeNewBtn.click();
        const input = page.locator('#welcome-new-file').or(page.getByPlaceholder('filename.ts'));
        await input.first().fill(filePath);
        await input.first().press('Enter');
      } else {
        await page.getByTitle('Project root (click to select root folder)').click();
        await page.getByRole('button', { name: 'New file', exact: true }).first().click();
        await page.keyboard.type(filePath);
        await page.keyboard.press('Enter');
      }
      const textarea = page.locator('main#editor-workspace textarea').first();
      await textarea.fill(content);
    };

    await createRootFile(
      'utils/validation.ts',
      'export function validateEmail(email: string): boolean {\n  return email.includes("@");\n}\n',
    );
    await createRootFile(
      'services/auth.ts',
      "import { validateEmail } from '../utils/validation';\nexport function login(email: string) {\n  return validateEmail(email);\n}\n",
    );

    // 1. Open Knowledge Graph & expand both modules
    await page.getByRole('button', { name: 'Knowledge graph' }).click();
    await page.getByRole('button', { name: 'Expand all', exact: true }).click();

    // 2. Node hover preview (wait briefly for ELK layout to settle, then hover 360ms+)
    const authFileNode = page.locator('.react-flow [data-node-id]:has-text("services/auth.ts")');
    await expect(authFileNode).toBeVisible();
    await page.waitForTimeout(250);
    await authFileNode.hover();
    await expect(page.getByTestId('node-hover-preview')).toBeVisible({ timeout: 2500 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e4-1-node-hover.png` });

    // 3. Multiple relationship edge label ("1 import · 1 call") + Edge click -> Edge Relationship Inspector
    const multiEdgeLabel = page.locator('button[data-edge-label-for]', { hasText: '1 import · 1 call' });
    await expect(multiEdgeLabel).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e4-2-multi-edge.png` });

    await multiEdgeLabel.click();
    const relInspector = page.getByRole('complementary', { name: 'Selected relationship details' });
    await expect(relInspector).toBeVisible();
    await expect(relInspector.getByText('IMPORTS')).toBeVisible();
    await expect(relInspector.getByText('CALLS')).toBeVisible();
    await expect(relInspector.getByText('services/auth.ts:1')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e4-3-edge-inspector.png` });

    // 4. Switch to Symbols mode, select function, open context menu, and add to AI context
    await page.getByRole('button', { name: 'Symbols', exact: true }).click();
    const loginFnNode = page.locator('.react-flow [data-node-id]:has-text("login()")');
    await expect(loginFnNode).toBeVisible();
    await loginFnNode.click();
    await expect(loginFnNode).toHaveAttribute('data-selected', 'true');
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e4-4-selected-fn.png` });

    await loginFnNode.click({ button: 'right' });
    const ctxMenu = page.getByRole('menu');
    await expect(ctxMenu).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e4-5-context-menu.png` });
    await ctxMenu.getByRole('menuitem', { name: 'Add to AI context' }).click();

    // 5. Explorer-to-Graph drop reveals validation.ts in Overview
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.getByRole('button', { name: 'Collapse', exact: true }).click();
    const explorerValidation = page.getByRole('button', { name: /validation\.ts/ }).first();
    const graphDropZone = page.getByTestId('graph-drop-zone');
    await explorerValidation.dragTo(graphDropZone);
    await expect(page.locator('.react-flow [data-node-id]:has-text("utils/validation.ts")')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e4-6-explorer-graph-drop.png` });

    // 6. Open AI Assistant -> verify attached context chip from Graph is present (without auto-sending)
    await page.getByRole('button', { name: /Assistant/i }).click();
    await expect(page.getByText('services/auth.ts').first()).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e4-7-ai-attach.png` });

    // 7. Source navigation from Graph -> double-click opens exact file in Editor
    await page.locator('.react-flow [data-node-id]:has-text("utils/validation.ts")').dblclick();
    await expect(page.locator('main#editor-workspace textarea').first()).toContainText('validateEmail');
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e4-8-source-nav.png` });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('verifies Phase E.5 workspace interaction: Graph state preservation, Guide dialog, Back/Forward, Explorer-to-Editor, and Tab actions', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByText('IntelliCode')).toBeVisible();

    const workspaceFiles: Array<[string, string]> = [
      ['src/services/auth.ts', 'export function login() { return true; }\nexport function logout() { return false; }'],
      ['src/services/api.ts', "import { login } from './auth';\nexport function fetchUser() { return login(); }"],
      ['src/utils/math.ts', 'export function add(a: number, b: number) { return a + b; }'],
    ];

    for (const [fPath, fContent] of workspaceFiles) {
      const welcomeNewBtn = page.locator('main#editor-workspace').getByRole('button', { name: 'New file' });
      if (await welcomeNewBtn.isVisible().catch(() => false)) {
        await welcomeNewBtn.click();
        const input = page.locator('#welcome-new-file').or(page.getByPlaceholder('filename.ts'));
        await input.first().fill(fPath);
        await input.first().press('Enter');
      } else {
        await page.getByTitle('Project root (click to select root folder)').click();
        await page.getByRole('button', { name: 'New file', exact: true }).first().click();
        await page.keyboard.type(fPath);
        await page.keyboard.press('Enter');
      }
      const editorTextarea = page.locator('main#editor-workspace textarea').first();
      await expect(editorTextarea).toBeVisible();
      await editorTextarea.fill(fContent);
    }

    // 1. Open Knowledge Graph, expand src/services group, select services/api.ts, and open Guide dialog
    await page.getByRole('button', { name: 'Knowledge graph' }).click();
    await expect(page.getByRole('group', { name: 'Graph exploration mode' })).toBeVisible();

    const servicesGroup = page.locator('.react-flow [data-node-id="group:src/services"]');
    await expect(servicesGroup).toBeVisible();
    await servicesGroup.dblclick();
    await page.getByRole('button', { name: 'Fit' }).click();
    const apiNode = page.locator('.react-flow [data-node-id]:has-text("services/api.ts")');
    await expect(apiNode).toBeVisible();
    await apiNode.click({ position: { x: 24, y: 14 } });
    await expect(apiNode).toHaveAttribute('data-selected', 'true');

    await page.getByTestId('graph-guide-button').click();
    const guideDialog = page.getByRole('dialog', { name: 'Knowledge Graph Guide' });
    await expect(guideDialog).toBeVisible();
    await expect(guideDialog.getByTestId('graph-guide-relationships')).toBeVisible();
    await guideDialog.getByRole('tab', { name: 'Node types' }).click();
    await expect(guideDialog.getByTestId('graph-guide-nodes')).toBeVisible();
    await guideDialog.getByRole('tab', { name: 'Interactions' }).click();
    await expect(guideDialog.getByTestId('graph-guide-interactions')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e5-1-graph-guide.png` });
    await guideDialog.getByRole('button', { name: 'Done' }).click();
    await expect(guideDialog).toBeHidden();

    // 2. Click Explorer file while in Knowledge Graph -> switches to Editor and opens math.ts
    await page.getByRole('button', { name: /math\.ts/ }).first().click();
    await expect(page.locator('main#editor-workspace textarea').first()).toContainText('export function add');

    // 3. Click Back in TopNav -> returns to Knowledge Graph with services group STILL expanded and api.ts STILL selected!
    await page.getByTestId('nav-back-button').click();
    await expect(page.locator('.react-flow [data-node-id]:has-text("services/api.ts")')).toBeVisible();
    await expect(page.locator('.react-flow [data-node-id]:has-text("services/api.ts")')).toHaveAttribute('data-selected', 'true');
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e5-2-graph-preserved.png` });

    // 4. Click Forward -> returns to Editor
    await page.getByTestId('nav-forward-button').click();
    await expect(page.locator('main#editor-workspace textarea').first()).toContainText('export function add');

    // 5. Editor Tab Actions: Pin tab, Close others, Reopen closed
    await page.getByTestId('editor-tab-actions-button').click();
    const tabMenu = page.getByTestId('editor-tab-actions-menu');
    await expect(tabMenu).toBeVisible();
    await tabMenu.getByRole('menuitem', { name: 'Pin tab' }).click();
    await expect(page.getByLabel('Pinned tab').first()).toBeVisible();

    await page.getByTestId('editor-tab-actions-button').click();
    await page.getByTestId('editor-tab-actions-menu').getByRole('menuitem', { name: 'Close others' }).click();
    await expect(page.getByRole('tab', { name: /math\.ts/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /auth\.ts/ })).toBeHidden();

    await page.getByTestId('editor-tab-actions-button').click();
    await page.getByTestId('editor-tab-actions-menu').getByRole('menuitem', { name: 'Reopen closed' }).click();
    await expect(page.getByRole('tab', { name: /api\.ts/ })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\phase-e5-3-tab-actions.png` });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('captures Semester 7 presentation screenshots using Task Management System fixture', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const demoFiles: Array<[string, string]> = [
      ['src/types/task.ts', 'export interface Task { id: string; title: string; status: "todo" | "done"; }'],
      ['src/utils/taskValidators.ts', 'import type { Task } from "../types/task";\nexport function validateTaskTitle(t: string) { return t.trim().length >= 3 ? null : "Too short"; }\nexport function isOverdueTask(task: Task) { return task.status !== "done"; }'],
      ['src/services/taskService.ts', 'import type { Task } from "../types/task";\nimport { validateTaskTitle, isOverdueTask } from "../utils/taskValidators";\nexport function createTask(title: string): Task | null { if (validateTaskTitle(title)) return null; return { id: "1", title, status: "todo" }; }\nexport function countPending(tasks: Task[]) { return tasks.filter(isOverdueTask).length; }'],
      ['src/components/TaskBoard.tsx', 'import { createTask, countPending } from "../services/taskService";\nexport function TaskBoard() { const t = createTask("Demo"); return t ? countPending([t]) : 0; }'],
    ];

    for (const [fPath, fContent] of demoFiles) {
      const welcomeNewBtn = page.locator('main#editor-workspace').getByRole('button', { name: 'New file' });
      if (await welcomeNewBtn.isVisible().catch(() => false)) {
        await welcomeNewBtn.click();
        const input = page.locator('#welcome-new-file').or(page.getByPlaceholder('filename.ts'));
        await input.first().fill(fPath);
        await input.first().press('Enter');
      } else {
        await page.getByTitle('Project root (click to select root folder)').click();
        await page.getByRole('button', { name: 'New file', exact: true }).first().click();
        await page.keyboard.type(fPath);
        await page.keyboard.press('Enter');
      }
      await page.locator('main#editor-workspace textarea').first().fill(fContent);
    }

    // 1. Main workspace
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\sem7-1-main-workspace.png` });

    // 2. Interactive Knowledge Graph
    await page.getByRole('button', { name: 'Knowledge graph' }).click();
    await expect(page.getByRole('group', { name: 'Graph exploration mode' })).toBeVisible();
    await page.getByRole('button', { name: 'Expand all', exact: true }).click();
    await page.getByRole('button', { name: 'Fit' }).click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\sem7-2-knowledge-graph.png` });

    // 3. Relationship inspector
    const firstEdgeLabel = page.locator('.react-flow__edgelabel-renderer button').first();
    if (await firstEdgeLabel.isVisible().catch(() => false)) {
      await firstEdgeLabel.click();
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\sem7-3-relationship-inspector.png` });

    // 4. Change Impact Analysis
    await page.getByRole('button', { name: 'Impact analysis' }).click();
    await expect(page.getByText('Impact analysis').first()).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\sem7-4-change-impact.png` });

    // 5. AI Assistant and project context
    await page.getByRole('button', { name: 'Back to editor' }).click();
    await page.getByRole('button', { name: /Assistant/i }).click();
    const projectContextBtn = page.getByRole('button', { name: /Project context/i });
    if (await projectContextBtn.isVisible().catch(() => false)) {
      await projectContextBtn.click();
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\sem7-5-ai-context.png` });

    // 6. Source Control
    await page.getByRole('button', { name: 'Source Control' }).click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\sem7-6-source-control.png` });

    // 7. Application Settings
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}\\sem7-7-settings.png` });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
