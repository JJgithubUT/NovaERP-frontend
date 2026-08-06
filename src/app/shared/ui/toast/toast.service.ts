import { Injectable, signal } from '@angular/core';

export type ToastTono = 'exito' | 'error' | 'aviso';

export interface Toast {
  readonly id: number;
  readonly tono: ToastTono;
  readonly mensaje: string;
}

const DURACION_MS = 4000;

/**
 * Avisos efímeros tras una mutación ("Producto creado", "Sin conexión…").
 *
 * Es solo para confirmar algo que el usuario acaba de hacer. Un error que
 * requiere corregir un campo **no va aquí**: va pegado al campo, donde se
 * arregla. Si el aviso se puede perder sin consecuencia, es un toast.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<readonly Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private siguienteId = 0;
  private readonly temporizadores = new Map<number, ReturnType<typeof setTimeout>>();

  exito(mensaje: string): void {
    this.mostrar('exito', mensaje);
  }

  error(mensaje: string): void {
    this.mostrar('error', mensaje);
  }

  aviso(mensaje: string): void {
    this.mostrar('aviso', mensaje);
  }

  descartar(id: number): void {
    clearTimeout(this.temporizadores.get(id));
    this.temporizadores.delete(id);
    this._toasts.update((lista) => lista.filter((toast) => toast.id !== id));
  }

  private mostrar(tono: ToastTono, mensaje: string): void {
    const id = this.siguienteId++;
    this._toasts.update((lista) => [...lista, { id, tono, mensaje }]);
    this.temporizadores.set(
      id,
      setTimeout(() => this.descartar(id), DURACION_MS),
    );
  }
}
