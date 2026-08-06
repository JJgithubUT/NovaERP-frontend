import type { Modulo } from '../api/models';
import { construirNavegacion } from './navigation';

const INVENTARIO: Modulo = { codigo: 'INVENTARIO', nombre: 'Inventario', fase: 1 };
const VENTAS: Modulo = { codigo: 'VENTAS', nombre: 'Ventas', fase: 1 };

describe('construirNavegacion', () => {
  it('parte las rutas en un elemento por segmento', () => {
    const [item] = construirNavegacion([INVENTARIO], 'acme');

    // Un 'acme/inventario' de una sola pieza haría que Angular generase
    // /acme%2Finventario, y el enlace no resolvería a ninguna ruta.
    expect(item!.link).toEqual(['/', 'acme', 'inventario']);
    expect(item!.link.some((segmento) => segmento.includes('/') && segmento !== '/')).toBe(false);
  });

  it('antepone el tenant a cada enlace', () => {
    const items = construirNavegacion([INVENTARIO, VENTAS], 'otra-empresa');

    expect(items.every((item) => item.link[1] === 'otra-empresa')).toBe(true);
  });

  it('enlaza a la raíz del módulo, no a una pantalla concreta', () => {
    // Dentro del módulo son las pestañas las que navegan entre secciones; el
    // sidebar solo tiene que llevar hasta la puerta.
    const items = construirNavegacion([INVENTARIO, VENTAS], 'acme');

    expect(items.map((item) => item.link)).toEqual([
      ['/', 'acme', 'inventario'],
      ['/', 'acme', 'ventas'],
    ]);
  });

  it('solo muestra los módulos que el tenant tiene habilitados', () => {
    const items = construirNavegacion([VENTAS], 'acme');

    expect(items.map((item) => item.codigo)).toEqual(['VENTAS']);
  });

  it('ignora un módulo que el backend habilite pero que aún no tenga pantallas', () => {
    const futuro: Modulo = { codigo: 'FINANZAS', nombre: 'Finanzas', fase: 2 };
    const items = construirNavegacion([INVENTARIO, futuro], 'acme');

    expect(items.map((item) => item.codigo)).toEqual(['INVENTARIO']);
  });

  it('no arma nada sin tenant: no hay a dónde enlazar', () => {
    expect(construirNavegacion([INVENTARIO], null)).toEqual([]);
  });
});
