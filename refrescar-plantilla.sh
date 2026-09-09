#!/usr/bin/env bash
# ============================================================================
#  Refresca el repo-plantilla (anil-tracker-template) con el estado ACTUAL de
#  este sitio, pero LIMPIO: sin datos de jugador y con config vacío.
#
#  Úsalo cuando mejores la web y quieras que los nuevos grupos reciban lo último.
#  Requisitos: git, node y gh (con sesión iniciada). Ejecuta desde la raíz del repo:
#     bash refrescar-plantilla.sh
# ============================================================================
set -e

TEMPLATE_URL="https://github.com/SukenFuyumi/anil-tracker-template.git"
WORK="$(mktemp -d)"
CLONE="$(mktemp -d)"
trap 'rm -rf "$WORK" "$CLONE"' EXIT

echo "1/4  Exportando archivos versionados del sitio…"
git archive HEAD | tar -x -C "$WORK"
rm -f "$WORK"/data/players/*.json 2>/dev/null || true

echo "2/4  Generando config limpio (title genérico, players vacío)…"
node -e "
const c=require('./data/config.json');
c.title='Mi Randomlocke';
c.repo={ owner:'TU-USUARIO', name:'mi-randomlocke', branch:'main' };
c._ayuda='Plantilla lista para tu grupo. Opcional: cambia el title. NO anadas jugadores a mano: cada uno se registra solo al sincronizar con AnilSync. Guia: guia.html';
c.players=[];
process.stdout.write(JSON.stringify(c,null,2)+'\n');
" > "$WORK/data/config.json"

echo "3/4  Clonando la plantilla y actualizando su contenido…"
git clone -q "$TEMPLATE_URL" "$CLONE"
git -C "$CLONE" rm -rq . >/dev/null 2>&1 || true   # limpia el índice/worktree (conserva .git)
cp -a "$WORK"/. "$CLONE"/                            # copia el contenido nuevo y limpio

echo "4/4  Publicando cambios en la plantilla…"
git -C "$CLONE" add -A
if git -C "$CLONE" diff --cached --quiet; then
  echo "   (la plantilla ya estaba al día, nada que publicar)"
else
  git -C "$CLONE" commit -q -m "Refrescar plantilla desde el sitio principal"
  git -C "$CLONE" push -q
  echo "   ✓ Plantilla actualizada."
fi
