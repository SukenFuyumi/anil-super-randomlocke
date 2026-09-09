# 🚀 Cómo publicar una nueva versión de AnilSync

Con esto, tus mejoras del companion llegan **automáticamente a todos los grupos** (AnilSync busca actualizaciones en el repo oficial `SukenFuyumi/anil-super-randomlocke`).

> Requisitos: Node.js instalado y `gh` (GitHub CLI) con sesión iniciada (`gh auth status`).

## Pasos

1. **Haz tus cambios** en `companion/extract.js` y/o `companion/anil-sync.js`.

2. **Sube el número de versión** (usa el mismo en los 3 sitios, ej. `1.3.3`):
   - `companion/anil-sync.js` → `const VERSION = '1.3.3';`
   - `companion/package.json` → `"version": "1.3.3"`
   - `companion/latest-version.json` → `{ "version": "1.3.3", "notes": "qué cambió" }`

3. **Recompila el .exe** (desde `companion/`):
   ```bash
   npx --yes @yao-pkg/pkg@latest anil-sync.js --config package.json --targets node22-win-x64 --output dist/AnilSync.exe
   ```
   (Comprueba que el `.exe` contiene la versión nueva: `grep -c "1.3.3" dist/AnilSync.exe`.)

4. **Sube los cambios** (el `.exe` NO se commitea, está en `.gitignore`; va solo al release):
   ```bash
   git checkout -- data/players/suken.json   # (por si el companion auto-empujó)
   git add companion/anil-sync.js companion/extract.js companion/package.json companion/latest-version.json
   git commit -m "AnilSync v1.3.3: <resumen>"
   git pull --rebase origin main && git push origin main
   ```

5. **Crea el release** (marca "latest" para que el auto-update lo tome):
   ```bash
   gh release create v1.3.3 companion/dist/AnilSync.exe --title "AnilSync v1.3.3" --latest --notes "<qué cambió>"
   ```

¡Listo! En cuanto los jugadores abran (o tengan abierto) AnilSync, verán la actualización y se pondrá al día solo.

## Notas
- El auto-update compara `VERSION` (dentro del .exe) contra `companion/latest-version.json` del repo oficial, y descarga `AnilSync.exe` del **release marcado como Latest**. Por eso los 3 números deben coincidir y el release debe ser `--latest`.
- Los grupos creados **antes** de la v1.3.2 (que aún revisaban su propia copia) quedaron congelados; a partir de la v1.3.2 todos se actualizan desde el repo oficial.
- La **web** (páginas HTML/JS) se actualiza aparte: basta con `git push` — GitHub Pages la sirve al instante para tu grupo. Los grupos ajenos son copias estáticas (ver `SETUP.md`).
