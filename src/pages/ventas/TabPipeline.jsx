import React, { useState, useEffect } from 'react';

// Orden real de las etapas (debe coincidir con ETAPAS en oportunidad_service.py).
const ETAPAS = [
  { id: 'prospeccion', nombre: 'Prospección' },
  { id: 'calificacion', nombre: 'Calificación' },
  { id: 'propuesta', nombre: 'Propuesta' },
  { id: 'negociacion', nombre: 'Negociación' },
  { id: 'cierre', nombre: 'Cierre' },
];
const ETAPAS_ORDEN = ETAPAS.map(e => e.id);

// Catálogo de motivos de pérdida
const MOTIVOS_PERDIDA = ['Precio', 'Competencia', 'Tiempo', 'Presupuesto', 'Sin respuesta', 'Otro'];

const FORM_VACIO = {
  id: null,
  cliente_id: '',
  titulo: '',
  monto: '',
  fecha_cierre_estimada: '',
};

export default function TabPipeline() {
  const [oportunidades, setOportunidades] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cargando, setCargando] = useState(false);
  const [etapaArrastrandoSobre, setEtapaArrastrandoSobre] = useState(null);

  const [formData, setFormData] = useState(FORM_VACIO);
  const esEdicion = Boolean(formData.id);

  const [opAMarcarPerdida, setOpAMarcarPerdida] = useState(null);
  const [motivoPerdida, setMotivoPerdida] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwt_token') || localStorage.getItem('access');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'X-Tenant': 'Tiendas-gamo'
    };
  };

  const cargarOportunidades = () => {
    fetch('/api/ventas/oportunidades/?estado=abierta', {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        const lista = Array.isArray(data) ? data : data.results || [];
        const opsMapeadas = lista.map(op => ({
          id: op.id,
          cliente_id: op.cliente_id,
          titulo: op.nombre,
          monto: parseFloat(op.valor_estimado) || 0,
          etapa: op.etapa,
          estado: op.estado,
          probabilidad: op.probabilidad,
          fecha_cierre_estimada: op.fecha_cierre_estimada || ''
        }));
        setOportunidades(opsMapeadas);
      })
      .catch(err => console.error('Error al cargar oportunidades:', err));
  };

  useEffect(() => {
    cargarOportunidades();

    fetch('/api/ventas/clientes/', {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        setClientes(Array.isArray(data) ? data : data.results || []);
      })
      .catch(err => console.error('Error al cargar clientes:', err));
  }, []);

  const getClienteNombre = (clienteId) => {
    const c = clientes.find(c => String(c.id) === String(clienteId));
    if (!c) return 'Cliente';
    return c.razon_social || c.nombre_comercial || c.nombre || 'Cliente';
  };

  const handleDragStart = (e, opId) => {
    e.dataTransfer.setData('text/plain', opId.toString());
  };

  const handleDragOver = (e, etapaId) => {
    e.preventDefault();
    setEtapaArrastrandoSobre(etapaId);
  };

  const handleDragLeave = (e, etapaId) => {
    e.preventDefault();
    if (etapaArrastrandoSobre === etapaId) {
      setEtapaArrastrandoSobre(null);
    }
  };

  const handleDrop = async (e, targetEtapaId) => {
    e.preventDefault();
    setEtapaArrastrandoSobre(null);
    setErrorMsg('');
    const opId = e.dataTransfer.getData('text/plain');
    if (!opId) return;

    const op = oportunidades.find(o => String(o.id) === String(opId));
    if (!op) return;

    const idxActual = ETAPAS_ORDEN.indexOf(op.etapa);
    const idxDestino = ETAPAS_ORDEN.indexOf(targetEtapaId);
    if (idxDestino !== idxActual + 1) {
      setErrorMsg('Solo puedes avanzar una oportunidad a la etapa siguiente, no se puede saltar ni retroceder.');
      return;
    }

    const etapaAnterior = op.etapa;
    setOportunidades(prev => prev.map(o =>
      String(o.id) === String(opId) ? { ...o, etapa: targetEtapaId } : o
    ));

    try {
      const res = await fetch(`/api/ventas/oportunidades/${opId}/etapa/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ etapa: targetEtapaId })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setOportunidades(prev => prev.map(o =>
          String(o.id) === String(opId) ? { ...o, etapa: etapaAnterior } : o
        ));
        setErrorMsg(errData.detail || 'No se pudo actualizar la etapa.');
      }
    } catch (error) {
      setOportunidades(prev => prev.map(o =>
        String(o.id) === String(opId) ? { ...o, etapa: etapaAnterior } : o
      ));
      setErrorMsg('Error de red al actualizar la etapa.');
    }
  };

  const resetForm = () => {
    setFormData(FORM_VACIO);
    setErrorMsg('');
  };

  const handleAbrirCrear = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleAbrirEditar = (op) => {
    setErrorMsg('');
    setFormData({
      id: op.id,
      cliente_id: op.cliente_id,
      titulo: op.titulo,
      monto: op.monto,
      fecha_cierre_estimada: op.fecha_cierre_estimada,
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setCargando(true);

    try {
      let response;
      if (esEdicion) {
        response = await fetch(`/api/ventas/oportunidades/${formData.id}/`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            nombre: formData.titulo,
            valor_estimado: formData.monto,
            fecha_cierre_estimada: formData.fecha_cierre_estimada || null
          })
        });
      } else {
        response = await fetch('/api/ventas/oportunidades/', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            cliente_id: formData.cliente_id,
            nombre: formData.titulo,
            valor_estimado: formData.monto,
            fecha_cierre_estimada: formData.fecha_cierre_estimada || null
          })
        });
      }

      if (response.ok) {
        const opData = await response.json();
        const opFormateada = {
          id: opData.id,
          cliente_id: opData.cliente_id,
          titulo: opData.nombre,
          monto: parseFloat(opData.valor_estimado) || 0,
          etapa: opData.etapa,
          estado: opData.estado,
          probabilidad: opData.probabilidad,
          fecha_cierre_estimada: opData.fecha_cierre_estimada || ''
        };

        setOportunidades(prev => esEdicion
          ? prev.map(o => String(o.id) === String(opData.id) ? opFormateada : o)
          : [...prev, opFormateada]
        );
        setShowCreateModal(false);
        resetForm();
      } else {
        const errorData = await response.json();
        const mensajeStr = typeof errorData === 'object'
          ? Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          : 'Ocurrió un error al guardar la oportunidad.';
        setErrorMsg(mensajeStr);
      }
    } catch (error) {
      setErrorMsg('Error de red al intentar conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const handleAbrirPerdida = (op) => {
    setErrorMsg('');
    setMotivoPerdida('');
    setOpAMarcarPerdida(op);
  };

  const handleConfirmarPerdida = async (e) => {
    e.preventDefault();
    if (!motivoPerdida || !opAMarcarPerdida) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/ventas/oportunidades/${opAMarcarPerdida.id}/cerrar/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ estado: 'perdida', motivo_perdida: motivoPerdida })
      });
      if (res.ok) {
        setOportunidades(prev => prev.filter(o => String(o.id) !== String(opAMarcarPerdida.id)));
        setOpAMarcarPerdida(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.detail || 'No se pudo marcar la oportunidad como perdida.');
        setOpAMarcarPerdida(null);
      }
    } catch (error) {
      setErrorMsg('Error de red al marcar la oportunidad como perdida.');
      setOpAMarcarPerdida(null);
    } finally {
      setCargando(false);
    }
  };

  const handleConvertir = async (op) => {
    setErrorMsg('');
    const confirmar = window.confirm(
      `¿Marcar "${op.titulo}" como ganada? Una oportunidad cerrada ya no se puede reabrir ni editar.`
    );
    if (!confirmar) return;

    try {
      const res = await fetch(`/api/ventas/oportunidades/${op.id}/cerrar/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ estado: 'ganada' })
      });
      if (res.ok) {
        setOportunidades(prev => prev.filter(o => String(o.id) !== String(op.id)));
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.detail || 'No se pudo convertir la oportunidad.');
      }
    } catch (error) {
      setErrorMsg('Error de red al convertir la oportunidad.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-red-800">Pipeline de Ventas (CRM)</h2>
          <p className="text-slate-400 text-sm">Arrastra las tarjetas a la siguiente etapa para avanzarlas. Solo se muestran oportunidades abiertas.</p>
        </div>
        <button
          onClick={handleAbrirCrear}
          className="bg-red-800 hover:bg-red-950 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          + Nueva Oportunidad
        </button>
      </div>

      {errorMsg && !showCreateModal && !opAMarcarPerdida && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
          <strong>Aviso:</strong> {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {ETAPAS.map((etapa) => {
          const opsEnEtapa = oportunidades.filter(op => op.etapa === etapa.id);
          const totalMonto = opsEnEtapa.reduce((acc, curr) => acc + curr.monto, 0);
          const totalPonderado = opsEnEtapa.reduce((acc, curr) => acc + (curr.monto * (curr.probabilidad / 100)), 0);
          const isOver = etapaArrastrandoSobre === etapa.id;

          return (
            <div
              key={etapa.id}
              onDragOver={(e) => handleDragOver(e, etapa.id)}
              onDragLeave={(e) => handleDragLeave(e, etapa.id)}
              onDrop={(e) => handleDrop(e, etapa.id)}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 min-w-[230px] flex flex-col h-[540px] transition-colors"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-xs uppercase tracking-wider text-red-800">{etapa.nombre}</span>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full font-bold text-red-800 shadow-sm border border-slate-200">
                  {opsEnEtapa.length}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 mb-3 pb-2 border-b border-slate-200">
                <div>Total: <span className="font-semibold text-slate-900">${totalMonto.toLocaleString('es-MX')}</span></div>
                <div className="text-[10px] text-slate-400">Ponderado: ${totalPonderado.toLocaleString('es-MX')}</div>
              </div>

              {/* Contenedor de las tarjetas */}
              <div className={`space-y-3 overflow-y-auto flex-1 p-2 rounded-lg transition-colors ${isOver ? 'bg-slate-200' : 'bg-white'}`}>
                {opsEnEtapa.length === 0 ? (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
                    <span className="text-xs text-slate-400">Arrastra una tarjeta aquí</span>
                  </div>
                ) : (
                  opsEnEtapa.map((op) => {
                    const valorPonderadoCard = op.monto * (op.probabilidad / 100);
                    return (
                      <div
                        key={op.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, op.id)}
                        className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <h4 className="font-semibold text-sm text-slate-900 leading-snug">{op.titulo}</h4>
                          <button
                            onClick={() => handleAbrirEditar(op)}
                            title="Editar oportunidad"
                            className="text-slate-400 hover:text-slate-900 text-xs shrink-0"
                          >
                            ✎
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">{getClienteNombre(op.cliente_id)}</p>

                        <div className="space-y-1 mb-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-900">${op.monto.toLocaleString('es-MX')}</span>
                            <span className="bg-slate-50 text-red-800 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                              {op.probabilidad}%
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Pond: ${valorPonderadoCard.toLocaleString('es-MX')}
                          </div>
                        </div>

                        <div className="flex border-t border-slate-200 pt-2 mt-2 gap-1 justify-between items-center">
                          <button
                            onClick={() => handleAbrirPerdida(op)}
                            className="text-[11px] text-red-800 hover:underline font-medium"
                          >
                            Perdida
                          </button>
                          {op.etapa === 'cierre' && (
                            <button
                              onClick={() => handleConvertir(op)}
                              className="text-[11px] text-white bg-red-800 hover:bg-red-950 px-2 py-1 rounded font-medium transition-colors"
                            >
                              Convertir
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal crear / editar */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-red-800 mb-1">
              {esEdicion ? 'Editar Oportunidad' : 'Nueva Oportunidad Comercial'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {esEdicion ? 'El cliente no se puede modificar una vez creada la oportunidad.' : 'Selecciona un cliente de tu catálogo de ventas.'}
            </p>

            {errorMsg && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1">Cliente *</label>
                <select
                  required
                  disabled={esEdicion}
                  value={formData.cliente_id}
                  onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                  className="w-full text-xs border-slate-200 rounded-lg p-2 border focus:ring-2 focus:ring-red-800 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">-- Selecciona un cliente --</option>
                  {clientes.length > 0 ? (
                    clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.razon_social || c.nombre_comercial || c.nombre}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No hay clientes registrados o cargados</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1">Título de la Oportunidad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Implementación ERP Modulo Ventas"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full text-xs border-slate-200 rounded-lg p-2 border focus:ring-2 focus:ring-red-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1">Monto Estimado (MXN) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full text-xs border-slate-200 rounded-lg p-2 border focus:ring-2 focus:ring-red-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1">Fecha Estimada de Cierre</label>
                <input
                  type="date"
                  value={formData.fecha_cierre_estimada}
                  onChange={(e) => setFormData({ ...formData, fecha_cierre_estimada: e.target.value })}
                  className="w-full text-xs border-slate-200 rounded-lg p-2 border focus:ring-2 focus:ring-red-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-3 py-1.5 bg-red-800 hover:bg-red-950 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                >
                  {cargando ? 'Guardando...' : (esEdicion ? 'Guardar Cambios' : 'Guardar Oportunidad')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal "Perdida" */}
      {opAMarcarPerdida && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-red-800 mb-1">Marcar como Perdida</h3>
            <p className="text-xs text-slate-400 mb-4">
              "{opAMarcarPerdida.titulo}" se cerrará como perdida. El registro no se elimina, solo deja de estar en el pipeline activo.
            </p>

            {errorMsg && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleConfirmarPerdida} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1">Motivo de pérdida *</label>
                <select
                  required
                  value={motivoPerdida}
                  onChange={(e) => setMotivoPerdida(e.target.value)}
                  className="w-full text-xs border-slate-200 rounded-lg p-2 border focus:ring-2 focus:ring-red-800 focus:outline-none"
                >
                  <option value="">-- Selecciona un motivo --</option>
                  {MOTIVOS_PERDIDA.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setOpAMarcarPerdida(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando || !motivoPerdida}
                  className="px-3 py-1.5 bg-red-800 hover:bg-red-950 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                >
                  {cargando ? 'Guardando...' : 'Confirmar Pérdida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}