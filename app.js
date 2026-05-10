/* =====================================================================
   Precios Carburantes - lógica de la SPA
   API: https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes
   ===================================================================== */

const API_BASE = "https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes";

const ENDPOINTS = {
    listadoCCAA: `${API_BASE}/Listados/ComunidadesAutonomas/`,
    listadoProvincias: `${API_BASE}/Listados/Provincias/`,
    listadoProductos: `${API_BASE}/Listados/ProductosPetroliferos/`,
    estacionesCCAA: (idCCAA) => `${API_BASE}/EstacionesTerrestres/FiltroCCAA/${idCCAA}`,
    postesProvincia: (idProv) => `${API_BASE}/PostesMaritimos/FiltroProvincia/${idProv}`,
    histProvinciaProducto: (fecha, idProv, idProd) =>
        `${API_BASE}/EstacionesTerrestresHist/FiltroProvinciaProducto/${fecha}/${idProv}/${idProd}`,
};

/* ------------------ helpers ------------------ */

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
    return res.json();
}

function escapeHTML(str) {
    if (str == null) return "";
    return String(str).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
}

function showLoading(container) {
    container.innerHTML = `<div class="loading"><div class="spinner"></div><span>Consultando API…</span></div>`;
}

function showError(container, msg) {
    container.innerHTML = `<div class="error">⚠ ${escapeHTML(msg)}</div>`;
}

function showEmpty(container, msg) {
    container.innerHTML = `<div class="empty">${escapeHTML(msg)}</div>`;
}

// La API devuelve precios en formato "1,599" (coma decimal). Convertir a número o null.
function parsePrice(raw) {
    if (!raw || raw === "") return null;
    const n = parseFloat(String(raw).replace(",", "."));
    return isNaN(n) ? null : n;
}

function formatPrice(raw) {
    const n = parsePrice(raw);
    if (n == null) return "—";
    // La API publica casi todos los precios en €/L, pero Gasoleo B en postes marítimos
    // (gasóleo profesional pesquero) viene en €/m³. Distinguimos por magnitud.
    const unit = n > 50 ? "€/m³" : "€/L";
    return `${n.toFixed(3)} ${unit}`;
}

// Fecha YYYY-MM-DD del input HTML → DD-MM-YYYY que pide la API
function toApiDate(htmlDate) {
    if (!htmlDate) return "";
    const [y, m, d] = htmlDate.split("-");
    return `${d}-${m}-${y}`;
}

// Coordenadas vienen "40,955639" → enlace Google Maps
function mapsLink(lat, lon) {
    if (!lat || !lon) return "";
    const la = String(lat).replace(",", ".");
    const lo = String(lon).replace(",", ".");
    return `https://www.google.com/maps?q=${la},${lo}`;
}

/* ------------------ tabs ------------------ */

document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        document.querySelectorAll(".tab").forEach((t) => {
            t.classList.toggle("active", t === tab);
            t.setAttribute("aria-selected", t === tab ? "true" : "false");
        });
        document.querySelectorAll(".tab-panel").forEach((p) => {
            p.classList.toggle("active", p.id === `tab-${target}`);
        });
    });
});

/* ------------------ carga inicial de listados ------------------ */

