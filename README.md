# Precios Carburantes — Aplicación de consulta

Aplicación web que consume la API REST pública del Ministerio para la Transición
Ecológica y el Reto Demográfico para mostrar:

1. **Estaciones de servicio por comunidad autónoma** — el usuario selecciona una
   CCAA y se listan las estaciones pertenecientes a la misma.
2. **Postes marítimos por provincia** — el usuario selecciona una provincia y se
   listan los postes marítimos de la misma.
3. **Precios de los carburantes por provincia, día y carburante** — el usuario
   selecciona los tres parámetros y se listan los precios de las estaciones de
   esa provincia, en esa fecha, para ese carburante (ordenados de menor a mayor
   precio, con mínimo, máximo y media).

---

## 1. Tecnología

| Elemento | Decisión |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript (vanilla, sin frameworks) |
| Build / dependencias | Ninguna — no requiere `npm`, `node` ni compilación |
| Fuente de datos | API REST pública del Ministerio (sin autenticación) |
| CORS | La API envía `Access-Control-Allow-Origin: *`, por lo que las llamadas se hacen directamente desde el navegador sin proxy intermedio |
| Hospedaje (opcional) | GitHub Pages, Netlify, Cloudflare Pages u otro hosting estático |

### Endpoints utilizados

Base: `https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes`

| Funcionalidad | Endpoint |
|---|---|
| Listado CCAA | `GET /Listados/ComunidadesAutonomas/` |
| Listado provincias | `GET /Listados/Provincias/` |
| Listado productos petrolíferos | `GET /Listados/ProductosPetroliferos/` |
| Estaciones por CCAA | `GET /EstacionesTerrestres/FiltroCCAA/{IDCCAA}` |
| Postes marítimos por provincia | `GET /PostesMaritimos/FiltroProvincia/{IDProvincia}` |
| Precios histórico filtrados | `GET /EstacionesTerrestresHist/FiltroProvinciaProducto/{FECHA}/{IDProvincia}/{IDProducto}` |

> El parámetro `FECHA` debe enviarse en formato `DD-MM-AAAA`.

---

## 2. Estructura del proyecto

```
actividad 3/
├── index.html      ← punto de entrada de la SPA
├── styles.css      ← estilos
├── app.js          ← lógica (fetch, render, filtros, tabs)
├── README.md       ← este documento
└── PreciosCarburantes-soapui-project.xml   ← proyecto SoapUI (referencia)
```

Ningún fichero generado: el código es directamente ejecutable.

---

## 3. Instalación / configuración

### Opción A — Ejecución en local (más rápida)

1. Descomprimir el ZIP entregado en una carpeta cualquiera.
2. Abrir el fichero `index.html` con cualquier navegador moderno (Chrome, Edge,
   Firefox, Safari).
   - Doble click sobre `index.html`, o
   - botón derecho → *Abrir con* → navegador.
3. La aplicación carga automáticamente los listados desde la API y queda lista
   para usarse.

> No se requiere ningún servidor web; la app se sirve desde el sistema de
> ficheros (`file://`) y las llamadas a la API funcionan gracias a las
> cabeceras CORS abiertas que devuelve el ministerio.

### Opción B — Ejecución con servidor local (recomendado para desarrollo)

Si se quiere evitar `file://` (algunos navegadores aplican restricciones extra),
se puede levantar un servidor estático. Cualquiera de estos comandos vale,
ejecutados desde la carpeta del proyecto:

```bash
# Si se tiene Python instalado:
python -m http.server 8080

# Si se tiene Node instalado:
npx serve .
```

Y abrir `http://localhost:8080` en el navegador.

### Opción C — Despliegue público en GitHub Pages

1. Crear un repositorio nuevo en GitHub (por ejemplo `precios-carburantes`).
2. Subir los ficheros `index.html`, `styles.css` y `app.js` a la rama `main`.
3. En el repositorio, ir a **Settings → Pages**.
4. En *Source* seleccionar **Deploy from a branch** → rama `main`, carpeta `/ (root)`.
5. Pulsar *Save*. En 1-2 minutos la URL pública estará disponible en
   `https://<usuario>.github.io/<repo>/`.

No requiere ningún `package.json`, `Dockerfile` ni configuración adicional.

---

## 4. Operaciones (manual de uso)

La aplicación tiene una barra superior con tres pestañas, una por cada caso de
uso. En todas ellas el flujo es: **seleccionar filtros → pulsar el botón rojo →
ver los resultados en la tabla**.

### 4.1. Estaciones por comunidad autónoma

1. Pestaña activa por defecto: **"Estaciones por CCAA"**.
2. En el desplegable *Comunidad autónoma* seleccionar una de las 19 opciones.
3. Pulsar **Buscar estaciones**.
4. La tabla muestra: *Rótulo, Dirección, Localidad, Provincia, Horario,
   Gasolina 95 E5, Gasolina 98 E5, Gasoleo A, Gasoleo Premium* y un enlace
   **Ver** que abre la ubicación de la estación en Google Maps.
