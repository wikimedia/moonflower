import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'maryyann', 'different themes', 'dist');
const dest = join(root, 'static', 'maryyann', 'different-themes');

if (!existsSync(dist)) {
	console.error(
		'sync-different-themes: missing dist folder. Run `npm run build` in `maryyann/different themes` first.'
	);
	process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(join(root, 'static', 'maryyann'), { recursive: true });
cpSync(dist, dest, { recursive: true });
console.log('sync-different-themes: copied to', dest);