async function cargarListados() {
    try {
        const [ccaa, provincias, productos] = await Promise.all([
            fetchJSON(ENDPOINTS.listadoCCAA),
            fetchJSON(ENDPOINTS.listadoProvincias),
            fetchJSON(ENDPOINTS.listadoProductos),
        ]);

        // Comunidades autónomas (orden alfabético)
        const ccaaSorted = [...ccaa].sort((a, b) => a.CCAA.localeCompare(b.CCAA, "es"));
        const ccaaSelect = document.getElementById("select-ccaa");
        ccaaSelect.innerHTML =
            `<option value="">— Selecciona una CCAA —</option>` +
            ccaaSorted
                .map((c) => `<option value="${escapeHTML(c.IDCCAA)}">${escapeHTML(c.CCAA)}</option>`)
                .join("");

        // Provincias (orden alfabético) — la API devuelve la clave "IDPovincia" (sic, sin la "r")
        const provSorted = [...provincias].sort((a, b) =>
            a.Provincia.localeCompare(b.Provincia, "es")
        );
        const provOptions =
            `<option value="">— Selecciona una provincia —</option>` +
            provSorted
                .map((p) => {
                    const id = p.IDPovincia || p.IDProvincia;
                    return `<option value="${escapeHTML(id)}">${escapeHTML(p.Provincia)}</option>`;
                })
                .join("");
        document.getElementById("select-prov-postes").innerHTML = provOptions;
        document.getElementById("select-prov-precios").innerHTML = provOptions;

        // Productos petrolíferos
        const prodSelect = document.getElementById("select-producto");
        prodSelect.innerHTML =
            `<option value="">— Selecciona un carburante —</option>` +
            productos
                .map(
                    (p) =>
                        `<option value="${escapeHTML(p.IDProducto)}">${escapeHTML(
                            p.NombreProducto
                        )}</option>`
                )
                .join("");

        // Fecha por defecto: ayer (la del día puede no estar publicada todavía)
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        const yyyy = ayer.getFullYear();
        const mm = String(ayer.getMonth() + 1).padStart(2, "0");
        const dd = String(ayer.getDate()).padStart(2, "0");
        document.getElementById("input-fecha").value = `${yyyy}-${mm}-${dd}`;
    } catch (err) {
        console.error("Error cargando listados:", err);
        const msg = `No se han podido cargar los listados iniciales. ${err.message}`;
        ["select-ccaa", "select-prov-postes", "select-prov-precios", "select-producto"].forEach(
            (id) => {
                const sel = document.getElementById(id);
                sel.innerHTML = `<option value="">Error de carga</option>`;
            }
        );
        ["result-estaciones", "result-postes", "result-precios"].forEach((id) => {
            showError(document.getElementById(id), msg);
        });
    }
}

/* ------------------ render: estaciones ------------------ */

const COLUMNAS_ESTACION = [
    { label: "Rótulo", get: (e) => e["Rótulo"], cls: "rotulo" },
    { label: "Dirección", get: (e) => e["Dirección"] },
    { label: "Localidad", get: (e) => e["Localidad"]?.trim() },
    { label: "Provincia", get: (e) => e["Provincia"] },
    { label: "Horario", get: (e) => e["Horario"] },
    { label: "G95 E5", get: (e) => e["Precio Gasolina 95 E5"], price: true },
    { label: "G98 E5", get: (e) => e["Precio Gasolina 98 E5"], price: true },
    { label: "Gasoleo A", get: (e) => e["Precio Gasoleo A"], price: true },
    { label: "Gasoleo Premium", get: (e) => e["Precio Gasoleo Premium"], price: true },
    {
        label: "Mapa",
        get: (e) => {
            const url = mapsLink(e["Latitud"], e["Longitud (WGS84)"]);
            return url ? `<a href="${url}" target="_blank" rel="noopener">Ver</a>` : "";
        },
        raw: true,
    },
];

