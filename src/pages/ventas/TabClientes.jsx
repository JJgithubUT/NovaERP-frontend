import React, { useState, useEffect } from 'react';

export default function TabClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    id: null,
    razon_social: '',
    rfc_o_id_fiscal: '',
    correo: '',
    telefono: '',
    limite_credito: '0.00',
    activo: true
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwt_token') || localStorage.getItem('access');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchClientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ventas/clientes/', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || `Error HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Datos de clientes recibidos del backend:", data);
      
      // Soporta tanto arreglos directos como respuestas paginadas de DRF
      const listaClientes = Array.isArray(data) ? data : (data.results || data.data || []);
      setClientes(listaClientes);
    } catch (err) {
      console.error("Error al cargar clientes:", err);
      setError(err.message);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Limpiamos campos vacíos para evitar que restricciones del backend (como EmailValidator o Unique) fallen
    const payload = {
      razon_social: formData.razon_social.trim(),
      rfc_o_id_fiscal: formData.rfc_o_id_fiscal.trim() ? formData.rfc_o_id_fiscal.trim() : null,
      correo: formData.correo.trim() ? formData.correo.trim() : null,
      telefono: formData.telefono.trim() ? formData.telefono.trim() : null,
      limite_credito: parseFloat(formData.limite_credito) || 0.00,
      activo: Boolean(formData.activo)
    };

    console.log("Enviando payload al servidor:", payload);

    try {
      const url = isEditing 
        ? `/api/ventas/clientes/${formData.id}/` 
        : '/api/ventas/clientes/';
      
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const responseData = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Error devuelto por el servidor:", responseData);
        alert(`El servidor rechazó el registro:\n${JSON.stringify(responseData, null, 2)}`);
        return;
      }

      console.log("Cliente guardado con éxito:", responseData);
      setShowModal(false);
      resetForm();
      await fetchClientes(); // Recargamos la lista inmediatamente
    } catch (err) {
      console.error("Error de red al guardar cliente:", err);
      alert("Ocurrió un error de red o de código al intentar guardar.");
    }
  };

  const handleToggleActivo = async (cliente) => {
    if (!cliente || !cliente.id) {
      alert("Error: El cliente no cuenta con un ID válido.");
      return;
    }

    const nuevoEstado = !cliente.activo;
    const accionTexto = nuevoEstado ? 'activar' : 'desactivar';
    
    if (!window.confirm(`¿Deseas ${accionTexto} al cliente "${cliente.razon_social}"?`)) return;
    
    try {
      const res = await fetch(`/api/ventas/clientes/${cliente.id}/`, { 
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ activo: nuevoEstado })
      });

      if (res.ok) {
        await fetchClientes();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`El servidor rechazó el cambio: ${JSON.stringify(errorData)}`);
      }
    } catch (err) {
      console.error("Error en la petición de cambio de estado:", err);
      alert("Error de conexión al intentar actualizar el estado.");
    }
  };

  const handleEditClick = (cliente) => {
    setFormData({
      id: cliente.id,
      razon_social: cliente.razon_social || '',
      rfc_o_id_fiscal: cliente.rfc_o_id_fiscal || '',
      correo: cliente.correo || '',
      telefono: cliente.telefono || '',
      limite_credito: cliente.limite_credito || '0.00',
      activo: Boolean(cliente.activo)
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      id: null,
      razon_social: '',
      rfc_o_id_fiscal: '',
      correo: '',
      telefono: '',
      limite_credito: '0.00',
      activo: true
    });
    setIsEditing(false);
  };

  const clientesFiltrados = clientes.filter(c => 
    c.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.rfc_o_id_fiscal?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
          <strong>Aviso de backend:</strong> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-red-800">Clientes</h2>
          <p className="text-slate-500 text-xs">Catálogo de clientes, datos fiscales y límite de crédito.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar por Razón Social o RFC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
          />
        </div>
        
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>+</span> Nuevo Cliente
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">Razón Social</th>
              <th className="p-3">RFC / ID Fiscal</th>
              <th className="p-3">Contacto</th>
              <th className="p-3 text-right">Límite de Crédito</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-6 text-center text-slate-400">
                  Cargando catálogo desde la base de datos...
                </td>
              </tr>
            ) : clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  No se encontraron clientes registrados.
                </td>
              </tr>
            ) : (
              clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold text-slate-800">{cliente.razon_social}</td>
                  <td className="p-3 font-mono text-slate-600">{cliente.rfc_o_id_fiscal || 'Sin RFC'}</td>
                  <td className="p-3 text-slate-600">
                    <div>{cliente.correo || 'Sin correo'}</div>
                    <div className="text-[10px] text-slate-400">{cliente.telefono}</div>
                  </td>
                  <td className="p-3 text-right font-medium text-slate-700">
                    ${Number(cliente.limite_credito || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      cliente.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleEditClick(cliente)}
                        className="w-20 shrink-0 px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 rounded border border-red-800 text-[11px] font-medium text-center transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActivo(cliente)}
                        className={`w-24 shrink-0 px-2.5 py-1 rounded border border-red-800 text-[11px] font-medium text-center transition-colors ${
                          cliente.activo 
                            ? 'bg-white hover:bg-red-50 text-red-800' 
                            : 'bg-red-800 hover:bg-red-900 text-white'
                        }`}
                      >
                        {cliente.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {isEditing ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Ingresa los datos fiscales y comerciales del cliente.</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Razón Social *</label>
                <input
                  type="text"
                  required
                  value={formData.razon_social}
                  onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">RFC / ID Fiscal</label>
                  <input
                    type="text"
                    value={formData.rfc_o_id_fiscal}
                    onChange={(e) => setFormData({ ...formData, rfc_o_id_fiscal: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Límite de Crédito ($ MXN)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.limite_credito}
                    onChange={(e) => setFormData({ ...formData, limite_credito: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="rounded border-slate-300 text-red-800 focus:ring-red-800"
                />
                <label htmlFor="activo" className="text-xs text-slate-700 font-medium">Cliente Activo</label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-red-800 text-white rounded-lg text-xs font-medium hover:bg-red-900 transition-colors"
                >
                  {isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}