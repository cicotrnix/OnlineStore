import { defineStoreConfig } from './modules/config'

/**
 * Store configuration — change identity, modules, payments, UI defaults here.
 * Edit and the storefront updates accordingly.
 */
export default defineStoreConfig({
  identity: {
    name: 'Acme Wholesale',
    logo: '/brand/logo.svg',
    supportEmail: 'support@acme.example',
  },
  locale: {
    default: 'en-US',
    supported: ['en-US', 'es-419'],
  },
  currency: { base: 'USD' },
  modules: {
    rfq: true,
    credit: true,
    privateCatalogs: true,
    approvals: true,
    volumeDiscounts: true,
    semanticSearch: false,
    aiChat: false,
  },
  payments: {
    stripe: { enabled: false },
    mercadopago: { enabled: false },
  },
  ui: {
    defaultView: 'cards',
    allowToggle: true,
  },
})
