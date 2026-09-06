---
name: anil-teambuilder
description: >-
  Arma, analiza y optimiza equipos para los TORNEOS del Pokémon Añil Super Randomlocke
  del grupo, leyendo la partida real del jugador (save .rxdata) y los datos ya
  sincronizados en la web (data/players/*.json + pokedex/movimientos/habilidades/tipos).
  Formato fijo: singles 6v6, nivel 50, carta abierta. Úsala SIEMPRE que el usuario pida
  armar/elegir/optimizar/comparar un equipo o sets para un torneo o combate del randomlocke,
  cuando mencione "mi equipo", "torneo", "6v6", "nivel 50", "carta abierta", "contra
  [jugador]", o pregunte con qué Pokémon jugar, qué movimientos/habilidad/objeto ponerle,
  o cómo counterear el equipo de otro participante. Es un RANDOMLOCKE: habilidades,
  learnsets y MTs son aleatorios en cada partida, así que NUNCA asumas sets estándar de
  Pokémon competitivo: usa sólo lo que cada Pokémon puede realmente aprender en ESA partida.
---

# Team Builder — Añil Super Randomlocke

Ayuda a un participante a construir su mejor equipo de torneo con **sus Pokémon reales**
de la partida. No es Pokémon estándar: en este randomlocke las habilidades, los
learnsets de nivel y la compatibilidad de MTs están **randomizados por partida**, así que
las guías competitivas de internet no aplican. La única fuente de verdad es lo que el
jugador tiene y lo que sus Pokémon pueden aprender.

## Formato del torneo (fijo)
- **Singles 6 vs 6**, todos a **nivel 50**.
- **Carta abierta** (open team sheet): ambos jugadores ven el equipo completo del rival
  antes de empezar. Esto es clave: se puede (y se debe) hacer *counter-teaming* y planear
  el matchup con información perfecta.
- Se elige de los Pokémon **vivos** (equipo + cajas). El cementerio no cuenta.

## Paso 1 — Obtener el pool jugable

Usa el script incluido; hace todo el cruce de datos (save/JSON + pokedex + formas +
movimientos + habilidades + tabla de tipos) y calcula stats a nivel 50. Ejecútalo desde la
raíz del repo:

```bash
node .claude/skills/anil-teambuilder/scripts/anil-roster.js --player suken --out roster.json
```

- `--player <id>`: uno de `suken, DimasG, Copy, AL, Baldo, El_Headshot, DeathGun89`.
- Fuente de datos (automática):
  - Para **quien juega en esta PC** (normalmente `suken`), lee el **save real**
    `%APPDATA%/Pokemon Anil/Partida N.rxdata` (elige el más reciente; fija uno con
    `--slot 5` o `--save "ruta"`). Esto trae lo más fresco y completo, incluida la
    partida FUTURA cuando avance.
  - Para **los demás participantes**, cae automáticamente a `data/players/<id>.json`
    (lo que subió su companion). Fuérzalo con `--source json`.
- Guarda a un archivo con `--out roster.json` y **léelo con la tool Read** (es grande).
  Sin `--out` lo imprime por stdout.

Cada Pokémon del `pool` trae ya masticado:
- `species`, `types`, `id` nacional, `nature`, `item`.
- `lvl50Stats` = `[PS, Ataque, Defensa, At.Esp, Def.Esp, Velocidad]` a nivel 50 con sus
  IVs/EVs/naturaleza reales; `bst`, `speed50`.
- `abilityOptions` = `{ normal:[...], hidden:[...], individualRandomized:bool }` y
  `activeAbility` (la que tiene puesta ahora). Si `individualRandomized` es true, se le usó
  el item Randomizador y ese set es **exclusivo de ese Pokémon**.
- `movepool` = lista ÚNICA de lo que ESE Pokémon puede aprender en esta partida
  (movimientos actuales ∪ learnset randomizado ∪ MTs), cada uno con `t/cat/pow/acc/pp`,
  ordenado por poder. **De aquí eliges 4.** No inventes movimientos fuera de esta lista.
- `defense` = `{ weak:[[tipo, x2/x4], …], resist:[…], immune:[…] }` (tipos en español).
- `canMega` + `mega` (nombre, tipos, habilidad, `lvl50Stats` ya megaevolucionado) si lleva
  la piedra correspondiente. En singles con megas, la megaevolución ocurre en combate: usa
  las stats/tipos mega para el análisis ofensivo/defensivo, pero recuerda que el turno 1
  entra con tipos base.

Si el usuario quiere plan contra un rival concreto (carta abierta), genera también el
roster de ese rival y compáralos.

## Paso 2 — Construir el equipo

Piensa como en un metajuego de 6v6 singles nivel 50 con información perfecta. Prioriza, en
este orden:

1. **Coberturas ofensivas.** Junta los tipos de ataque del equipo y asegúrate de que entre
   los 6 puedan pegarle neutro o super-efectivo a los 18 tipos. Ojo con huecos comunes
   (p. ej. nada que hiera a Acero, o depender de un solo tipo).
2. **Sinergia defensiva.** Que las debilidades no se apilen: evita 3+ Pokémon débiles al
   mismo tipo. Busca que cada amenaza grande tenga al menos un buen switch-in (alguien que
   resista/sea inmune y aguante el golpe según `lvl50Stats`).
3. **Tiers de velocidad.** Ordena a los candidatos por `speed50`. En randomlocke la
   velocidad decide muchos matchups; ten al menos un par de Pokémon rápidos o una forma de
   ir primero (prioridad, o control de velocidad como paralización/pantallas si está en el
   movepool). Anota velocidades clave del rival cuando haya carta abierta.
4. **Roles.** Un equipo sano suele mezclar: 1–2 *sweepers/wallbreakers* (ofensivos con
   buen `Ataque`/`At.Esp` y coberturas), 1–2 *muros/pivotes* (bulk alto, recuperación o
   `Ida y Vuelta`/`Voltiocambio` si los tienen), y utilidad (hazards como `Trampa Rocas`,
   estados, `Estoicismo`/setup, o un *revenge killer* con prioridad). Adáptate a lo que el
   pool permita: en randomlocke a veces no hay recovery y hay que jugar más agresivo.
5. **Habilidad, naturaleza, objeto.** La habilidad es aleatoria pero fija por Pokémon
   (salvo Randomizador): elige el mejor rol asumiendo la `activeAbility`, y si otra opción
   del `abilityOptions` fuera claramente mejor, menciónalo (se puede cambiar con
   Cáps./Parche Habilidad en el juego). La naturaleza ya está fijada en el save: respétala
   y aprovéchala. Si lleva una mega piedra, valora si megaevolucionar le conviene.

Elige **6** y para cada uno propone **4 movimientos del `movepool`**, la **habilidad**,
el **objeto** (respeta el que ya lleva si es relevante; si no, sugiere uno genérico
razonable) y una línea de rol. Cuando falte algo ideal (no hay recovery, no hay STAB
físico, etc.), dilo con franqueza en vez de forzar un set irreal.

### Contra un rival (carta abierta)
Con el roster del rival: identifica sus 2–3 mayores amenazas (por stats+coberturas), sus
velocidades clave, y asegúrate de tener respuestas (resistencia + daño, o superarlo en
velocidad). Señala matchups a favor y en contra, y el plan de apertura (qué sacar primero
y por qué). No dependas de un solo Pokémon para frenar una amenaza (se lo pueden llevar).

## Paso 3 — Formato de salida

Entrega en español, claro y accionable. Usa esta estructura:

```
## Equipo sugerido para [Jugador] — Singles 6v6 Nv50, carta abierta

**Resumen del plan:** [2–3 frases: identidad del equipo, win condition, cómo abre]

### 1. [Apodo] (Especie) · [tipos]
- **Rol:** …
- **Naturaleza:** … · **Habilidad:** … · **Objeto:** …  (Mega: … si aplica)
- **Stats Nv50:** PS/Atk/Def/AtE/DeE/Vel = … (Total …)
- **Movimientos:** Mov1 · Mov2 · Mov3 · Mov4  — [por qué esos 4]
- **Cuida:** [sus debilidades relevantes]
… (los 6)

### Cobertura y sinergia
- Coberturas ofensivas: [tipos cubiertos / huecos]
- Debilidades apiladas: [alertas]
- Tiers de velocidad: [orden y umbrales clave]

### Suplentes / alternativas del pool
- [2–3 Pokémon que casi entran y para qué matchup meterlos]
```

Si es análisis contra rival, añade una sección **"Plan vs [rival]"** con amenazas del rival,
tus respuestas y el lead recomendado.

## Recordatorios (por qué esto importa)
- **Es randomlocke:** cíñete al `movepool` y `abilityOptions` calculados; un set "de manual"
  que el Pokémon no puede aprender en esta partida es inútil y confunde al jugador.
- **Todo a nivel 50:** razona con `lvl50Stats`, no con el nivel que tengan en el juego.
- **Datos frescos:** vuelve a correr el script cuando el jugador avance la partida o
  re-sincronice; el pool cambia (nuevas capturas, evoluciones, muertes, MTs encontradas).
- Si el script no encuentra el save, usará el JSON de la web (más limitado en learnsets/MTs
  si su companion está desactualizado); avísale al usuario cuando eso pase.
