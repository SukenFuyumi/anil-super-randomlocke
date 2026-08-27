# Añil Sync — companion del Super Randomlocke

Programa que **vigila tu partida de Pokémon Añil y sube tu ficha a la web automáticamente**: equipo, caja, cementerio, medallas, vidas y tiempo. Al guardar en el juego, tu página se actualiza sola.

Funciona leyendo el save `.rxdata` (Pokémon Essentials v21) y subiéndolo al repositorio de la web vía la API de GitHub.

---

## Para el jugador (uso)

1. Descarga **`AnilSync.exe`** (carpeta `dist/`) y ponlo en una carpeta suya, p. ej. `C:\AnilSync\`.
2. **Doble clic** una vez. Se creará un archivo **`config.json`** al lado y se cerrará pidiendo que lo rellenes.
3. Abre `config.json` con el Bloc de notas y rellena:
   - `playerId`: tu id en la web (el mismo que aparece en `data/config.json` → `players`, p. ej. `"suken"`).
   - `github.owner`: el usuario/organización dueño del repo (te lo da el organizador).
   - `github.repo`: el nombre del repositorio (p. ej. `"anil-randomlocke"`).
   - `github.token`: tu token de GitHub (ver abajo cómo crearlo).
4. Guarda y vuelve a hacer **doble clic** en `AnilSync.exe`. Deja la ventana abierta mientras juegas.
5. Cada vez que **guardes en el juego**, tu ficha se sube sola. ✔

> Consejo: para que arranque solo al encender el PC, pulsa `Win + R`, escribe `shell:startup` y pega ahí un acceso directo a `AnilSync.exe`.

### Opciones de `config.json`
- `saveSlot`: `"auto"` (usa la partida más reciente) o un número, p. ej. `"4"` para forzar *Partida 4*.
- `saveFolder`: déjalo `""` para autodetectar `%APPDATA%\Pokemon Anil`. Solo cámbialo si tus saves están en otro sitio.
- `watch`: `true` = vigila y sube al guardar. `false` = sube una vez y termina.
- `dryRun`: `true` = **modo prueba**, genera el `<id>.json` en local pero **no sube** nada (útil para probar sin token).

---

## Crear el token de GitHub (una vez)

El token deja que el programa escriba tu `<id>.json` en el repo.

1. Entra en GitHub → *Settings* → *Developer settings* → **Fine-grained tokens** → *Generate new token*.
2. **Repository access**: *Only select repositories* → elige el repo del randomlocke.
3. **Permissions** → *Repository permissions* → **Contents: Read and write**.
4. Genera y copia el token (`github_pat_…`) en `config.json` → `github.token`.

> El organizador puede crear el repo y pasar a cada jugador un token con acceso solo a ese repo. El token es personal: no lo compartas públicamente ni lo subas al repositorio.

---

## Para el organizador / desarrollo

Estructura:
```
anil-sync.js        · programa principal (watcher + subida a GitHub)
extract.js          · save .rxdata -> JSON de la web
marshal.js          · lector de Ruby Marshal 4.8
move-es.json        · movimiento (id) -> nombre español
pokemon-types.json  · especie -> tipos (español)
config.example.json · plantilla de configuración
dist/AnilSync.exe   · ejecutable Windows (no requiere Node)
```

Ejecutar desde código (requiere Node 18+):
```bash
node anil-sync.js
```

Recompilar el `.exe` (requiere Node en la máquina de build):
```bash
npx @yao-pkg/pkg . --output dist/AnilSync.exe
```

**Nota de despliegue:** no publiques el `.exe` como parte del sitio de GitHub Pages (son 57 MB). Distribúyelo aparte (una *Release* de GitHub, un enlace de descarga, etc.). Mantén `config.json` **fuera** del repositorio (contiene tokens).

### Qué se extrae del save
| Web | Origen en el save (Essentials v21) |
|-----|-------------------------------------|
| Equipo | `player.@party` (sin `@perma_faint`) |
| Caja | `storage_system.@boxes` (sin `@perma_faint`) |
| Cementerio | cualquier Pokémon con `@perma_faint == true` |
| Medallas → gimnasios | `player.@badges` |
| Vidas usadas | nº de muertos (`@perma_faint`) |
| Notas (tiempo, dinero, vidas del juego) | `stats.@play_time`, `player.@money`, `global_metadata.@challenge_lives` |

Cada Pokémon: especie, apodo (`@name`), nivel, tipos, habilidad, naturaleza, objeto, shiny y 4 movimientos (traducidos al español).

### Pendiente / mejorable
- Mapear IDs de mapa (`@obtain_map`, `visitedMaps`) → nombres de ruta de Añil, para autollenar **capturas/rutas** y el sitio de muerte en el cementerio.
- Mapa de **habilidades** y **objetos** al español (ahora salen en inglés prettificado).
- Algunas especies con formas (Gourgeist, Aegislash, Basculin) no resuelven tipos por el nombre base; afinar el mapa de tipos.
