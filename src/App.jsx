import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Settings,
  Info,
  Copy,
  Check,
  Plus,
  Trash2,
  Calendar,
  Users,
  Send,
  UserCheck,
  AlertTriangle,
  Printer,
} from 'lucide-react';

// --- CONSTANTES ---
const SHEETS = [
  'Directorio',
  'Congregaciones',
  'Bosquejos',
  'Visitantes',
  'Locales',
  'Salidas',
];
const LIMITE_ANUAL = 4;
const LS_DB = 'lafe-db-v1';
const LS_URL = 'lafe-gas-url';

const uid = () => Math.random().toString(36).slice(2, 10);

const SEED = {
  Congregaciones: [
    {
      id: uid(),
      nombre: 'La Fe',
      coordinador: 'Hno. Ramírez',
      telefono: '70000001',
      circuito: 'BO-12',
      horario: 'Dom 10:00',
      color: '#1e3a8a',
    },
    {
      id: uid(),
      nombre: 'El Alto Norte',
      coordinador: 'Hno. Quispe',
      telefono: '70000002',
      circuito: 'BO-12',
      horario: 'Sáb 18:00',
      color: '#047857',
    },
    {
      id: uid(),
      nombre: 'Sopocachi',
      coordinador: 'Hno. Mendoza',
      telefono: '70000003',
      circuito: 'BO-12',
      horario: 'Dom 09:30',
      color: '#b45309',
    },
  ],
  Directorio: [
    {
      id: uid(),
      nombre: 'Carlos Mamani',
      congregacion: 'El Alto Norte',
      telefono: '71111111',
      bosquejos: '12, 45',
      cargo: 'Anciano',
      ultimaVisita: '',
    },
    {
      id: uid(),
      nombre: 'Luis Fernández',
      congregacion: 'Sopocachi',
      telefono: '72222222',
      bosquejos: '3, 101',
      cargo: 'Siervo ministerial',
      ultimaVisita: '',
    },
  ],
  Bosquejos: [
    {
      id: uid(),
      numero: '3',
      titulo: '¿Por qué confiar en la Biblia?',
      estado: 'Actualizado',
    },
    {
      id: uid(),
      numero: '12',
      titulo: 'Dios quiere que respetemos la autoridad',
      estado: 'Vigente',
    },
    {
      id: uid(),
      numero: '45',
      titulo: 'Sigamos el camino que lleva a la vida',
      estado: 'Descontinuado',
    },
    {
      id: uid(),
      numero: '101',
      titulo: 'Jehová, el gran Creador',
      estado: 'Actualizado',
    },
  ],
  Visitantes: [],
  Locales: [
    {
      id: uid(),
      nombre: 'Pedro Gutiérrez',
      cargo: 'Anciano',
      telefono: '73333333',
      bosquejos: '3, 12',
    },
    {
      id: uid(),
      nombre: 'Juan Choque',
      cargo: 'Anciano',
      telefono: '74444444',
      bosquejos: '45, 101',
    },
  ],
  Salidas: [],
};

