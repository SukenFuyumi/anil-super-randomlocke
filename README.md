# Pokémon Añil — Super Randomlocke

Web estática para seguir un randomlocke de Pokémon Añil: equipos, cajas, cementerio, progreso (rutas, capturas, gimnasios, bosses, NPCs) y brackets de torneos. Mismo diseño que [Cobbleverse Dex](https://sukenfuyumi.github.io/).

## Estructura

```
index.html        · Dashboard con todos los participantes
jugador.html      · Perfil individual (equipo / caja / cementerio / progreso)
progresion.html   · Matriz comparativa de avance
torneos.html      · Generador de brackets (eliminación directa)
reglas.html       · Reglas del randomlocke
editor.html       · Editor de datos de cada jugador
styles.css        · Sistema de diseño (tema claro/oscuro)
app.js            · Núcleo compartido
data/config.json  · Jugadores, gimnasios, bosses, NPCs, rutas, torneos
data/players/*.json · Datos de cada jugador
favicon.svg
```

## Cómo publicar en GitHub Pages

1. Sube todos estos archivos a un repositorio (por ejemplo `anil-randomlocke`).
2. En **Settings → Pages**, elige la rama (`main`) y carpeta `/root`.
3. Listo: la web queda en `https://<usuario>.github.io/anil-randomlocke/`.

> Nota: la web carga los JSON con `fetch`, así que **no funciona abriendo el HTML con doble clic** (`file://`). Para verla en local usa un servidor:
> ```bash
> python -m http.server 8000
> ```
> y abre `http://localhost:8000`.

## Cómo añadir/editar datos de un jugador

1. Abre **Editor** en la web.
2. Elige el jugador (o edita `data/config.json` para añadir uno nuevo).
3. Rellena equipo, caja, cementerio, capturas y progreso.
4. **Guardar borrador**: lo ves al instante en tu navegador (solo en tu dispositivo).
5. **Exportar JSON**: descarga `<id>.json`. Colócalo en `data/players/` y súbelo al repo para que lo vean todos.

## Objetos del suelo (guía compartida)

`data/config.json` → `groundItems` define las **ubicaciones fijas** de objetos del mapa (compartidas por todos): `{ id, zone, note }`. La página **Objetos** las muestra agrupadas por zona con quién ha obtenido cada una. Cada jugador marca los que obtuvo en el Editor (pestaña *Objetos*), y se guarda en `progress.items` de su JSON. El organizador añade/edita las ubicaciones en `groundItems`.

## Movimientos con color por tipo

Los movimientos se **colorean automáticamente** según su tipo (ej. "Rayo" → eléctrico) usando `data/moves-es.json` (mapa nombre ES/EN → tipo, generado de PokeAPI). Si un movimiento no está en el mapa, sale como chip neutro. Puedes forzar el tipo escribiendo el movimiento como `Nombre|Tipo` (ej. `Corte Vacío|Siniestro`).

## Imágenes y sprites

- **Iconos de Pokémon**: se resuelven solos a partir del nombre (español o inglés) usando `data/pokedex-es.json` (mapa nombre→nº de Pokédex) y se cargan desde el CDN oficial de PokeAPI (`raw.githubusercontent.com/PokeAPI/sprites`). Necesitan conexión; si fallan, se muestran las iniciales. Puedes forzar un sprite concreto poniendo una URL en el campo *Sprite* del editor.
- **Líderes, Alto Mando y NPCs**: sprites de entrenador guardados en `assets/trainers/` (autohospedados, no dependen de internet). Para cambiar la imagen de un reto, edita su campo `image` en `data/config.json`.
- **Avatares de jugador**: hay 14 sprites de protagonista en `assets/avatars/`. Se asignan por defecto en `data/config.json` (`avatar`), y cada jugador puede cambiar el suyo en el Editor (pestaña Info: selector con vista previa, o pegar una URL propia). El avatar del jugador (dato) tiene prioridad sobre el de la config.

## Región: Kanto

La config trae los 8 gimnasios de Kanto (Brock → Giovanni) con líder, tipo y ciudad reales, el Alto Mando (Lorelei, Bruno, Agatha, Lance), el Campeón y las rutas de Kanto en orden. Como el randomlocke randomiza los equipos de los líderes, sus **identidades y orden** se mantienen aunque su equipo cambie. Ajusta nombres/tipos si tu partida de Añil difiere.

## Configurar el randomlocke

Edita `data/config.json`:

- `players`: id (único, no cambiar), nombre, color y avatar (URL opcional).
- `gyms`, `bosses`, `npcs`, `routes`, `tournaments`: cada uno con `id` único y `name`.
- Los `id` se usan para marcar el progreso, así que **no los cambies** una vez creados.

## Fase 2 (opcional): auto-volcado desde la partida

Pokémon Añil (RPG Maker XP / Essentials) guarda en archivos `.rxdata` (objetos Ruby serializados con `Marshal`). Un volcado automático requeriría:

1. Un **parser** del `.rxdata` (hay que hacer ingeniería inversa con un save real de ejemplo; es frágil y puede romperse al actualizar el juego).
2. Un pequeño **programa "companion"** por jugador que vigile la carpeta de saves y haga commit al repo con un token de GitHub (GitHub Pages es estático y no puede recibir nada por sí solo).

El formato de datos de esta Fase 1 (`data/players/<id>.json`) ya sirve como destino de ese volcado, así que no se pierde trabajo.
