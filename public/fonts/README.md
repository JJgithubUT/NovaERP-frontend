# Fuentes auto-hospedadas

No se cargan desde Google Fonts a propósito. NovaERP es offline-first: un CDN no
responde sin red, y los iconos de la navegación se degradarían a su nombre en
texto plano (`dashboard`, `inventory_2`). Sirviéndolas desde aquí, el Service
Worker las precachea junto al resto del shell. De paso, deja de enviarse la IP
de cada usuario a Google en cada carga.

Las declara `src/styles.css`.

## Archivos

| Archivo | Familia | Licencia |
| --- | --- | --- |
| `inter-latin.woff2`, `inter-latin-ext.woff2` | Inter (variable, 100–900) | [OFL 1.1](https://github.com/rsms/inter/blob/master/LICENSE.txt) |
| `jetbrains-mono-latin.woff2`, `jetbrains-mono-latin-ext.woff2` | JetBrains Mono (variable, 400–700) | [OFL 1.1](https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt) |
| `material-symbols-outlined.subset.woff2` | Material Symbols Outlined | [Apache 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE) |

Total: ~256 kB. Las tres licencias permiten la redistribución.

## Por qué solo `latin` y `latin-ext`

Google sirve una fuente por alfabeto. Bajamos solo los dos subsets latinos: el
cirílico, el griego y el vietnamita son peso muerto para un ERP en español.
`latin-ext` sí hace falta — cubre acentos y `€`.

## El icon font está subseteado

La fuente completa de Material Symbols pesa varios MB, inaceptable para
precachear. Está subseteada a los **111 iconos** que usa la app, y así pesa
73 kB.

**Si usas un icono que no esté en el subset, no se verá** — aparecerá su nombre
en texto, y nada falla ruidosamente: el build pasa y el error solo se ve en
pantalla. Para comprobarlo sin mirar una a una, mide el ancho renderizado con
el dev server levantado: un ligature resuelto ocupa 1em (20 px a `font-size:
20px`); uno que cayó a texto ocupa varias veces más.

```js
// En la consola del navegador, sobre la app cargada.
const s = document.createElement('span');
s.className = 'icon'; s.style.fontSize = '20px'; s.textContent = 'visibility';
document.body.append(s);
s.getBoundingClientRect().width;  // ~20 = bien · ~200 = falta en el subset
```

Para regenerarla con iconos nuevos:

```bash
# 1. Lista los iconos: los de las plantillas MÁS los que usa el código de la app.
#
#    Ojo: durante mucho tiempo esta lista salía solo de templatesejemplos/, y por
#    eso faltaban `light_mode` y `visibility` — se usan en el shell y en el login
#    pero en ninguna plantilla, así que se veían como texto literal. Si vuelves a
#    generar la lista, incluye siempre las dos fuentes.
#    El grep de la app tiene que cubrir las tres formas en que se nombra un
#    icono, no solo la estática: `name="x"`, el binding `[name]="c ? 'x' : 'y'"`
#    y los mapas de navegación (`icon: 'x'`). Justamente los dos que faltaban
#    eran dinámicos, y un grep de `name="…"` a secas los vuelve a perder.
PLANTILLAS=$(grep -ohE 'material-symbols-outlined[^>]*>[a-z_0-9]+<' templatesejemplos/*/code.html \
  | sed -E 's/.*>([a-z_0-9]+)<.*/\1/')
APP=$(grep -rhoE "name=\"[a-z_0-9]+\"|\[name\]=\"[^\"]*\"|icono?: '[a-z_0-9]+'" src/app --include='*.ts' \
  | grep -oE "\"[a-z_0-9]+\"|'[a-z_0-9]+'" | tr -d "\"'")
ICONS=$(printf '%s\n%s\n' "$PLANTILLAS" "$APP" | sort -u | tr '\n' ',' | sed 's/,$//')

# 2. Pide el CSS con la fuente subseteada (hace falta UA de navegador)
curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,0&icon_names=${ICONS}&display=block" -o /tmp/ms.css

# 3. Baja el woff2 que referencia
URL=$(grep -oE 'url\(https://fonts.gstatic.com[^)]*\)' /tmp/ms.css | head -1 | sed 's/^url(//; s/)$//')
curl -s "$URL" -o public/fonts/material-symbols-outlined.subset.woff2
```

El eje `FILL` (0..1) se conserva: las plantillas lo usan para marcar el ítem
activo del sidebar con el icono relleno.
