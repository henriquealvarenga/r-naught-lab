/**
 * scripts/build.mjs
 * -----------------------------------------------------------------------------
 * Gera um HTML AUTOCONTIDO (dist/epidemic-sim-preview.html) a partir do codigo
 * modular em src/. Bundla o JS com esbuild, inlina o CSS e injeta ambos no
 * template index.html. O resultado abre direto no navegador via file:// (sem
 * servidor), util para demonstracao rapida. O codigo-fonte permanece modular.
 *
 *   node scripts/build.mjs      (ou: npm run build)
 */

import esbuild from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function build() {
  // 1) Bundla o JS (IIFE, autocontido)
  const result = await esbuild.build({
    entryPoints: [join(root, 'src/main.js')],
    bundle: true,
    format: 'iife',
    write: false,
    minify: false,
    target: ['es2020'],
  });
  const js = result.outputFiles[0].text;

  // 2) Le CSS e template HTML
  const css = await readFile(join(root, 'src/ui/styles.css'), 'utf8');
  let html = await readFile(join(root, 'index.html'), 'utf8');

  // 3) Inlina CSS e JS
  html = html.replace(
    '<link rel="stylesheet" href="./src/ui/styles.css" />',
    `<style>\n${css}\n</style>`
  );
  html = html.replace(
    '<script type="module" src="./src/main.js"></script>',
    `<script>\n${js}\n</script>`
  );

  await mkdir(join(root, 'dist'), { recursive: true });
  const out = join(root, 'dist/epidemic-sim-preview.html');
  await writeFile(out, html, 'utf8');
  console.log('OK -> dist/epidemic-sim-preview.html (' + (html.length / 1024).toFixed(0) + ' KB)');
}

build().catch((e) => { console.error(e); process.exit(1); });
