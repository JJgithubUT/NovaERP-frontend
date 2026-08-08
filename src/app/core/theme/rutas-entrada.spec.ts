import { esRutaDeEntrada } from './rutas-entrada';

/**
 * La lista de pantallas de entrada decide dónde se ignora la preferencia de tema.
 * Equivocarse en un sentido deja el login pintado con el tema de otra persona; en
 * el otro, clava toda la aplicación en claro.
 */
describe('esRutaDeEntrada', () => {
  it('reconoce los dos accesos', () => {
    expect(esRutaDeEntrada('/login')).toBe(true);
    expect(esRutaDeEntrada('/admin/acceso')).toBe(true);
  });

  it('reconoce las dos pantallas de activación', () => {
    expect(esRutaDeEntrada('/activar')).toBe(true);
    expect(esRutaDeEntrada('/activar-organizacion')).toBe(true);
  });

  it('ignora la query', () => {
    // El canje del enlace llega así, y una comparación cruda no acertaría nunca.
    expect(esRutaDeEntrada('/activar-organizacion?token=abc123')).toBe(true);
    expect(esRutaDeEntrada('/login?redirectTo=%2Facme')).toBe(true);
  });

  it('ignora el fragmento y la barra final', () => {
    expect(esRutaDeEntrada('/login#top')).toBe(true);
    expect(esRutaDeEntrada('/login/')).toBe(true);
  });

  it('no confunde las pantallas de dentro del sistema', () => {
    expect(esRutaDeEntrada('/acme')).toBe(false);
    expect(esRutaDeEntrada('/acme/inventario/productos')).toBe(false);
    expect(esRutaDeEntrada('/admin/organizaciones')).toBe(false);
    expect(esRutaDeEntrada('/')).toBe(false);
  });

  it('no cuela una ruta que solo empiece igual', () => {
    // Un tenant con slug 'activar-cosas' no debe forzar el tema claro.
    expect(esRutaDeEntrada('/activar-organizacion/algo')).toBe(false);
    expect(esRutaDeEntrada('/login-falso')).toBe(false);
    expect(esRutaDeEntrada('/activar-cosas')).toBe(false);
  });
});
