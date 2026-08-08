import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Producto } from '../../../api/models';
import { ProductoFormModal } from './producto-form.modal';

const PRODUCTO: Producto = {
  id: 'producto-3',
  sku: 'MTR-1HP',
  nombre: 'Motor eléctrico 1HP',
  descripcion: 'Trifásico',
  costo_referencia: '1200.50',
  precio_venta: '1899.00',
  stock_minimo: '5',
  activo: true,
};

/**
 * El mismo prellenado en constructor estaba en diez modales de edición; este
 * cubre uno de otro módulo para que el arreglo quede fijado más allá de
 * administración, que es donde se detectó.
 *
 * Aquí el fallo tenía además consecuencia numérica: `costo_referencia` y
 * `precio_venta` salían en '0', así que guardar sin darse cuenta ponía el precio
 * del producto a cero.
 */
describe('ProductoFormModal · prellenado al editar', () => {
  function montar(producto: Producto | null) {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    const fixture = TestBed.createComponent(ProductoFormModal);
    fixture.componentRef.setInput('producto', producto);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as {
      form: { getRawValue: () => Record<string, string> };
    };
  }

  it('rellena todos los campos del producto', () => {
    expect(montar(PRODUCTO).form.getRawValue()).toEqual({
      sku: 'MTR-1HP',
      nombre: 'Motor eléctrico 1HP',
      descripcion: 'Trifásico',
      costo_referencia: '1200.50',
      precio_venta: '1899.00',
      stock_minimo: '5',
    });
  });

  it('arranca con los valores por defecto al crear', () => {
    expect(montar(null).form.getRawValue()).toEqual({
      sku: '',
      nombre: '',
      descripcion: '',
      costo_referencia: '0',
      precio_venta: '0',
      stock_minimo: '0',
    });
  });
});
