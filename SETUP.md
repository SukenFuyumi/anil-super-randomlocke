# 🧩 Monta tu propia web de seguimiento (tracker)

Esta web es **estática y gratis**: se aloja en **GitHub Pages** y el programa **AnilSync** sube tu partida automáticamente. No necesitas servidores ni saber programar. Sigue estos pasos y tendrás tu propio tracker para tu grupo.

> Cada grupo tiene su propia copia y sus propios datos, totalmente independiente.

---

## ✅ Requisitos
- Una cuenta de **GitHub** (gratis) — al menos el que va a administrar la web.
- El programa **AnilSync** (`AnilSync.exe`) — uno por cada jugador.

---

## Paso 1 — Copia esta web a tu cuenta
1. En la página del repo, pulsa el botón verde **"Use this template" → "Create a new repository"**.
2. Ponle un **nombre** (ej. `mi-randomlocke`), déjalo en **Public** (para que Pages sea gratis) y pulsa **Create repository**.

Ahora tienes tu propia copia en `github.com/TU-USUARIO/mi-randomlocke`.

---

## Paso 2 — Activa la web (GitHub Pages)
1. En **tu** repo: **Settings** → **Pages**.
2. En *Source* elige **Deploy from a branch**.
3. *Branch*: **main** y carpeta **/(root)** → **Save**.
4. Espera 1–2 minutos. Arriba aparecerá tu URL:
   `https://TU-USUARIO.github.io/mi-randomlocke`

Esa es la web que compartirás con tu grupo.

---

## Paso 3 — Personaliza tu grupo (`data/config.json`)
En tu repo, entra a **`data/config.json`** y pulsa el lápiz ✏️ (*Edit*). Cambia:

- `title`, `subtitle`, `season`, `region`, `totalLives` → a tu gusto.
- `repo` → **tu** repo:
  ```json
  "repo": { "owner": "TU-USUARIO", "name": "mi-randomlocke", "branch": "main" }
  ```
- `players` → la lista de jugadores de tu grupo. **El `id` debe ser único y NO cambiarlo** una vez creado:
  ```json
  "players": [
    { "id": "ash",  "name": "Ash",  "avatar": "assets/avatars/red.png" },
    { "id": "gary", "name": "Gary", "avatar": "assets/avatars/blue.png" }
  ]
  ```
  (Los avatares están en `assets/avatars/`. Puedes reutilizar los que hay o subir los tuyos.)

Pulsa **Commit changes** para guardar.

---

## Paso 4 — Da acceso a tus jugadores
Para que AnilSync pueda subir la partida de cada quien, cada jugador necesita permiso de escritura:

1. En tu repo: **Settings** → **Collaborators** → **Add people** → añade el usuario de GitHub de cada amigo.
2. Cada amigo **acepta la invitación** (le llega por correo o en `github.com/notifications`).

*(Si juegas solo, sáltate esto: ya eres el dueño.)*

---

## Paso 5 — Cada jugador crea su “llave” (token)
Cada jugador (incluido tú) necesita un **token** para que AnilSync suba sus datos:

1. Entra a **https://github.com/settings/tokens?type=beta** → **Generate new token** (*fine-grained*).
2. *Token name*: lo que quieras (ej. `anilsync`). *Expiration*: 90 días o *No expiration*.
3. *Repository access* → **Only select repositories** → elige el repo del grupo.
4. *Permissions* → **Repository permissions** → busca **Contents** → ponlo en **Read and write**.
5. **Generate token** y **copia** el código (empieza con `github_pat_...`). ⚠️ Guárdalo, solo se muestra una vez.

> 🔒 El token es como una contraseña. No lo compartas ni lo subas a ningún sitio; solo va en tu `config.json` local.

---

## Paso 6 — Configura y ejecuta AnilSync
1. Descarga **`AnilSync.exe`** (de la sección *Releases* del proyecto). Sirve para cualquier repo; se configura con el archivo de al lado.
2. En la misma carpeta que el `.exe`, crea/edita **`config.json`** (parte de `config.example.json`):
   ```json
   {
     "playerId": "ash",
     "saveFolder": "",
     "saveSlot": "ask",
     "github": {
       "owner": "TU-USUARIO",
       "repo": "mi-randomlocke",
       "branch": "main",
       "token": "github_pat_PEGA_AQUI_TU_TOKEN",
       "pathTemplate": "data/players/{id}.json"
     },
     "watch": true,
     "dryRun": false
   }
   ```
   - `playerId`: **igual** al `id` que pusiste en `data/config.json` (ej. `ash`).
   - `owner`/`repo`/`branch`: el repo del grupo.
   - `token`: el que copiaste en el Paso 5.
3. **Doble clic en `AnilSync.exe`**. Si te pregunta, elige tu ranura de partida.
4. Deja la ventana abierta mientras juegas: cada vez que **guardes** en el juego, AnilSync sube tu progreso solo.

---

## 🎉 ¡Listo!
Juega y guarda normalmente. En ~1 minuto tu web `https://TU-USUARIO.github.io/mi-randomlocke` mostrará tu equipo, cementerio, medallas, capturas por ruta, etc. — de todos los jugadores del grupo.

---

## 🛠️ Problemas comunes
- **La web no aparece / da 404:** espera unos minutos tras activar Pages; revisa que la rama sea `main` y carpeta `/(root)`.
- **AnilSync dice error de permisos (403):** el token no tiene **Contents: Read and write**, o no eres *Collaborator* del repo, o `owner`/`repo` están mal escritos.
- **No sube nada:** revisa que `playerId` exista en la lista `players` de `data/config.json`, y que el juego esté guardando en la partida correcta.
- **No aparece un jugador en la web:** falta su entrada en `players` de `data/config.json` (con el mismo `id`).
