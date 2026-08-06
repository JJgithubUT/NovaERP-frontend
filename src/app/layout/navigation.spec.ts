import type { Modulo } from '../api/models';
import { construirNavegacion } from './navigation';

const INVENTARIO: Modulo = { codigo: 'INVENTARIO', nombre: 'Inventario', fase: 1 };
const VENTAS: Modulo = { codigo: 'VENTAS', nombre: 'Ventas', fase: 1 };

describe('construirNavegacion', () => {
  it('parte las rutas en un elemento por segmento', () => {
    const [grupo] = construirNavegacion([INVENTARIO], 'acme');

    // Un 'inventario/productos' de una sola pieza haría que Angular generase
    // /acme/inventario%2Fproductos, y el enlace no resolvería a ninguna ruta.
    expect(grupo!.items[0]!.link).toEqual(['/', 'acme', 'inventario', 'productos']);
    expect(
      grupo!.items[0]!.link.some((segmento) => segmento.includes('/') && segmento !== '/'),
    ).toBe(false);
  });

  it('antepone el tenant a cada enlace', () => {
    const grupos = construirNavegacion([INVENTARIO, VENTAS], 'otra-empresa');
    const links = grupos.flatMap((grupo) => grupo.items.map((item) => item.link));

    expect(links.every((link) => link[1] === 'otra-empresa')).toBe(true);
  });

  it('solo muestra los módulos que el tenant tiene habilitados', () => {
    const grupos = construirNavegacion([VENTAS], 'acme');

    expect(grupos.map((grupo) => grupo.codigo)).toEqual(['VENTAS']);
  });

  it('ignora un módulo que el backend habilite pero que aún no tenga pantallas', () => {
    const futuro: Modulo = { codigo: 'FINANZAS', nombre: 'Finanzas', fase: 2 };
    const grupos = construirNavegacion([INVENTARIO, futuro], 'acme');

    // Un grupo vacío en el sidebar sería un encabezado sin nada debajo.
    expect(grupos.map((grupo) => grupo.codigo)).toEqual(['INVENTARIO']);
  });

  it('no arma nada sin tenant: no hay a dónde enlazar', () => {
    expect(construirNavegacion([INVENTARIO], null)).toEqual([]);
  });
});
