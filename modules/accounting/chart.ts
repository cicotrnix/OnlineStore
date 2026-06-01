/**
 * Plan de cuentas inicial (chart of accounts).
 * Códigos numéricos al estilo US GAAP simplificado: 1xxx Activos, 2xxx Pasivos,
 * 3xxx Patrimonio, 4xxx Ingresos, 5xxx COGS, 6xxx Gastos.
 * Dominio-como-datos: se siembra una vez; editable vía admin.
 */

import type { AccountType, NormalSide } from '@prisma/client'

export interface ChartAccount {
  code: string
  name: string
  type: AccountType
  normalSide: NormalSide
}

export const CHART_OF_ACCOUNTS: ChartAccount[] = [
  // Activos
  { code: '1000', name: 'Caja y bancos', type: 'ASSET', normalSide: 'DEBIT' },
  { code: '1010', name: 'Banco operativo USD', type: 'ASSET', normalSide: 'DEBIT' },
  { code: '1100', name: 'Cuentas por cobrar', type: 'ASSET', normalSide: 'DEBIT' },
  { code: '1200', name: 'Stripe-clearing', type: 'ASSET', normalSide: 'DEBIT' },
  { code: '1300', name: 'Inventario', type: 'ASSET', normalSide: 'DEBIT' },

  // Pasivos
  { code: '2000', name: 'Cuentas por pagar', type: 'LIABILITY', normalSide: 'CREDIT' },

  // Patrimonio
  { code: '3000', name: 'Capital', type: 'EQUITY', normalSide: 'CREDIT' },
  { code: '3100', name: 'Resultados acumulados', type: 'EQUITY', normalSide: 'CREDIT' },

  // Ingresos
  { code: '4000', name: 'Ventas', type: 'REVENUE', normalSide: 'CREDIT' },
  // Contra-ingreso (devoluciones/refunds): naturaleza débito, reduce Revenue neto.
  { code: '4100', name: 'Devoluciones sobre ventas', type: 'REVENUE', normalSide: 'DEBIT' },

  // COGS
  { code: '5000', name: 'Costo de mercaderías vendidas', type: 'COGS', normalSide: 'DEBIT' },

  // Gastos
  { code: '6000', name: 'Comisiones procesador', type: 'EXPENSE', normalSide: 'DEBIT' },
] as const

export const ACCOUNT_CODES = {
  CASH_BANK: '1010',
  ACCOUNTS_RECEIVABLE: '1100',
  STRIPE_CLEARING: '1200',
  INVENTORY: '1300',
  SALES_REVENUE: '4000',
  SALES_RETURNS: '4100',
  COGS: '5000',
} as const