5. La cabecera muestra el total de estaciones devueltas y la fecha del dato.

> _[CAPTURA 01 — Pestaña "Estaciones por CCAA" con resultados para una comunidad seleccionada]_

### 4.2. Postes marítimos por provincia

1. Cambiar a la pestaña **"Postes marítimos por provincia"**.
2. En el desplegable *Provincia* seleccionar una provincia. Para obtener
   resultados es necesario elegir una provincia con costa (A Coruña,
   Pontevedra, Cádiz, Málaga, Murcia, Alicante, Valencia, Barcelona,
   Cantabria, Asturias, etc.). En provincias de interior la API devuelve
   lista vacía y la app lo indica.
3. Pulsar **Buscar postes marítimos**.
4. La tabla muestra: *Rótulo, Puerto, Dirección, Municipio, Provincia, Horario,
   Gasolina 95 E5, Gasoleo A, Gasoleo B, Gasóleo marítimo* y enlace al mapa.

> _[CAPTURA 02 — Pestaña "Postes marítimos por provincia" con resultados para una provincia costera]_

### 4.3. Precios por provincia / fecha / carburante

1. Cambiar a la pestaña **"Precios por provincia / fecha / carburante"**.
2. Seleccionar:
   - **Provincia** (cualquiera de las 52).
   - **Fecha** (la app rellena por defecto la del día anterior; se puede
     elegir cualquier fecha del histórico mediante el selector de calendario).
   - **Carburante** (Gasolina 95 E5, Gasoleo A, GLP, Hidrógeno…).
3. Pulsar **Consultar precios**.
4. La tabla muestra todas las estaciones de esa provincia con su precio para
   ese carburante en esa fecha. La cabecera muestra **mínimo, máximo y precio
   medio**, y la tabla está ordenada de **menor a mayor precio**, de modo que
   las estaciones más baratas aparecen arriba.

> _[CAPTURA 03 — Pestaña "Precios por provincia/fecha/carburante" con filtros aplicados y resultados]_

---

## 5. Detalles técnicos relevantes

### 5.1. Por qué no hace falta backend ni proxy

La API REST del ministerio devuelve en sus respuestas las cabeceras:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization
```

Esto autoriza a cualquier dominio (incluido el local `file://` o un dominio
arbitrario en GitHub Pages) a leer las respuestas desde JavaScript en el
navegador. Por eso la aplicación es 100 % cliente: no hay servidor propio, no
hay claves de API, no hay configuración de CORS por nuestra parte.

> Conviene recordar que **CORS solo aplica al navegador**: una herramienta
> como SoapUI, Postman o `curl` ignora completamente esta política, por lo que
> el funcionamiento en SoapUI no garantiza el funcionamiento en navegador. La
> verificación correcta se hace con DevTools del navegador o con `curl -I -H
> "Origin: https://x.com" <url>` y comprobando la cabecera
> `Access-Control-Allow-Origin`.

### 5.2. Conversión de formato de fecha

El input HTML `<input type="date">` devuelve `AAAA-MM-DD`, pero la API espera
`DD-MM-AAAA`. La conversión se hace en `toApiDate()` (`app.js`).

### 5.3. Conversión de precios

Los precios llegan como cadena con coma decimal española (`"1,599"`). Se
parsean a número en `parsePrice()` y se muestran con tres decimales y el
símbolo `€` mediante `formatPrice()`.

### 5.4. Caso especial del campo `IDPovincia`

El listado de provincias devuelve la clave **`IDPovincia`** (sin la "r"). Es
un error tipográfico documentado en la API. El código lo contempla con un
fallback `p.IDPovincia || p.IDProvincia` por si se corrige en el futuro.

### 5.5. Coordenadas y mapa

Las coordenadas vienen con coma decimal (`"40,955639"`). Se sustituye la coma
por punto y se construye el enlace `https://www.google.com/maps?q=lat,lon`
para abrir la posición en una pestaña nueva.

---

## 6. Pruebas / verificación rápida

Casos sugeridos para comprobar que todo funciona:

| Caso | Filtros | Resultado esperado |
|---|---|---|
| 1 | CCAA = *Madrid, Comunidad de* | ~700 estaciones |
| 2 | CCAA = *Cataluña* | ~900 estaciones |
| 3 | Provincia (postes) = *CORUÑA (A)* | ~17 postes marítimos |
| 4 | Provincia (postes) = *MADRID* | 0 postes (provincia de interior) |
| 5 | Provincia = *MADRID*, fecha de ayer, carburante = *Gasolina 95 E5* | ~700-900 estaciones con precio |
| 6 | Provincia = *MADRID*, fecha = `01-01-2024`, carburante = *Gasoleo A* | precios de esa fecha histórica |

---

## 7. Compatibilidad

Probado en navegadores modernos (Chrome ≥ 100, Edge ≥ 100, Firefox ≥ 100,
Safari ≥ 15). Requiere soporte de:

- `fetch()`
- `Promise.all`
- Sintaxis ES2017+ (async/await, template literals)

No usa ninguna API web exclusiva ni *features* experimentales.
