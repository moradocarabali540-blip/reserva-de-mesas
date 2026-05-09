const STORAGE_KEY = "reservas_de_mesas"
const TOTAL_MESAS = 12;

function cargarReservas(){
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return [];
    try{
        return JSON.parse(s);
    }
    catch(e){
        return[]
    }
}

function guardarReserva(list){
    localStorage.setItem(STORAGE_KEY , JSON.stringify (list));
}

let reservas = cargarReservas();

function idcorto(){
    return Date.now().toString(36).slice(-6);
}

function formatearfechahora(iso){
    return new Date(iso).toLocaleString('es-ES');
}

function rendermesas(){
    const cont = document.getElementById('tables')
    cont.innerHTML = '';

    for(let i = 1; i<= TOTAL_MESAS; i++){
        const card = document.createElement('div');
        card.className = 'tablecard';

        const ahora = Date.now();
        const proxima = reservas
            .filter(r => r.table === i && new Date(r.datetime).getTime() >= ahora && r.status !== 'cancelada')
            .sort((a,b) => new Date(a.datetime) - new Date(b.datetime))[0];

            card.innerHTML = `
                <img src="mesas.png" alt="mesa ${i}">
                <div class="tablename">mesa ${i}</div>
                <div class="tabledesc">${proxima? formatearfechahora(proxima.datetime) : 'libre'}</div>
                <button class="btn table-btn" data-table="${i}">${proxima ? 'liberar' : 'reservar'}</button>
            `;
            cont.appendChild(card);
    }

    //Eventos para los botones de cada mesa
    document.querySelectorAll('.table-btn').forEach(b =>{
            b.onclick = () =>{
                const mesa = parseInt(b.getAttribute('data-table'), 10);
                const ahora = Date.now();
                const proxima = reservas
                    .filter(r => r.table === mesa && new Date(r.datetime).getTime() >= ahora && r.status !== 'cancelada')
                    .sort((a,b) => new Date(a.datetime) - new Date(b.datetime))[0];

                    if(!proxima){
                        const nombre = prompt('nombre del cliente');
                        if(!nombre) return alert('reserva cancelada: falta el nombre.');

                        const contacto = prompt('contacto (celular:');
                        if(!contacto)return alert('reserva cancelada: falta el contacto.');

                        const fecha = prompt('fecha (formato YYYY-MM-DD):\nEj: 2025-09-30');
                        if(!fecha) return alert('reserva cancelada: falta fecha.');

                        const hora = prompt('hora (formato HH:MM):\nEj: 18:30');
                        if(!hora) return alert('reserva cancelada: falta la hora');

                        const iso = fecha + 'T' + hora;

                        if(isNaN(new Date(iso).getTime())) return alert('fecha/hora invalida. intenta de nuevo.');

                        const conflicto = reservas.some(r => r.table === mesa && r.datetime === iso && r.status !== 'cancelada');
                        if(conflicto) return alert('ya existe una reserva exacta en esa fecha/hora. intenta otra hora.');

                        const nueva = {
                            id: idcorto(),
                            name: nombre,
                            contact: '',
                            datetime: iso,
                            table: mesa,
                            status: 'reservada',
                            createdAt: new Date().toISOString()
                        };
                        reservas.push(nueva);
                        guardarReserva(reservas);
                        rendermesas();
                        mostrarReporte();
                        alert('reservar rapida registrada');
                    }else{
                        if(!confirm(`liberar la reserva de ${formatearfechahora(proxima.datetime)} para mesa ${mesa}?`)) return;

                        reservas = reservas.map(r => r.id === proxima.id ? {...r, status: 'cancelada'} : r);
                        guardarReserva(reservas);
                        rendermesas();
                        mostrarReporte();
                        alert('reserva liberada');

                    }
            };
     });
}
// --- Crear reserva desde el formulario ---

    function crearReservaDesdeFormulario(ev){ 
        ev.preventDefault();
        const name = document.getElementById('name').value.trim();
        const contact = document.getElementById('contact').value.trim();
        const datetime = document.getElementById('datatime').value;
        const table = parseInt(document.getElementById('table').value, 10);

        if(!name || !datetime || !table) return alert('complete nombre, fecha/hora y numero de mesa.');

        if(reservas.some(r => r.table === table && r.datetime === datetime && r.status !== 'cancelada')){
            return alert('conflicto: ya existe una reserva exactamente es esa mesa y hora.');
        }

        const nueva = {id: idcorto(), name, contact, datetime, table, status: 'reservada', createdAt: new Date().toISOString()}
        reservas.push(nueva);
        guardarReserva(reservas);
        document.getElementById('formReservation').reset();
        rendermesas();
        mostrarReporte();
        alert('reserva guardada');
}

//-- Mostrar reporte --

