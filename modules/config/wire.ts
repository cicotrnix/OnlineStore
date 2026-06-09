import type { StoreConfig } from './schemas'

/**
 * Las instrucciones de wire/ACH se muestran en la página de factura
 * sólo si la tienda tiene `payments.wire.enabled` + los dos campos
 * mínimos para que el cliente pueda transferir: beneficiario y número
 * de cuenta. Si falta cualquiera, no se publica nada (evita mostrar
 * datos a medias mientras Herney completa la cuenta KonLLC dba PiPower).
 */
export function wireInstructionsReady(cfg: StoreConfig): boolean {
  const w = cfg.payments.wire
  return !!(w?.enabled && w.beneficiaryName && w.accountNumber)
}