function renderEstaciones(container, data, contexto) {
    const lista = data.ListaEESSPrecio || [];
    if (lista.length === 0) {
        showEmpty(container, "No se han encontrado estaciones para los criterios seleccionados.");
        return;
    }

    const headers = COLUMNAS_ESTACION.map((c) => `<th>${c.label}</th>`).join("");
    const rows = lista
        .map((e) => {
            const cells = COLUMNAS_ESTACION.map((c) => {
                const val = c.get(e);
                if (c.price) {
                    const isEmpty = !val || val === "";
                    return `<td class="price ${isEmpty ? "empty-price" : ""}">${formatPrice(val)}</td>`;
                }
                if (c.raw) return `<td>${val || ""}</td>`;
                return `<td class="${c.cls || ""}">${escapeHTML(val || "")}</td>`;
            }).join("");
            return `<tr>${cells}</tr>`;
        })
        .join("");

    container.innerHTML = `
        <div class="summary">
            <span>${escapeHTML(contexto)}</span>
            <strong>${lista.length} estaciones</strong>
        </div>
        <div class="table-wrap">
            <table>
                <thead><tr>${headers}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

/* ------------------ render: postes marítimos ------------------ */

const COLUMNAS_POSTE = [
    { label: "Rótulo", get: (e) => e["Rótulo"], cls: "rotulo" },
    { label: "Puerto", get: (e) => e["Puerto"] },
    { label: "Dirección", get: (e) => e["Dirección"] },
    { label: "Municipio", get: (e) => e["Municipio"] },
    { label: "Provincia", get: (e) => e["Provincia"] },
    { label: "Horario", get: (e) => e["Horario"] },
    { label: "G95 E5", get: (e) => e["Precio Gasolina 95 E5"], price: true },
    { label: "Gasoleo A", get: (e) => e["Precio Gasoleo A habitual"], price: true },
    { label: "Gasoleo B", get: (e) => e["Precio Gasoleo B"], price: true },
    { label: "Gasoleo marítimo", get: (e) => e["Precio Gasóleo para uso marítimo"], price: true },
    {
        label: "Mapa",
        get: (e) => {
            const url = mapsLink(e["Latitud"], e["Longitud (WGS84)"]);
            return url ? `<a href="${url}" target="_blank" rel="noopener">Ver</a>` : "";
        },
        raw: true,
    },
];

function renderPostes(container, data, contexto) {
    const lista = data.ListaEESSPrecio || [];
    if (lista.length === 0) {
        showEmpty(
            container,
            "No hay postes marítimos en esta provincia. Prueba con una provincia costera (A Coruña, Pontevedra, Cádiz, Málaga, Murcia, Alicante, Valencia, Barcelona, Cantabria, etc.)."
        );
        return;
    }

    const headers = COLUMNAS_POSTE.map((c) => `<th>${c.label}</th>`).join("");
    const rows = lista
        .map((e) => {
            const cells = COLUMNAS_POSTE.map((c) => {
                const val = c.get(e);
                if (c.price) {
                    const isEmpty = !val || val === "";
                    return `<td class="price ${isEmpty ? "empty-price" : ""}">${formatPrice(val)}</td>`;
                }
                if (c.raw) return `<td>${val || ""}</td>`;
                return `<td class="${c.cls || ""}">${escapeHTML((val || "").toString().trim())}</td>`;
            }).join("");
            return `<tr>${cells}</tr>`;
        })
        .join("");

    container.innerHTML = `
        <div class="summary">
            <span>${escapeHTML(contexto)}</span>
            <strong>${lista.length} postes marítimos</strong>
        </div>
        <div class="table-wrap">
            <table>
                <thead><tr>${headers}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

/* ------------------ render: precios histórico ------------------ */

function renderPrecios(container, data, contexto, nombreProducto) {
    const lista = data.ListaEESSPrecio || [];
    if (lista.length === 0) {
        showEmpty(
            container,
            "Sin resultados. Prueba con otra fecha (la API tiene histórico desde hace varios años, pero pueden faltar días sueltos) o cambia el carburante."
        );
        return;
    }

    // Estadística rápida: precio mínimo, máximo y medio
    const precios = lista.map((e) => parsePrice(e.PrecioProducto)).filter((n) => n != null);
    const min = precios.length ? Math.min(...precios) : null;
    const max = precios.length ? Math.max(...precios) : null;
    const avg = precios.length ? precios.reduce((a, b) => a + b, 0) / precios.length : null;

    // Ordenar por precio ascendente (las más baratas arriba)
    const ordenadas = [...lista].sort((a, b) => {
        const pa = parsePrice(a.PrecioProducto) ?? Infinity;
        const pb = parsePrice(b.PrecioProducto) ?? Infinity;
        return pa - pb;
    });

    const unit = max != null && max > 50 ? "€/m³" : "€/L";
    const stats =
        min != null
            ? `<span>Mín: <strong>${min.toFixed(3)} ${unit}</strong> · Máx: <strong>${max.toFixed(
                  3
              )} ${unit}</strong> · Medio: <strong>${avg.toFixed(3)} ${unit}</strong></span>`
            : "";

    const rows = ordenadas
        .map((e) => {
            const url = mapsLink(e["Latitud"], e["Longitud (WGS84)"]);
            const map = url ? `<a href="${url}" target="_blank" rel="noopener">Ver</a>` : "";
            return `
                <tr>
                    <td class="rotulo">${escapeHTML(e["Rótulo"] || "")}</td>
                    <td>${escapeHTML(e["Dirección"] || "")}</td>
                    <td>${escapeHTML((e["Localidad"] || "").trim())}</td>
                    <td>${escapeHTML(e["Municipio"] || "")}</td>
                    <td>${escapeHTML(e["Horario"] || "")}</td>
                    <td class="price">${formatPrice(e.PrecioProducto)}</td>
                    <td>${map}</td>
                </tr>
            `;
        })
        .join("");

    container.innerHTML = `
        <div class="summary">
            <span>${escapeHTML(contexto)} · Carburante: <strong>${escapeHTML(
        nombreProducto
    )}</strong></span>
            <strong>${lista.length} estaciones</strong>
        </div>
        <div class="summary" style="background:#f8f9fc; border-left-color:var(--color-success);">
            ${stats}
            <span class="hint" style="margin:0;">Ordenado por precio ascendente</span>
        </div>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Rótulo</th>
                        <th>Dirección</th>
                        <th>Localidad</th>
                        <th>Municipio</th>
                        <th>Horario</th>
                        <th>Precio</th>
                        <th>Mapa</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

/* ------------------ submit handlers ------------------ */

document.getElementById("form-estaciones").addEventListener("submit", async (e) => {
    e.preventDefault();
    const select = document.getElementById("select-ccaa");
    const idCCAA = select.value;
    const nombreCCAA = select.options[select.selectedIndex].text;
    if (!idCCAA) return;

    const container = document.getElementById("result-estaciones");
    showLoading(container);
    try {
        const data = await fetchJSON(ENDPOINTS.estacionesCCAA(idCCAA));
        renderEstaciones(container, data, `CCAA: ${nombreCCAA} · Datos a fecha ${data.Fecha || "—"}`);
    } catch (err) {
        showError(container, `Error al consultar la API: ${err.message}`);
    }
});

document.getElementById("form-postes").addEventListener("submit", async (e) => {
    e.preventDefault();
    const select = document.getElementById("select-prov-postes");
    const idProv = select.value;
    const nombreProv = select.options[select.selectedIndex].text;
    if (!idProv) return;

    const container = document.getElementById("result-postes");
    showLoading(container);
    try {
        const data = await fetchJSON(ENDPOINTS.postesProvincia(idProv));
        renderPostes(container, data, `Provincia: ${nombreProv} · Datos a fecha ${data.Fecha || "—"}`);
    } catch (err) {
        showError(container, `Error al consultar la API: ${err.message}`);
    }
});

document.getElementById("form-precios").addEventListener("submit", async (e) => {
    e.preventDefault();
    const provSel = document.getElementById("select-prov-precios");
    const fechaInput = document.getElementById("input-fecha");
    const prodSel = document.getElementById("select-producto");

    const idProv = provSel.value;
    const fechaApi = toApiDate(fechaInput.value);
    const idProd = prodSel.value;
    if (!idProv || !fechaApi || !idProd) return;

    const nombreProv = provSel.options[provSel.selectedIndex].text;
    const nombreProd = prodSel.options[prodSel.selectedIndex].text;

    const container = document.getElementById("result-precios");
    showLoading(container);
    try {
        const data = await fetchJSON(ENDPOINTS.histProvinciaProducto(fechaApi, idProv, idProd));
        renderPrecios(
            container,
            data,
            `Provincia: ${nombreProv} · Fecha: ${fechaApi}`,
            nombreProd
        );
    } catch (err) {
        showError(container, `Error al consultar la API: ${err.message}`);
    }
});

/* ------------------ arranque ------------------ */
cargarListados();