function mostrarReporte(){
    const area = document.getElementById('reportArea');
    area.innerHTML = '';

    const from = document.getElementById('fromDate').value;
    const to = document.getElementById('toDate').value;
    let lista = reservas.slice();
    if(from) lista = lista.filter(r => new Date(r.datetime) >= new Date(from + 'T00:00:00'));
    if(to) lista = lista.filter(r => new Date(r.datetime) <= new Date(to + 'T23:59:59'));

    if(lista.length === 0){
        area.innerHTML = '<p style="color:#666">no hay reservas en el rango seleccionado.</p>';
        return
    }

    lista.sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
    lista.forEach(r => {
        const card = document.createElement('div');
        card.className = 'repor-card';
        card.innerHTML = `
        <h4>Mesa ${r.table} - ${r.id}</h4>
        <p><strong>Cliente:</strong> ${r.name}</p>
        <p><strong>Contacto:</strong> ${r.contact || '-'}</p>
        <p><strong>Fecha / Hora:</strong> ${formatearfechahora(r.datetime)}</p>
        <p><strong>Estado:</strong> ${r.status}</p>
        <div style="margin-top:8px">
            <button class="btn btn-cancel" data-id="${r.id}">cancelar</button>
        </div>
        `;
        area.appendChild(card);
    });

    area.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            if (!confirm('cancelar esta reserva?')) return;
            reservas = reservas.map(x => x.id === id ? {...x, status: 'cancelada'} : x);
            guardarReserva(reservas);
            mostrarReporte();
            rendermesas();
        };
    });
};

// --- Generar CSV --- 
function generarCSVFiltrado(){
    const from = document.getElementById('fromDate').value
    const to = document.getElementById('toDate').value
    let lista = reservas.slice();
    if (from) lista = lista.filter(r => new Date(r.datetime) >= new Date(from + 'T00:00:00'));
    if (to) lista = lista.filter(r => new Date(r.datetime) <= new Date(to + 'T23:59:59'));

    if (lista.length === 0) return '';

    const headers = ['id','mesa', 'nombre', 'contacto', 'fecha_hora', 'estado'];
    const lines = [headers.join(',')];
    lista.forEach(r =>{
        const row = [
            r.id,
            r.table,
            r.name.replace(/"/g,'"'),
            (r.contact || '').replace(/"/g, '"'),
            new Date(r.datetime).toDateString(),
            r.status
        ];
        lines.push(row.map(c => `"${String(c)}"`).join(','));
    });
    return lines.join('\n');
}

// --- Previsualizacion del CSV --- 
function previsualizarCSV(){
    const csv = generarCSVFiltrado();
    const preview = document.getElementById('csvPreview');
    const csvText = document.getElementById('csvText');
    const csvList = document.getElementById('csvList');
    
    csvList.innerHTML = '';
    const lines = csv ? csv.split('\n').slice(1) : [];
    lines.forEach(l => {
        const cols = l.split('","').map(t => t.replace(/^"|"$/g,''));
        const div = document.createElement('div');
        div.style.padding = '6px';
        div.style.borderBottom = '1px solid #f0e6d0';
        div.innerHTML = `<strong>Mesa ${cols[1]}</strong> - ${cols[2]} <div style="font-size:12px;color:#666">${cols[4]}</div>`;
        csvList.appendChild(div);
    });

    csvText.textContent = csv || 'No hay datos para mostrar';
    preview.classList.remove('hidden');

    // Boton descargar desde la vista previa
    document.getElementById('btnDownloadFromPreview').onclick = () => {
        if(!csv) return alert('no hay datos para descargar');
        descargarCSV(csv, 'reservas_preview.csv');
    };
}

//--- Descargar csv (descargar de archivo) ---
function descargarCSV(texto, filename){
    const blob = new Blob([texto], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Inicializar la aplicación ---
document.addEventListener('DOMContentLoaded', () => {
    rendermesas();
    mostrarReporte();

    // Evento para el formulario
    document.getElementById('formReservation').addEventListener('submit', crearReservaDesdeFormulario);
    
    // Botón limpiar formulario
    document.getElementById('clearBtn').onclick = () => {
        document.getElementById('formReservation').reset();
    };

    // Botón mostrar reporte
    document.getElementById('btnShowReport').onclick = mostrarReporte;

    // Botón previsualizar CSV
    document.getElementById('btnPreviewCsv').onclick = previsualizarCSV;

    // Botón exportar CSV
    document.getElementById('btnExportCsv').onclick = () => {
        const csv = generarCSVFiltrado();
        if(!csv) return alert('no hay datos para exportar');
        descargarCSV(csv, 'reservas.csv');
    };

    // Botón cerrar vista previa
    document.getElementById('btnClosePreview').onclick = () => {
        document.getElementById('csvPreview').classList.add('hidden');
    };
});
    


