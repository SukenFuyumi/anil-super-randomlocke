# 🧩 Monta tu propia web de seguimiento (tracker)

> **🟢 Guía fácil y visual (recomendada):** https://sukenfuyumi.github.io/anil-super-randomlocke/guia.html
> **⬇️ Descargar AnilSync (1 clic):** https://github.com/SukenFuyumi/anil-super-randomlocke/releases/latest/download/AnilSync.exe

Esta web es **estática y gratis**: se aloja en **GitHub Pages** y el programa **AnilSync** sube tu partida automáticamente. No necesitas servidores ni saber programar. Sigue estos pasos y tendrás tu propio tracker para tu grupo.

> Cada grupo tiene su propia copia y sus propios datos, totalmente independiente.

---

## ✅ Cómo se reparten los roles
- **Solo el organizador** (1 persona) usa GitHub: crea la web y genera una "llave" (token) para cada jugador.
- **Cada jugador NO necesita cuenta de GitHub**: solo descarga AnilSync y pega la llave que le pasó el organizador.

---

# PARTE 1 — El organizador (una sola vez)

Necesitas una cuenta de **GitHub** (gratis, créala en github.com si no tienes).

## Paso 1 — Copia esta web a tu cuenta
1. Abre la plantilla: **https://github.com/SukenFuyumi/anil-tracker-template** → botón verde **"Use this template" → "Create a new repository"**.
2. Ponle un **nombre** (ej. `mi-randomlocke`), déjalo en **Public** (para que Pages sea gratis) y pulsa **Create repository**.

La plantilla ya viene **vacía y lista**: no hay que configurar jugadores.

## Paso 2 — Activa la web (GitHub Pages)
1. En **tu** repo: **Settings** → **Pages**.
2. En *Source* elige **Deploy from a branch** → rama **main** → carpeta **/(root)** → **Save**.
3. Espera 1–2 minutos. Aparecerá tu URL: `https://TU-USUARIO.github.io/mi-randomlocke`

> 💡 **No añadas jugadores a mano.** Cada jugador **se registra solo** en la web la primera vez que sincroniza con AnilSync (con su nombre y un avatar automático). *(Opcional: si quieres cambiar el título del grupo, edita `title` en `data/config.json`.)*

## Paso 3 — Crea una “llave” (token) para cada jugador y repártela
1. Entra a **https://github.com/settings/tokens?type=beta** → **Generate new token** (*fine-grained*).
2. *Token name*: el nombre del jugador (ej. `anilsync-ash`). *Expiration*: 90 días o *No expiration*.
3. *Repository access* → **Only select repositories** → tu repo del grupo.
4. *Permissions* → **Repository permissions** → **Contents** → **Read and write**.
5. **Generate token**, **copia** el código (`github_pat_...`) y **dáselo a ese jugador**.
6. Repite para cada jugador.

> 💡 Si quieres lo más simple, puedes crear **una sola llave** y dársela a todos. Una por jugador es más seguro (puedes borrar la de uno sin afectar a los demás).
> 🔒 Las llaves son como contraseñas de tu repo: pásalas en privado. Si una se filtra, bórrala desde el mismo enlace.

---

# PARTE 2 — Cada jugador (una sola vez)

**No necesitas cuenta de GitHub.** Solo esto:

## Paso 1 — Descarga AnilSync
Baja **`AnilSync.exe`** (enlace directo): https://github.com/SukenFuyumi/anil-super-randomlocke/releases/latest/download/AnilSync.exe
Ponlo en una carpeta cualquiera.

## Paso 2 — Pide tu llave al organizador
Es un código que empieza con `github_pat_...`. El organizador te lo genera y te lo pasa (Paso 3 de arriba). Guárdalo en privado.

## Paso 3 — Crea tu `config.json`
Junto al `AnilSync.exe`, crea un archivo **`config.json`** con esto (cambia lo que va entre `<>`):
```json
{
  "playerId": "ash",
  "saveFolder": "",
  "saveSlot": "ask",
  "github": {
    "owner": "TU-USUARIO",
    "repo": "mi-randomlocke",
    "branch": "main",
    "token": "github_pat_LA_LLAVE_QUE_TE_DIERON",
    "pathTemplate": "data/players/{id}.json"
  },
  "watch": true,
  "dryRun": false
}
```
- `playerId`: **igual** al `id` que el organizador puso en la lista de jugadores.
- `owner`/`repo`: el repo del grupo (te los da el organizador).
- `token`: la llave que te dieron.

## Paso 4 — Ejecuta
**Doble clic en `AnilSync.exe`**. Si te pregunta, elige tu ranura de partida. Deja la ventana abierta mientras juegas: cada vez que **guardes**, tu progreso sube solo. 🎉

---

## 🎉 ¡Listo!
En ~1 minuto la web `https://TU-USUARIO.github.io/mi-randomlocke` mostrará el equipo, cementerio, medallas y capturas de todos los jugadores.

---

## 🛠️ Problemas comunes
- **La web da 404:** espera unos minutos tras activar Pages; revisa rama `main` y carpeta `/(root)`.
- **AnilSync error 403 (permisos):** la llave no tiene **Contents: Read and write** o no apunta a ese repo, o `owner`/`repo` están mal escritos. Pídele al organizador que te regenere la llave.
- **No sube nada:** revisa que `playerId` exista en la lista `players`, y que el juego guarde en la partida correcta.
- **No aparece un jugador:** falta su entrada en `players` de `data/config.json` (con el mismo `id`).
