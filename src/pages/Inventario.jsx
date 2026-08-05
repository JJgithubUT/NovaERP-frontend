import React, { useState } from 'react';
import TabStock from './inventario/TabStock';
import TabProductos from './inventario/TabProductos';
import TabAlmacenes from './inventario/TabAlmacenes';
import TabMovimientos from './inventario/TabMovimientos';
import TabTransferencias from './inventario/TabTransferencias';
import TabAjustes from './inventario/TabAjustes';
import TabAlertas from './inventario/TabAlertas';
import {
  ModalCrearProducto,
  ModalCrearAlmacen,
  ModalCrearMovimiento,
  ModalCrearAjuste,
  ModalCrearTransferencia,
} from './inventario/InventarioModales';
import { inventarioApi, useResourceList, pageParams, searchParam, PAGE_SIZE } from './inventario/api';

export default function Inventario() {
  const [activeTab, setActiveTab] = useState('stock');
  const [toast, setToast] = useState(null);

  function notificar(tipo, mensaje) {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), 3500);
  }

  // ---------------------------------------------------------- Stock (RF-59)
  const [stockPage, setStockPage] = useState(1);
  const [stockSearch, setStockSearch] = useState('');
  const stock = useResourceList(
    inventarioApi.listarStockDisponible,
    pageParams(stockPage, searchParam(stockSearch)),
    { enabled: activeTab === 'stock' }
  );

  // ---------------------------------------------------------- Productos
  const [productosPage, setProductosPage] = useState(1);
  const [productosSearch, setProductosSearch] = useState('');
  const productos = useResourceList(
    inventarioApi.listarProductos,
    pageParams(productosPage, searchParam(productosSearch)),
    { enabled: activeTab === 'productos' }
  );

  // ---------------------------------------------------------- Almacenes
  const [almacenesPage, setAlmacenesPage] = useState(1);
  const [almacenesSearch, setAlmacenesSearch] = useState('');
  const almacenes = useResourceList(
    inventarioApi.listarAlmacenes,
    pageParams(almacenesPage, searchParam(almacenesSearch)),
    { enabled: activeTab === 'almacenes' }
  );

  // ---------------------------------------------------------- Kardex (RF-62)
  const [kardexPage, setKardexPage] = useState(1);
  const [kardexFiltros, setKardexFiltros] = useState({ sku: '', almacen: '', tipo: '' });
  const kardex = useResourceList(
    inventarioApi.listarKardex,
    pageParams(kardexPage, kardexFiltros),
    { enabled: activeTab === 'movimientos' }
  );

  // ---------------------------------------------------------- Transferencias (RF-61)
  const [transferenciasPage, setTransferenciasPage] = useState(1);
  const transferencias = useResourceList(
    inventarioApi.listarTransferencias,
    pageParams(transferenciasPage),
    { enabled: activeTab === 'transferencias' }
  );

  // ---------------------------------------------------------- Ajustes (RF-60)
  const [ajustesPage, setAjustesPage] = useState(1);
  const ajustes = useResourceList(
    inventarioApi.listarAjustes,
    pageParams(ajustesPage),
    { enabled: activeTab === 'ajustes' }
  );

  // ---------------------------------------------------------- Alertas (RF-63)
  const [alertasPage, setAlertasPage] = useState(1);
  const [alertasFiltro, setAlertasFiltro] = useState('');
  const alertas = useResourceList(
    inventarioApi.listarAlertas,
    pageParams(alertasPage, { notificada: alertasFiltro || undefined }),
    { enabled: activeTab === 'alertas' }
  );
  const [notificandoId, setNotificandoId] = useState(null);

  // ---------------------------------------------------------- Modales
  const [modalProducto, setModalProducto] = useState({ open: false, producto: null });
  const [modalAlmacen, setModalAlmacen] = useState({ open: false, almacen: null });
  const [modalMovimiento, setModalMovimiento] = useState(false);
  const [modalAjuste, setModalAjuste] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);

  // ---------------------------------------------------------- Handlers
  async function guardarProducto(data) {
    if (modalProducto.producto) {
      await inventarioApi.editarProducto(modalProducto.producto.id, data);
      notificar('success', 'Producto actualizado.');
    } else {
      await inventarioApi.crearProducto(data);
      notificar('success', 'Producto creado.');
    }
    productos.reload();
    setModalProducto({ open: false, producto: null });
  }
  async function darDeBajaProducto() {
    await inventarioApi.darDeBajaProducto(modalProducto.producto.id);
    notificar('success', 'Producto dado de baja.');
    productos.reload();
    setModalProducto({ open: false, producto: null });
  }

  async function guardarAlmacen(data) {
    if (modalAlmacen.almacen) {
      await inventarioApi.editarAlmacen(modalAlmacen.almacen.id, data);
      notificar('success', 'Almacén actualizado.');
    } else {
      await inventarioApi.crearAlmacen(data);
      notificar('success', 'Almacén creado.');
    }
    almacenes.reload();
    setModalAlmacen({ open: false, almacen: null });
  }
  async function darDeBajaAlmacen() {
    await inventarioApi.darDeBajaAlmacen(modalAlmacen.almacen.id);
    notificar('success', 'Almacén dado de baja.');
    almacenes.reload();
    setModalAlmacen({ open: false, almacen: null });
  }

  async function registrarMovimiento(data) {
    await inventarioApi.crearMovimiento(data);
    notificar('success', 'Movimiento registrado.');
    kardex.reload();
    stock.reload();
    setModalMovimiento(false);
  }

  async function registrarAjuste(data) {
    await inventarioApi.crearAjuste(data);
    notificar('success', 'Ajuste aplicado.');
    ajustes.reload();
    kardex.reload();
    stock.reload();
    setModalAjuste(false);
  }

  async function registrarTransferencia(data) {
    await inventarioApi.crearTransferencia(data);
    notificar('success', 'Transferencia realizada.');
    transferencias.reload();
    kardex.reload();
    stock.reload();
    setModalTransferencia(false);
  }

  async function marcarAlertaNotificada(id) {
    setNotificandoId(id);
    try {
      await inventarioApi.notificarAlerta(id);
      alertas.reload();
    } catch (err) {
      notificar('error', err.message);
    } finally {
      setNotificandoId(null);
    }
  }

  const tabs = [
    { id: 'stock', label: 'Stock' },
    { id: 'productos', label: 'Productos' },
    { id: 'almacenes', label: 'Almacenes' },
    { id: 'movimientos', label: 'Kardex' },
    { id: 'transferencias', label: 'Transferencias' },
    { id: 'ajustes', label: 'Ajustes' },
    { id: 'alertas', label: 'Alertas' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Encabezado + menú de pestañas */}
      <div className="sticky top-0 z-20 bg-slate-50 px-6 pt-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Módulo de Inventario</h1>
          <p className="text-slate-500 text-sm">
            Control de existencias, almacenes, movimientos y kardex.
          </p>
        </div>

        <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-lg shadow-sm space-x-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#800000] text-[#800000] font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="px-6 pb-6">
        <div className="bg-white p-6 rounded-b-lg shadow-sm border border-t-0 border-slate-200">
          {activeTab === 'stock' && (
            <TabStock
              stock={stock.results}
              loading={stock.loading}
              error={stock.error}
              search={stockSearch}
              onSearchChange={(v) => { setStockSearch(v); setStockPage(1); }}
              page={stockPage}
              onPageChange={setStockPage}
              count={stock.count}
              pageSize={PAGE_SIZE}
            />
          )}

          {activeTab === 'productos' && (
            <TabProductos
              productos={productos.results}
              loading={productos.loading}
              error={productos.error}
              search={productosSearch}
              onSearchChange={(v) => { setProductosSearch(v); setProductosPage(1); }}
              page={productosPage}
              onPageChange={setProductosPage}
              count={productos.count}
              pageSize={PAGE_SIZE}
              onNuevoProducto={() => setModalProducto({ open: true, producto: null })}
              onEditarProducto={(p) => setModalProducto({ open: true, producto: p })}
            />
          )}

          {activeTab === 'almacenes' && (
            <TabAlmacenes
              almacenes={almacenes.results}
              loading={almacenes.loading}
              error={almacenes.error}
              search={almacenesSearch}
              onSearchChange={(v) => { setAlmacenesSearch(v); setAlmacenesPage(1); }}
              page={almacenesPage}
              onPageChange={setAlmacenesPage}
              count={almacenes.count}
              pageSize={PAGE_SIZE}
              onNuevoAlmacen={() => setModalAlmacen({ open: true, almacen: null })}
              onEditarAlmacen={(a) => setModalAlmacen({ open: true, almacen: a })}
            />
          )}

          {activeTab === 'movimientos' && (
            <TabMovimientos
              kardexList={kardex.results}
              loading={kardex.loading}
              error={kardex.error}
              filtros={kardexFiltros}
              onFiltroChange={(f) => { setKardexFiltros(f); setKardexPage(1); }}
              page={kardexPage}
              onPageChange={setKardexPage}
              count={kardex.count}
              pageSize={PAGE_SIZE}
              onNuevoMovimiento={() => setModalMovimiento(true)}
            />
          )}

          {activeTab === 'transferencias' && (
            <TabTransferencias
              transferencias={transferencias.results}
              loading={transferencias.loading}
              error={transferencias.error}
              page={transferenciasPage}
              onPageChange={setTransferenciasPage}
              count={transferencias.count}
              pageSize={PAGE_SIZE}
              onNuevaTransferencia={() => setModalTransferencia(true)}
            />
          )}

          {activeTab === 'ajustes' && (
            <TabAjustes
              ajustes={ajustes.results}
              loading={ajustes.loading}
              error={ajustes.error}
              page={ajustesPage}
              onPageChange={setAjustesPage}
              count={ajustes.count}
              pageSize={PAGE_SIZE}
              onNuevoAjuste={() => setModalAjuste(true)}
            />
          )}

          {activeTab === 'alertas' && (
            <TabAlertas
              alertas={alertas.results}
              loading={alertas.loading}
              error={alertas.error}
              filtro={alertasFiltro}
              onFiltroChange={(v) => { setAlertasFiltro(v); setAlertasPage(1); }}
              page={alertasPage}
              onPageChange={setAlertasPage}
              count={alertas.count}
              pageSize={PAGE_SIZE}
              onMarcarNotificada={marcarAlertaNotificada}
              notificandoId={notificandoId}
            />
          )}
        </div>
      </div>

      {/* Modales */}
      <ModalCrearProducto
        isOpen={modalProducto.open}
        producto={modalProducto.producto}
        onClose={() => setModalProducto({ open: false, producto: null })}
        onSubmit={guardarProducto}
        onDarDeBaja={modalProducto.producto ? darDeBajaProducto : undefined}
      />
      <ModalCrearAlmacen
        isOpen={modalAlmacen.open}
        almacen={modalAlmacen.almacen}
        onClose={() => setModalAlmacen({ open: false, almacen: null })}
        onSubmit={guardarAlmacen}
        onDarDeBaja={modalAlmacen.almacen ? darDeBajaAlmacen : undefined}
      />
      <ModalCrearMovimiento
        isOpen={modalMovimiento}
        onClose={() => setModalMovimiento(false)}
        onSubmit={registrarMovimiento}
      />
      <ModalCrearAjuste
        isOpen={modalAjuste}
        onClose={() => setModalAjuste(false)}
        onSubmit={registrarAjuste}
      />
      <ModalCrearTransferencia
        isOpen={modalTransferencia}
        onClose={() => setModalTransferencia(false)}
        onSubmit={registrarTransferencia}
      />

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
            toast.tipo === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          {toast.mensaje}
        </div>
      )}
    </div>
  );
}