// Generador de fines de semana hasta septiembre 2027
function weekends(from = '2026-01-01', to = '2027-09-30') {
  const d = new Date(from + 'T12:00:00');
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  const end = new Date(to + 'T12:00:00');
  const out = [];
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

const fmtFecha = (iso) => {
  if (!iso) return '';
  const clean = String(iso).slice(0, 10);
  const d = new Date(clean + 'T12:00:00');
  return isNaN(d.getTime())
    ? String(iso)
    : d.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

// --- TRADUCTOR AUTOMÁTICO ENTRE TU EXCEL DE GOOGLE SHEETS Y LA APP ---
function normalizeRow(sheet, r) {
  const cleanKey = (k) =>
    String(k || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const map = {};
  Object.keys(r || {}).forEach((k) => {
    map[cleanKey(k)] = r[k];
  });

  const get = (...keys) => {
    for (const k of keys) {
      const val = map[cleanKey(k)];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
    return '';
  };

  if (sheet === 'Directorio') {
    return {
      id: r.id || uid(),
      nombre: get('nombre', 'Nombre del Orador', 'Orador'),
      congregacion: get('congregacion', 'CONGREGACION', 'Congregación'),
      telefono: get('telefono', 'TELEFONO', 'Teléfono'),
      bosquejos: get('bosquejos', 'N° Bosquejos', 'Número(s) de Bosquejos'),
      cargo: get('cargo', 'PUESTO', 'Cargo'),
      ultimaVisita: get(
        'ultimaVisita',
        'Última Visita',
        'Fecha Última Visita'
      ).slice(0, 10),
    };
  }
  if (sheet === 'Congregaciones') {
    return {
      id: r.id || uid(),
      nombre: get('nombre', 'congregacion', 'Congregación'),
      coordinador: get('coordinador', 'Coordinador'),
      telefono: get('telefono', 'Teléfono'),
      circuito: get('circuito', 'circito', 'Circuito'),
      horario: get('horario', 'Horario de Reunión'),
      color: get('color', 'Color') || '#1e3a8a',
    };
  }
  if (sheet === 'Bosquejos') {
    return {
      id: r.id || uid(),
      numero: get('numero', 'N°', 'Número de Bosquejo'),
      titulo: get('titulo', 'Título del Discurso', 'Titulo del Discurso'),
      estado: get('estado', 'Estado') || 'Vigente',
    };
  }
  if (sheet === 'Visitantes') {
    return {
      id: r.id || uid(),
      fecha: get('fecha', 'FECHA').slice(0, 10),
      orador: get('orador', 'DISCURSANTE', 'Orador Visitante'),
      congregacion: get('congregacion', 'CONGREGACION', 'Congregación'),
      telefono: get('telefono', 'TELEFONO', 'Teléfono'),
      bosquejo: get('bosquejo', 'NUMERO DE BOSQUEJO', 'Número de Bosquejo'),
      titulo: get('titulo', 'TITULO DEL DISCURSO', 'Título del Discurso'),
      cancion: get('cancion', 'CANTICO', 'Canción'),
    };
  }
  if (sheet === 'Locales') {
    return {
      id: r.id || uid(),
      nombre: get('nombre', 'Discursante', 'Nombre'),
      cargo: get('cargo', 'Cargo') || 'Anciano',
      telefono: get('telefono', 'Contacto', 'Teléfono'),
      bosquejos: get('bosquejos', 'Bosquejos', 'Bosquejos Asignados'),
    };
  }
  if (sheet === 'Salidas') {
    return {
      id: r.id || uid(),
      fecha: get('fecha', 'FECHA').slice(0, 10),
      local: get('local', 'ORADOR', 'Hermano Local'),
      congregacion: get(
        'congregacion',
        'CONGREGACION DESTINO',
        'Congregación Visitada'
      ),
      bosquejo: get('bosquejo', 'BOSQUEJO', 'Número de Bosquejo'),
    };
  }
  return { id: uid(), ...r };
}

export default function App() {
  const [db, setDb] = useState(SEED);
  const [gasUrl, setGasUrl] = useState('');
  const [status, setStatus] = useState('local');
  const [activeTab, setActiveTab] = useState('visitantes');
  const [subTabDir, setSubTabDir] = useState('oradores');
  const [modalConfig, setModalConfig] = useState(false);
  const [modalAbout, setModalAbout] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [msg, setMsg] = useState(null);
  const [selectedLocal, setSelectedLocal] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const loaded = useRef(false);
  const timers = useRef({});

  const notify = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 3500);
  };

  // --- SINCRONIZACIÓN GET CON GOOGLE SHEETS ---
  const sync = useCallback(
    async (urlToUse) => {
      const u = (urlToUse ?? gasUrl).trim();
      if (!u) {
        notify('Configura primero la URL de Google Apps Script');
        return;
      }
      setStatus('sincronizando');
      try {
        const res = await fetch(u);
        const text = await res.text();
        const data = JSON.parse(text);

        setDb((prev) => {
          const next = { ...prev };
          for (const s of SHEETS) {
            const rawList = data?.[s] ?? data?.[s.toLowerCase()];
            if (Array.isArray(rawList) && rawList.length > 0) {
              next[s] = rawList.map((item) => normalizeRow(s, item));
            }
          }
          return next;
        });
        setStatus('sincronizado');
        notify('✅ Datos sincronizados con Google Sheets');
      } catch (e) {
        setStatus('error');
        notify(`❌ Error al sincronizar: ${e.message}`);
      }
    },
    [gasUrl]
  );

  // Carga inicial
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_DB);
      if (raw) setDb({ ...SEED, ...JSON.parse(raw) });
      const u = localStorage.getItem(LS_URL) || '';
      setGasUrl(u);
      setTempUrl(u);
      if (u) void sync(u);
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (loaded.current) localStorage.setItem(LS_DB, JSON.stringify(db));
  }, [db]);

  // --- GUARDADO POST A GOOGLE SHEETS ---
  const pushToSheet = useCallback(
    (sheet, rows) => {
      if (!gasUrl) return;
      clearTimeout(timers.current[sheet]);
      timers.current[sheet] = setTimeout(async () => {
        try {
          setStatus('sincronizando');
          await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'save', sheet, rows }),
          });
          setStatus('sincronizado');
        } catch {
          setStatus('error');
          notify(`Error al guardar ${sheet} en la nube`);
        }
      }, 800);
    },
    [gasUrl]
  );

  const updateSheet = (sheet, updater) => {
    setDb((prev) => {
      const nextRows = updater(prev[sheet]);
      pushToSheet(sheet, nextRows);
      return { ...prev, [sheet]: nextRows };
    });
  };

  const colorOf = (congName) =>
    db.Congregaciones.find(
      (c) => c.nombre.toLowerCase() === (congName || '').toLowerCase()
    )?.color || '#475569';

  const allWeekends = weekends('2026-01-01', '2027-09-30');

  // Copiar formato para WhatsApp
  const copyWhatsApp = (v) => {
    const text = `📅 *Fecha:* ${fmtFecha(v.fecha)}\n👤 *Conferenciante:* ${
      v.orador || 'Por asignar'
    }\n🏛️ *Congregación:* ${v.congregacion || '-'}\n📚 *Discurso N° ${
      v.bosquejo || '-'
    }:* ${v.titulo || '-'}\n🎵 *Canción:* ${v.cancion || '-'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(v.fecha);
    notify('📋 Copiado para WhatsApp');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* NOTIFICACIÓN FLOTANTE */}
      {msg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-bounce">
          {msg}
        </div>
      )}

      {/* HEADER */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Sistema de Control de Conferencias La Fe
            </h1>
            <p className="text-xs text-slate-400">
              Coordinación de Oradores y Programación • Hasta Septiembre 2027
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
                status === 'sincronizado'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : status === 'sincronizando'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : status === 'error'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {status === 'sincronizado'
                ? 'Sincronizado'
                : status === 'sincronizando'
                ? 'Sincronizando...'
                : status === 'error'
                ? 'Error de red'
                : 'Modo Local'}
            </span>

            <button
              onClick={() => sync()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sincronizar
            </button>
            <button
              onClick={() => setModalConfig(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5" /> Configurar Sheet
            </button>
            <button
              onClick={() => setModalAbout(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-2.5 py-2 rounded-lg transition"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BARRA DE PESTAÑAS */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto pt-2">
          {[
            {
              id: 'visitantes',
              label: 'Visitantes (Programación)',
              icon: Calendar,
            },
            { id: 'directorio', label: 'Directorio y Catálogos', icon: Users },
            { id: 'salidas', label: 'Salidas Locales (2026-2027)', icon: Send },
            { id: 'agenda', label: 'Agenda Individual', icon: UserCheck },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-medium rounded-t-lg transition whitespace-nowrap ${
                  activeTab === t.id
                    ? 'bg-slate-50 text-blue-900 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {/* PESTAÑA 1: VISITANTES */}
        {activeTab === 'visitantes' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2 bg-slate-50">
              <div>
                <h2 className="font-bold text-slate-800">
                  Programación Semanal de Visitantes
                </h2>
                <p className="text-xs text-slate-500">
                  Al elegir el Orador o el N° de Bosquejo se autocompletan los
                  demás datos automáticamente.
                </p>
              </div>
              <button
                onClick={() =>
                  updateSheet('Visitantes', (prev) => [
                    ...prev,
                    {
                      id: uid(),
                      fecha: new Date().toISOString().slice(0, 10),
                      orador: '',
                      congregacion: '',
                      telefono: '',
                      bosquejo: '',
                      titulo: '',
                      cancion: '',
                    },
                  ])
                }
                className="bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Agregar Fecha Manual
              </button>
            </div>

            <div className="overflow-x-auto max-h-[650px]">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Orador Visitante</th>
                    <th className="p-3">Congregación</th>
                    <th className="p-3">Teléfono</th>
                    <th className="p-3">N° Bosquejo</th>
                    <th className="p-3">Título del Discurso</th>
                    <th className="p-3 w-20">Canción</th>
                    <th className="p-3 text-center">WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(db.Visitantes.length > 0
                    ? db.Visitantes
                    : allWeekends.slice(0, 40).map((f) => ({
                        id: f,
                        fecha: f,
                        orador: '',
                        congregacion: '',
                        telefono: '',
                        bosquejo: '',
                        titulo: '',
                        cancion: '',
                      }))
                  ).map((row) => {
                    const updateVisita = (changes) => {
                      updateSheet('Visitantes', (prev) => {
                        const exists = prev.some(
                          (x) => x.fecha === row.fecha || x.id === row.id
                        );
                        if (exists) {
                          return prev.map((x) =>
                            x.fecha === row.fecha || x.id === row.id
                              ? { ...x, ...changes }
                              : x
                          );
                        }
                        return [...prev, { ...row, ...changes, id: uid() }];
                      });
                    };

                    return (
                      <tr
                        key={row.id || row.fecha}
                        className="hover:bg-slate-50/80"
                      >
                        <td className="p-2.5 font-medium whitespace-nowrap text-slate-700">
                          <input
                            type="date"
                            value={row.fecha}
                            onChange={(e) =>
                              updateVisita({ fecha: e.target.value })
                            }
                            className="border border-slate-200 rounded px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={row.orador}
                            onChange={(e) => {
                              const nombre = e.target.value;
                              const found = db.Directorio.find(
                                (d) => d.nombre === nombre
                              );
                              updateVisita({
                                orador: nombre,
                                congregacion: found
                                  ? found.congregacion
                                  : row.congregacion,
                                telefono: found ? found.telefono : row.telefono,
                              });
                              if (found && row.fecha) {
                                updateSheet('Directorio', (dPrev) =>
                                  dPrev.map((or) =>
                                    or.nombre === nombre
                                      ? { ...or, ultimaVisita: row.fecha }
                                      : or
                                  )
                                );
                              }
                            }}
                            className="w-full border border-slate-300 rounded-md px-2 py-1.5 bg-white"
                          >
                            <option value="">-- Seleccionar Orador --</option>
                            {db.Directorio.map((o) => (
                              <option key={o.id} value={o.nombre}>
                                {o.nombre} ({o.congregacion})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5">
                          {row.congregacion ? (
                            <span
                              style={{
                                backgroundColor: colorOf(row.congregacion),
                              }}
                              className="text-white px-2.5 py-1 rounded-md text-xs font-semibold inline-block shadow-xs"
                            >
                              {row.congregacion}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {row.telefono || '-'}
                        </td>
                        <td className="p-2.5">
                          <select
                            value={row.bosquejo}
                            onChange={(e) => {
                              const num = e.target.value;
                              const b = db.Bosquejos.find(
                                (x) => String(x.numero) === String(num)
                              );
                              updateVisita({
                                bosquejo: num,
                                titulo: b ? b.titulo : row.titulo,
                              });
                            }}
                            className="w-24 border border-slate-300 rounded-md px-2 py-1.5 bg-white font-semibold"
                          >
                            <option value="">N°</option>
                            {db.Bosquejos.map((b) => (
                              <option key={b.id} value={b.numero}>
                                #{b.numero}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td
                          className="p-2.5 text-slate-700 font-medium max-w-xs truncate"
                          title={row.titulo}
                        >
                          {row.titulo || (
                            <span className="text-slate-400 italic">
                              Automático al elegir N°
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            placeholder="Ej. 45"
                            value={row.cancion}
                            onChange={(e) =>
                              updateVisita({ cancion: e.target.value })
                            }
                            className="w-16 border border-slate-300 rounded px-2 py-1 text-center"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => copyWhatsApp(row)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1 transition"
                            title="Copiar recuadro para WhatsApp"
                          >
                            {copiedId === row.fecha ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            Copiar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: DIRECTORIO Y CATÁLOGOS */}
        {activeTab === 'directorio' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {[
                {
                  id: 'oradores',
                  label: `Directorio de Oradores (${db.Directorio.length})`,
                },
                {
                  id: 'congregaciones',
                  label: `Congregaciones y Colores (${db.Congregaciones.length})`,
                },
                {
                  id: 'bosquejos',
                  label: `Catálogo de Bosquejos (${db.Bosquejos.length})`,
                },
                {
                  id: 'locales',
                  label: `Conferenciantes Locales (${db.Locales.length})`,
                },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSubTabDir(st.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                    subTabDir === st.id
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* SUBTAB: ORADORES */}
            {subTabDir === 'oradores' && (
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                  <h3 className="font-bold text-sm">
                    Directorio de Conferenciantes Visitantes
                  </h3>
                  <button
                    onClick={() =>
                      updateSheet('Directorio', (p) => [
                        {
                          id: uid(),
                          nombre: 'Nuevo Orador',
                          congregacion: db.Congregaciones[0]?.nombre || '',
                          telefono: '',
                          bosquejos: '',
                          cargo: 'Anciano',
                          ultimaVisita: '',
                        },
                        ...p,
                      ])
                    }
                    className="bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nuevo Orador
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead className="bg-slate-100 text-slate-600 border-b">
                      <tr>
                        <th className="p-3">Nombre del Orador</th>
                        <th className="p-3">Congregación</th>
                        <th className="p-3">Teléfono</th>
                        <th className="p-3">N° de Bosquejos</th>
                        <th className="p-3">Cargo</th>
                        <th className="p-3">Última Visita</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {db.Directorio.map((o) => (
                        <tr key={o.id}>
                          <td className="p-2">
                            <input
                              value={o.nombre}
                              onChange={(e) =>
                                updateSheet('Directorio', (p) =>
                                  p.map((x) =>
                                    x.id === o.id
                                      ? { ...x, nombre: e.target.value }
                                      : x
                                  )
                                )
                              }
                              className="border rounded px-2 py-1 w-full"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={o.congregacion}
                              onChange={(e) =>
                                updateSheet('Directorio', (p) =>
                                  p.map((x) =>
                                    x.id === o.id
                                      ? { ...x, congregacion: e.target.value }
                                      : x
                                  )
                                )
                              }
                              style={{
                                backgroundColor: colorOf(o.congregacion),
                                color: '#fff',
                              }}
                              className="rounded px-2 py-1 font-medium text-xs w-full"
                            >
                              <option
                                value=""
                                className="bg-white text-slate-800"
                              >
                                Seleccionar...
                              </option>
                              {db.Congregaciones.map((c) => (
                                <option
                                  key={c.id}
                                  value={c.nombre}
                                  className="bg-white text-slate-800"
                                >
                                  {c.nombre}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              value={o.telefono}
                              onChange={(e) =>
                                updateSheet('Directorio', (p) =>
                                  p.map((x) =>
                                    x.id === o.id
                                      ? { ...x, telefono: e.target.value }
                                      : x
                                  )
                                )
                              }
                              className="border rounded px-2 py-1 w-28"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              value={o.bosquejos}
                              onChange={(e) =>
                                updateSheet('Directorio', (p) =>
                                  p.map((x) =>
                                    x.id === o.id
                                      ? { ...x, bosquejos: e.target.value }
                                      : x
                                  )
                                )
                              }
                              className="border rounded px-2 py-1 w-32"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              value={o.cargo}
                              onChange={(e) =>
                                updateSheet('Directorio', (p) =>
                                  p.map((x) =>
                                    x.id === o.id
                                      ? { ...x, cargo: e.target.value }
                                      : x
                                  )
                                )
                              }
                              className="border rounded px-2 py-1 w-28"
                            />
                          </td>
                          <td className="p-2 text-slate-500 font-medium">
                            {fmtFecha(o.ultimaVisita) || 'Sin registro'}
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() =>
                                updateSheet('Directorio', (p) =>
                                  p.filter((x) => x.id !== o.id)
                                )
                              }
                              className="text-rose-600 hover:bg-rose-50 p-1.5 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBTAB: CONGREGACIONES */}
            {subTabDir === 'congregaciones' && (
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                  <h3 className="font-bold text-sm">
                    Coordinadores y Colores por Congregación
                  </h3>
                  <button
                    onClick={() =>
                      updateSheet('Congregaciones', (p) => [
                        ...p,
                        {
                          id: uid(),
                          nombre: 'Nueva Congregación',
                          coordinador: '',
                          telefono: '',
                          circuito: '',
                          horario: '',
                          color: '#2563eb',
                        },
                      ])
                    }
                    className="bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nueva Congregación
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead className="bg-slate-100 text-slate-600 border-b">
                      <tr>
                        <th className="p-3">Color</th>
                        <th className="p-3">Congregación</th>
                        <th className="p-3">Coordinador</th>
                        <th className="p-3">Teléfono</th>
                        <th className="p-3">Circuito</th>
                        <th className="p-3">Horario de Reunión</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {db.Congregaciones.map((c) => (
                        <tr key={c.id}>
                          <td className="p-2">
                            <input
                              type="color"
                              value={c.color}
                              onChange={(e) =>
                                updateSheet('Congregaciones', (p) =>
                                  p.map((x) =>
                                    x.id === c.id
                                      ? { ...x, color: e.target.value }
                                      : x
                                  )
                                )
                              }
                              className="w-10 h-8 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              value={c.nombre}
                              onChange={(e) =>
                                updateSheet('Congregaciones', (p) =>
                                  p.map((x) =>
                                    x.id === c.id
                                      ? { ...x, nombre: e.target.value }
                                      : x
                                  )
                                )
                              }
                              className="border rounded px-2 py-1 font-semibold w-full"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              value={c.coordinador}
                              onChange={(e) =>
                                updateSheet('Congregaciones', (p) =>
                                  p.map((x) =>
                                    x.id === c.id
                                      ? { ...x, coordinador: e.target.value }
                                      : x
                                  )
                                )
                              }
                              className="border rounded px-2 py-1 w-full"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              value={c.telefono}
                              onChange={(e) =>
                                updateSheet('Congregaciones', (p) =>
                                  p.map((x) =>
                                    x.id === c.id
                                      ? { ...x, telefono: e.target.value }
                                      : x
                                  )
                                )
                              }
                              className="border rounded px-2 py-1 w-28"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              value={c.circuito}
                              onChange={(e) =>
                                updateSheet('Congregaciones', (p) =>
                                  p.map((x) =>
                                    x.id === c.id
                                      ? { ...x, circuito: e.target.value }
                                      : x
                                  )
                                )
                              }
                              className="border rounded px-2 py-1 w-24"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              value={c.horario}
                              onChange={(e) =>
                                updateSheet('Congregaciones', (p) =>
                                  p.map((x) =>
                                    x.id === c.id
                                      ? { ...x, horario: e.target.value }
                                      : x
                                  )
                                )
                              }
                              className="border rounded px-2 py-1 w-32"
                            />
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() =>
                                updateSheet('Congregaciones', (p) =>
                                  p.filter((x) => x.id !== c.id)
                                )
                              }
                              className="text-rose-600 p-1.5"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBTAB: BOSQUEJOS */}
            {subTabDir === 'bosquejos' && (
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-sm">Lista de Bosquejos</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                      Azul = Actualizado
                    </span>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-semibold">
                      Naranja = Descontinuado
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      updateSheet('Bosquejos', (p) => [
                        {
                          id: uid(),
                          numero: '',
                          titulo: 'Nuevo Bosquejo',
                          estado: 'Vigente',
                        },
                        ...p,
                      ])
                    }
                    className="bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Bosquejo
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[550px]">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead className="bg-slate-100 text-slate-600 border-b sticky top-0">
                      <tr>
                        <th className="p-3 w-28">Número</th>
                        <th className="p-3">Título del Discurso</th>
                        <th className="p-3 w-44">Estado</th>
                        <th className="p-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {db.Bosquejos.map((b) => {
                        const isOrange = b.estado
                          .toLowerCase()
                          .includes('descontinuado');
                        const isBlue = b.estado
                          .toLowerCase()
                          .includes('actualizado');
                        return (
                          <tr
                            key={b.id}
                            className={
                              isOrange
                                ? 'bg-orange-50/90 text-orange-950'
                                : isBlue
                                ? 'bg-blue-50/90 text-blue-950'
                                : ''
                            }
                          >
                            <td className="p-2">
                              <input
                                value={b.numero}
                                onChange={(e) =>
                                  updateSheet('Bosquejos', (p) =>
                                    p.map((x) =>
                                      x.id === b.id
                                        ? { ...x, numero: e.target.value }
                                        : x
                                    )
                                  )
                                }
                                className="border rounded px-2 py-1 w-20 font-bold bg-white/80"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                value={b.titulo}
                                onChange={(e) =>
                                  updateSheet('Bosquejos', (p) =>
                                    p.map((x) =>
                                      x.id === b.id
                                        ? { ...x, titulo: e.target.value }
                                        : x
                                    )
                                  )
                                }
                                className="border rounded px-2 py-1 w-full bg-white/80 font-medium"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={b.estado}
                                onChange={(e) =>
                                  updateSheet('Bosquejos', (p) =>
                                    p.map((x) =>
                                      x.id === b.id
                                        ? { ...x, estado: e.target.value }
                                        : x
                                    )
                                  )
                                }
                                className={`border rounded px-2 py-1 w-full font-semibold text-xs ${
                                  isOrange
                                    ? 'bg-orange-500 text-white'
                                    : isBlue
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-slate-700'
                                }`}
                              >
                                <option value="Vigente">Vigente</option>
                                <option value="Actualizado">
                                  Actualizado (Azul)
                                </option>
                                <option value="Descontinuado">
                                  Descontinuado (Naranja)
                                </option>
                              </select>
                            </td>
                            <td className="p-2">
                              <button
                                onClick={() =>
                                  updateSheet('Bosquejos', (p) =>
                                    p.filter((x) => x.id !== b.id)
                                  )
                                }
                                className="text-rose-600 p-1.5"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBTAB: LOCALES */}
            {subTabDir === 'locales' && (
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                  <h3 className="font-bold text-sm">
                    Conferenciantes Locales (La Fe)
                  </h3>
                  <button
                    onClick={() =>
                      updateSheet('Locales', (p) => [
                        ...p,
                        {
                          id: uid(),
                          nombre: 'Nuevo Hermano Local',
                          cargo: 'Anciano',
                          telefono: '',
                          bosquejos: '',
                        },
                      ])
                    }
                    className="bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nuevo Local
                  </button>
                </div>
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-slate-100 text-slate-600 border-b">
                    <tr>
                      <th className="p-3">Nombre del Hermano</th>
                      <th className="p-3">Cargo</th>
                      <th className="p-3">Bosquejos Asignados</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {db.Locales.map((l) => (
                      <tr key={l.id}>
                        <td className="p-2">
                          <input
                            value={l.nombre}
                            onChange={(e) =>
                              updateSheet('Locales', (p) =>
                                p.map((x) =>
                                  x.id === l.id
                                    ? { ...x, nombre: e.target.value }
                                    : x
                                )
                              )
                            }
                            className="border rounded px-2 py-1 w-full font-medium"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={l.cargo || ''}
                            onChange={(e) =>
                              updateSheet('Locales', (p) =>
                                p.map((x) =>
                                  x.id === l.id
                                    ? { ...x, cargo: e.target.value }
                                    : x
                                )
                              )
                            }
                            className="border rounded px-2 py-1 w-40"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={l.bosquejos}
                            onChange={(e) =>
                              updateSheet('Locales', (p) =>
                                p.map((x) =>
                                  x.id === l.id
                                    ? { ...x, bosquejos: e.target.value }
                                    : x
                                )
                              )
                            }
                            className="border rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() =>
                              updateSheet('Locales', (p) =>
                                p.filter((x) => x.id !== l.id)
                              )
                            }
                            className="text-rose-600 p-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: SALIDAS LOCALES (2026 - 2027) */}
        {activeTab === 'salidas' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control de Límite Anual (Máx 4) */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 h-fit">
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Control
                Anual (Máx. {LIMITE_ANUAL} salidas)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Contador automático por año para no sobrecargar a los
                conferenciantes locales.
              </p>
              <div className="space-y-2.5">
                {db.Locales.map((l) => {
                  const s2026 = db.Salidas.filter(
                    (s) =>
                      s.local === l.nombre && String(s.fecha).startsWith('2026')
                  ).length;
                  const s2027 = db.Salidas.filter(
                    (s) =>
                      s.local === l.nombre && String(s.fecha).startsWith('2027')
                  ).length;
                  return (
                    <div
                      key={l.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-sm text-slate-800">
                          {l.nombre}
                        </p>
                        <p className="text-xs text-slate-500">
                          Bosquejos: {l.bosquejos || '-'}
                        </p>
                      </div>
                      <div className="flex gap-2 text-xs font-bold">
                        <span
                          className={`px-2 py-1 rounded ${
                            s2026 >= LIMITE_ANUAL
                              ? 'bg-rose-600 text-white'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          2026: {s2026}/{LIMITE_ANUAL}
                        </span>
                        <span
                          className={`px-2 py-1 rounded ${
                            s2027 >= LIMITE_ANUAL
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          2027: {s2027}/{LIMITE_ANUAL}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabla de Salidas */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <h3 className="font-bold text-slate-800">
                  Registro de Salidas (Hasta Septiembre 2027)
                </h3>
                <button
                  onClick={() =>
                    updateSheet('Salidas', (p) => [
                      {
                        id: uid(),
                        fecha: new Date().toISOString().slice(0, 10),
                        local: db.Locales[0]?.nombre || '',
                        congregacion: '',
                        bosquejo: '',
                      },
                      ...p,
                    ])
                  }
                  className="bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Registrar Salida
                </button>
              </div>
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-slate-100 text-slate-600 border-b sticky top-0">
                    <tr>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Hermano Local</th>
                      <th className="p-3">Congregación Visitada</th>
                      <th className="p-3">Bosquejo</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {db.Salidas.map((s) => (
                      <tr key={s.id}>
                        <td className="p-2.5">
                          <input
                            type="date"
                            value={s.fecha}
                            onChange={(e) =>
                              updateSheet('Salidas', (p) =>
                                p.map((x) =>
                                  x.id === s.id
                                    ? { ...x, fecha: e.target.value }
                                    : x
                                )
                              )
                            }
                            className="border rounded px-2 py-1"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={s.local}
                            onChange={(e) =>
                              updateSheet('Salidas', (p) =>
                                p.map((x) =>
                                  x.id === s.id
                                    ? { ...x, local: e.target.value }
                                    : x
                                )
                              )
                            }
                            className="border rounded px-2 py-1.5 w-full bg-white font-medium"
                          >
                            <option value="">-- Seleccionar Hermano --</option>
                            {db.Locales.map((l) => (
                              <option key={l.id} value={l.nombre}>
                                {l.nombre}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5">
                          <select
                            value={s.congregacion}
                            onChange={(e) =>
                              updateSheet('Salidas', (p) =>
                                p.map((x) =>
                                  x.id === s.id
                                    ? { ...x, congregacion: e.target.value }
                                    : x
                                )
                              )
                            }
                            className="border rounded px-2 py-1.5 w-full bg-white"
                          >
                            <option value="">-- Congregación --</option>
                            {db.Congregaciones.map((c) => (
                              <option key={c.id} value={c.nombre}>
                                {c.nombre}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5">
                          <select
                            value={s.bosquejo}
                            onChange={(e) =>
                              updateSheet('Salidas', (p) =>
                                p.map((x) =>
                                  x.id === s.id
                                    ? { ...x, bosquejo: e.target.value }
                                    : x
                                )
                              )
                            }
                            className="border rounded px-2 py-1.5 w-28 bg-white font-semibold"
                          >
                            <option value="">N°</option>
                            {db.Bosquejos.map((b) => (
                              <option key={b.id} value={b.numero}>
                                #{b.numero}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5">
                          <button
                            onClick={() =>
                              updateSheet('Salidas', (p) =>
                                p.filter((x) => x.id !== s.id)
                              )
                            }
                            className="text-rose-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: AGENDA INDIVIDUAL */}
        {activeTab === 'agenda' && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 max-w-3xl mx-auto">
            <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Calendario Personalizado de Salidas
                </h2>
                <p className="text-xs text-slate-500">
                  Selecciona el nombre de un conferenciante local para ver e
                  imprimir su agenda (2026 - 2027).
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimir Agenda
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                Seleccionar Conferenciante Local:
              </label>
              <select
                value={selectedLocal}
                onChange={(e) => setSelectedLocal(e.target.value)}
                className="w-full md:w-80 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold bg-white"
              >
                <option value="">-- Ver todos / Elegir hermano --</option>
                {db.Locales.map((l) => (
                  <option key={l.id} value={l.nombre}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {db.Salidas.filter(
                (s) => !selectedLocal || s.local === selectedLocal
              ).map((s) => {
                const bObj = db.Bosquejos.find(
                  (b) => String(b.numero) === String(s.bosquejo)
                );
                const cObj = db.Congregaciones.find(
                  (c) => c.nombre === s.congregacion
                );
                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-3 bg-slate-50/60"
                  >
                    <div>
                      <span className="text-xs font-bold uppercase text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                        📅 {fmtFecha(s.fecha)}
                      </span>
                      <h4 className="font-bold text-slate-900 mt-2">
                        {s.local}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        📚 Discurso #{s.bosquejo}:{' '}
                        <span className="font-semibold">
                          {bObj?.titulo || 'Sin título'}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        style={{ backgroundColor: colorOf(s.congregacion) }}
                        className="text-white text-xs font-bold px-3 py-1 rounded-full"
                      >
                        🏛️ {s.congregacion || 'Por definir'}
                      </span>
                      {cObj && (
                        <p className="text-xs text-slate-500 mt-1.5">
                          🕒 Reunión: {cObj.horario} • Tel: {cObj.telefono}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL CONFIGURACIÓN GOOGLE SHEETS */}
      {modalConfig && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              ⚙️ Conectar con Google Sheets
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Pega aquí la URL de tu aplicación web de Google Apps Script
              (terminada en{' '}
              <code className="bg-slate-100 px-1 rounded">/exec</code>).
            </p>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalConfig(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const clean = tempUrl.trim();
                  setGasUrl(clean);
                  localStorage.setItem(LS_URL, clean);
                  setModalConfig(false);
                  if (clean) void sync(clean);
                }}
                className="px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-600 text-white rounded-lg"
              >
                Guardar y Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ACERCA DEL SISTEMA */}
      {modalAbout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Sistema de Control de Conferencias La Fe
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Gestión integral de conferenciantes visitantes, catálogo de
              bosquejos, control de límite de 4 salidas anuales y agenda
              individual hasta septiembre de 2027.
            </p>
            <div className="bg-slate-100 rounded-xl p-3 text-xs font-bold text-slate-800 mb-4">
              Desarrollado por Arly Dev • VS1.1.0 A.D
            </div>
            <button
              onClick={() => setModalAbout(false)}
              className="w-full py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500">
        Sistema de Control de Conferencias La Fe •{' '}
        <span className="font-semibold text-slate-700">
          Desarrollado por Arly Dev • VS1.1.0 A.D
        </span>
      </footer>
    </div>
  );
}
