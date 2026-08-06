/**
 * Contrato de configuración por entorno. Vive aparte de los archivos de
 * entorno para que `fileReplacements` no pueda desincronizar las formas.
 */
export interface AppEnvironment {
  readonly production: boolean;

  /** Origen del backend, sin slash final. Vacío = mismo origen que el frontend. */
  readonly apiBaseUrl: string;

  readonly enableServiceWorker: boolean;

  /** Cuánto tiempo una query se considera fresca antes de refetchear. */
  readonly queryStaleTimeMs: number;

  /** Cuánto sobrevive una query sin observadores antes de descartarse. */
  readonly queryGcTimeMs: number;
}
