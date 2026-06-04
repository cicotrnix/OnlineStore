export const LOCALES = ['en-US', 'es-419'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en-US'

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value === 'en-US' || value === 'es-419'
}

type MessageKey =
  | 'localeSwitch.label'
  | 'localeSwitch.en'
  | 'localeSwitch.es'
  | 'product.signInForPrice'
  | 'product.outOfStock'
  // Landing
  | 'landing.metaDescription'
  | 'landing.tagline'
  | 'landing.intro'
  | 'landing.cta.register'
  | 'landing.cta.exploreCatalog'
  | 'landing.cta.signInExisting'
  | 'landing.nav.catalog'
  | 'landing.nav.myAccount'
  | 'landing.nav.signIn'
  | 'landing.nav.register'
  | 'landing.howItWorks.title'
  | 'landing.howItWorks.step1.title'
  | 'landing.howItWorks.step1.body'
  | 'landing.howItWorks.step2.title'
  | 'landing.howItWorks.step2.body'
  | 'landing.howItWorks.step3.title'
  | 'landing.howItWorks.step3.body'
  | 'landing.footer.signOut'
  // Auth
  | 'auth.signIn.title'
  | 'auth.signIn.subtitle'
  | 'auth.signIn.emailPlaceholder'
  | 'auth.signIn.submit'
  | 'auth.signIn.checkInbox.title'
  | 'auth.signIn.checkInbox.body'
  // Select org
  | 'selectOrg.title'
  | 'selectOrg.subtitle'
  | 'selectOrg.select'
  | 'selectOrg.empty.title'
  | 'selectOrg.empty.body'
  // Onboarding form
  | 'onboarding.title'
  | 'onboarding.intro'
  | 'onboarding.section.business'
  | 'onboarding.business.name'
  | 'onboarding.business.namePlaceholder'
  | 'onboarding.business.country'
  | 'onboarding.business.addressLine1'
  | 'onboarding.business.addressLine2'
  | 'onboarding.business.city'
  | 'onboarding.business.state'
  | 'onboarding.business.postalCode'
  | 'onboarding.section.cert'
  | 'onboarding.cert.subtitle'
  | 'onboarding.cert.type'
  | 'onboarding.cert.type.us'
  | 'onboarding.cert.type.foreign'
  | 'onboarding.cert.jurisdiction'
  | 'onboarding.cert.jurisdictionPlaceholder'
  | 'onboarding.cert.number'
  | 'onboarding.cert.file'
  | 'onboarding.cert.fileHint'
  | 'onboarding.submit'
  // Onboarding pending
  | 'onboarding.pending.cardTitle'
  | 'onboarding.pending.body'
  | 'onboarding.pending.submittedOn'
  | 'onboarding.pending.exploreLink'
  // Onboarding rejected
  | 'onboarding.rejected.intro'
  | 'onboarding.rejected.resubmitNote'
  | 'onboarding.rejected.submit'
  // Storefront nav
  | 'storefront.nav.catalog'
  | 'storefront.nav.quotes'
  | 'storefront.nav.cart'
  | 'storefront.nav.orders'
  | 'storefront.nav.invoices'
  | 'storefront.nav.approvals'
  | 'storefront.nav.signIn'
  // Catalog
  | 'catalog.title'
  | 'catalog.countOne'
  | 'catalog.countMany'
  | 'catalog.allCategories'
  | 'catalog.empty'
  | 'catalog.tableHead.sku'
  | 'catalog.tableHead.product'
  | 'catalog.tableHead.category'
  | 'catalog.tableHead.stock'
  | 'catalog.tableHead.price'
  | 'catalog.tableHead.action'
  | 'catalog.disabled.impersonating'
  | 'catalog.disabled.anon'
  | 'catalog.disabled.noOrg'
  | 'catalog.disabled.pending'
  | 'catalog.disabled.rejected'
  | 'catalog.signInLinkShort'
  // PDP
  | 'pdp.signInForPriceLong'
  | 'pdp.viewLabel.sku'
  | 'pdp.relatedTitle.recommended'
  | 'pdp.relatedTitle.related'
  | 'pdp.disabled.impersonating'
  | 'pdp.disabled.outOfStock'
  | 'pdp.noImage'
  | 'pdp.privateBadge'
  // Cart
  | 'cart.title'
  | 'cart.empty.title'
  | 'cart.empty.body'
  | 'cart.empty.goCatalog'
  | 'cart.subtotal'
  | 'cart.unitPrice'
  | 'cart.quantity'
  | 'cart.update'
  | 'cart.remove'
  | 'cart.checkout'
  | 'cart.summary'
  | 'cart.taxNote'
  | 'cart.proceedCheckout'
  | 'cart.continueShopping'
  | 'cart.noLongerAvailable'
  | 'cart.skuLabel'
  | 'cart.noImage'
  // Checkout
  | 'checkout.title'
  | 'checkout.subtitle'
  | 'checkout.section.review'
  | 'checkout.section.addresses'
  | 'checkout.billing'
  | 'checkout.shipping'
  | 'checkout.poNumber'
  | 'checkout.notes'
  | 'checkout.placeOrder'
  | 'checkout.subtitle2'
  | 'checkout.step1'
  | 'checkout.step2'
  | 'checkout.step3'
  | 'checkout.step4'
  | 'checkout.skuLabel'
  | 'checkout.qtyLabel'
  | 'checkout.issue.inactive'
  | 'checkout.issue.stock'
  | 'checkout.issue.priceChanged'
  | 'checkout.noAddresses'
  | 'checkout.poPlaceholder'
  | 'checkout.notesPlaceholder'
  | 'checkout.blockingIssue'
  | 'checkout.total'
  // Orders list
  | 'orders.title'
  | 'orders.empty'
  | 'orders.selectOrg'
  // Order detail
  | 'orderDetail.placedOn'
  | 'orderDetail.linesHeading'
  | 'orderDetail.addressesHeading'
  | 'orderDetail.billing'
  | 'orderDetail.shipping'
  | 'orderDetail.poNumber'
  | 'orderDetail.notes'
  | 'orderDetail.subtotal'
  | 'orderDetail.total'
  | 'orderDetail.payWithCardCardTitle'
  | 'orderDetail.payWithCardCardBody'
  | 'orderDetail.payWithCardButton'
  | 'orderDetail.payment.pendingTitle'
  | 'orderDetail.payment.confirmedTitle'
  | 'orderDetail.payment.processingBody'
  | 'orderDetail.payment.confirmedBody'
  | 'orderDetail.payment.backLink'
  // Quotes, Invoices, Approvals, Notifications
  | 'quotes.title'
  | 'quotes.empty'
  | 'invoices.title'
  | 'invoices.empty'
  | 'approvals.title'
  | 'approvals.empty'
  | 'notifications.title'
  | 'notifications.empty'
  | 'notifications.markAllRead'
  // Admin nav
  | 'admin.label'
  | 'admin.platformAdmin'
  | 'admin.nav.dashboard'
  | 'admin.nav.products'
  | 'admin.nav.categories'
  | 'admin.nav.orders'
  | 'admin.nav.quotes'
  | 'admin.nav.invoices'
  | 'admin.nav.approvals'
  | 'admin.nav.customers'
  | 'admin.nav.search'
  | 'admin.nav.settings'
  // Common
  | 'common.pending'
  | 'common.toast.error.unexpected'
  // Auth toasts
  | 'auth.toast.linkSent'
  | 'auth.toast.linkFailed'
  | 'auth.signIn.sending'
  // Onboarding toasts
  | 'onboarding.toast.submitted'
  | 'onboarding.toast.resubmitted'
  | 'onboarding.toast.fileMissing'
  | 'onboarding.toast.alreadyHasOrg'
  | 'onboarding.toast.invalidCountry'
  | 'onboarding.sending'
  // Admin verification
  | 'admin.toast.approved'
  | 'admin.toast.approvedNoop'
  | 'admin.toast.rejected'
  | 'admin.toast.rejectedNoop'
  | 'admin.toast.reasonRequired'
  | 'admin.confirm.approve'
  | 'admin.confirm.reject'
  | 'admin.action.approve'
  | 'admin.action.reject'
  | 'admin.action.rejectReasonLabel'
  | 'admin.action.rejectReasonPlaceholder'
  | 'admin.action.approving'
  | 'admin.action.rejecting'
  // Admin reconcile wire
  | 'admin.toast.wireReconciled'
  | 'admin.toast.wireFailed'
  // Admin upload cert
  | 'admin.toast.certUploaded'
  | 'admin.toast.certFailed'
  // Cart toasts
  | 'cart.toast.added'
  | 'cart.toast.updated'
  | 'cart.toast.removed'
  | 'cart.toast.failed'
  | 'cart.confirm.remove'
  // Product CTAs
  | 'product.add'
  | 'product.unavailable'
  | 'product.adding'
  // Checkout
  | 'checkout.toast.orderPlaced'
  | 'checkout.toast.failed'
  | 'checkout.placing'

type Dict = Record<MessageKey, string>

export const MESSAGES: Record<Locale, Dict> = {
  'en-US': {
    'localeSwitch.label': 'Language',
    'localeSwitch.en': 'English',
    'localeSwitch.es': 'Español',
    'product.signInForPrice': 'Sign in to see prices',
    'product.outOfStock': 'Out of stock',
    // Landing
    'landing.metaDescription':
      'iPhone replacement batteries, wholesale across USA + Latin America. Register your business to see pricing.',
    'landing.tagline': 'Wholesale iPhone batteries · USA + LATAM',
    'landing.intro':
      'Wholesale catalog of iPhone replacement batteries. Pricing and purchases available to verified businesses.',
    'landing.cta.register': 'Register your business',
    'landing.cta.exploreCatalog': 'Explore catalog',
    'landing.cta.signInExisting': 'Already a customer? Sign in',
    'landing.nav.catalog': 'Catalog',
    'landing.nav.myAccount': 'My account',
    'landing.nav.signIn': 'Sign in',
    'landing.nav.register': 'Register',
    'landing.howItWorks.title': 'How it works',
    'landing.howItWorks.step1.title': 'Register your business',
    'landing.howItWorks.step1.body':
      'Basic info + resale certificate (or equivalent). One form, one upload.',
    'landing.howItWorks.step2.title': 'We approve you',
    'landing.howItWorks.step2.body':
      'We review the certificate manually. Once approved, you see wholesale pricing.',
    'landing.howItWorks.step3.title': 'Buy',
    'landing.howItWorks.step3.body':
      'Full catalog, per-customer pricing, wire or card. FedEx Ground shipping.',
    'landing.footer.signOut': 'Sign out',
    // Auth
    'auth.signIn.title': 'Sign in to {brand}',
    'auth.signIn.subtitle': 'Enter your email and we will send you a magic link.',
    'auth.signIn.emailPlaceholder': 'you@company.com',
    'auth.signIn.submit': 'Send magic link',
    'auth.signIn.checkInbox.title': 'Check your email',
    'auth.signIn.checkInbox.body': 'We sent a magic link to your inbox. Click it to sign in.',
    // Select org
    'selectOrg.title': 'Choose your organization',
    'selectOrg.subtitle': 'Switching organizations later will empty your cart.',
    'selectOrg.select': 'Select',
    'selectOrg.empty.title': 'No organizations',
    'selectOrg.empty.body': 'You do not belong to any organization. Ask an admin to invite you.',
    // Onboarding form
    'onboarding.title': 'Register your business',
    'onboarding.intro':
      'To access wholesale pricing and place orders, we need your basic business info and resale certificate (or foreign equivalent). We review it manually and email you once approved.',
    'onboarding.section.business': 'Business info',
    'onboarding.business.name': 'Legal name',
    'onboarding.business.namePlaceholder': 'Acme Repair Shop',
    'onboarding.business.country': 'Country (ISO-2)',
    'onboarding.business.addressLine1': 'Address (street + number)',
    'onboarding.business.addressLine2': 'Address (line 2, optional)',
    'onboarding.business.city': 'City',
    'onboarding.business.state': 'State / province (optional)',
    'onboarding.business.postalCode': 'Postal code',
    'onboarding.section.cert': 'Resale certificate',
    'onboarding.cert.subtitle':
      'US Resale Certificate or foreign-country equivalent. PDF or image, ≤ 10 MB.',
    'onboarding.cert.type': 'Type',
    'onboarding.cert.type.us': 'US Resale Certificate',
    'onboarding.cert.type.foreign': 'Foreign equivalent',
    'onboarding.cert.jurisdiction': 'Jurisdiction',
    'onboarding.cert.jurisdictionPlaceholder': 'TX, FL, …',
    'onboarding.cert.number': 'Certificate number',
    'onboarding.cert.file': 'File',
    'onboarding.cert.fileHint': 'PDF or image, ≤ 10 MB',
    'onboarding.submit': 'Submit for review',
    // Onboarding pending
    'onboarding.pending.cardTitle': 'Your business',
    'onboarding.pending.body':
      'Your account is under review. We will email you when it is approved. This usually takes 1 business day.',
    'onboarding.pending.submittedOn': 'Submitted on {date}.',
    'onboarding.pending.exploreLink': 'In the meantime, explore the catalog →',
    // Onboarding rejected
    'onboarding.rejected.intro': 'Your application was rejected with the following reason:',
    'onboarding.rejected.resubmitNote':
      'You can submit the updated certificate. The account will go back to PENDING for review.',
    'onboarding.rejected.submit': 'Resubmit for review',
    // Storefront nav
    'storefront.nav.catalog': 'Catalog',
    'storefront.nav.quotes': 'Quotes',
    'storefront.nav.cart': 'Cart',
    'storefront.nav.orders': 'Orders',
    'storefront.nav.invoices': 'Invoices',
    'storefront.nav.approvals': 'Approvals',
    'storefront.nav.signIn': 'Sign in',
    // Catalog
    'catalog.title': 'Catalog',
    'catalog.countOne': '1 product',
    'catalog.countMany': '{count} products',
    'catalog.allCategories': 'All',
    'catalog.empty': 'No products available.',
    'catalog.tableHead.sku': 'SKU',
    'catalog.tableHead.product': 'Product',
    'catalog.tableHead.category': 'Category',
    'catalog.tableHead.stock': 'Stock',
    'catalog.tableHead.price': 'Price',
    'catalog.tableHead.action': 'Action',
    'catalog.disabled.impersonating': "You can't place orders while impersonating",
    'catalog.disabled.anon': 'Sign in to see prices and buy',
    'catalog.disabled.noOrg': 'Complete your business registration',
    'catalog.disabled.pending': 'Your account is under review',
    'catalog.disabled.rejected': 'Your account was rejected — see the reason',
    'catalog.signInLinkShort': 'Sign in',
    // PDP
    'pdp.signInForPriceLong': 'Sign in or register your business to see wholesale pricing →',
    'pdp.viewLabel.sku': 'SKU',
    'pdp.relatedTitle.recommended': 'Recommended for you',
    'pdp.relatedTitle.related': 'Related products',
    'pdp.disabled.impersonating': "You can't place orders while impersonating",
    'pdp.disabled.outOfStock': 'Out of stock',
    'pdp.noImage': 'No image',
    'pdp.privateBadge': 'Private product for your organization',
    // Cart
    'cart.title': 'Cart',
    'cart.empty.title': 'Your cart is empty',
    'cart.empty.body': 'Browse the catalog and add products.',
    'cart.empty.goCatalog': 'Go to catalog',
    'cart.subtotal': 'Subtotal',
    'cart.unitPrice': 'Unit price',
    'cart.quantity': 'Qty',
    'cart.update': 'Update',
    'cart.remove': 'Remove',
    'cart.checkout': 'Checkout',
    'cart.summary': 'Summary',
    'cart.taxNote': 'Taxes and shipping calculated at checkout.',
    'cart.proceedCheckout': 'Proceed to checkout · {amount}',
    'cart.continueShopping': 'Continue shopping',
    'cart.noLongerAvailable': 'No longer available',
    'cart.skuLabel': 'SKU',
    'cart.noImage': 'No image',
    // Checkout
    'checkout.title': 'Checkout',
    'checkout.subtitle': 'Review and confirm your order.',
    'checkout.section.review': 'Review',
    'checkout.section.addresses': 'Addresses',
    'checkout.billing': 'Billing',
    'checkout.shipping': 'Shipping',
    'checkout.poNumber': 'PO number (optional)',
    'checkout.notes': 'Notes (optional)',
    'checkout.placeOrder': 'Place order',
    'checkout.subtitle2': 'Review your order and confirm addresses to place it.',
    'checkout.step1': '1. Review items',
    'checkout.step2': '2. Addresses',
    'checkout.step3': '3. PO + notes',
    'checkout.step4': '4. Confirm',
    'checkout.skuLabel': 'SKU',
    'checkout.qtyLabel': 'qty',
    'checkout.issue.inactive': 'Inactive',
    'checkout.issue.stock': 'Stock {n}',
    'checkout.issue.priceChanged': 'Price changed to {price}',
    'checkout.noAddresses': 'No addresses on file. Add one in the admin panel first.',
    'checkout.poPlaceholder': 'PO-2026-001',
    'checkout.notesPlaceholder': 'Special instructions, delivery windows, etc.',
    'checkout.blockingIssue':
      "You can't place the order until the flagged issues are resolved. Go back to cart.",
    'checkout.total': 'Total',
    // Orders
    'orders.title': 'Orders',
    'orders.empty': 'No orders yet.',
    'orders.selectOrg': 'Select an organization first.',
    // Order detail
    'orderDetail.placedOn': 'Placed by {user} · {date}',
    'orderDetail.linesHeading': 'Lines',
    'orderDetail.addressesHeading': 'Addresses',
    'orderDetail.billing': 'Billing',
    'orderDetail.shipping': 'Shipping',
    'orderDetail.poNumber': 'PO',
    'orderDetail.notes': 'Notes',
    'orderDetail.subtotal': 'Subtotal',
    'orderDetail.total': 'Total',
    'orderDetail.payWithCardCardTitle': 'Pay with card',
    'orderDetail.payWithCardCardBody':
      'We redirect you to Stripe Checkout (hosted). Payment is confirmed via signed webhook — never from the return URL.',
    'orderDetail.payWithCardButton': 'Pay {amount}',
    'orderDetail.payment.pendingTitle': 'Processing payment',
    'orderDetail.payment.confirmedTitle': 'Thanks! Payment confirmed',
    'orderDetail.payment.processingBody':
      'We received your payment at Stripe. We are waiting for the signed confirmation from the processor (usually seconds).',
    'orderDetail.payment.confirmedBody':
      'We received the confirmation. You will get an email with the receipt and next steps. Shipment tracking will appear here soon.',
    'orderDetail.payment.backLink': 'Back to order details',
    // Quotes, invoices, approvals, notifications
    'quotes.title': 'Quotes',
    'quotes.empty': 'No quotes yet.',
    'invoices.title': 'Invoices',
    'invoices.empty': 'No invoices yet.',
    'approvals.title': 'Approvals',
    'approvals.empty': 'No approvals pending.',
    'notifications.title': 'Notifications',
    'notifications.empty': 'No notifications.',
    'notifications.markAllRead': 'Mark all as read',
    // Admin nav
    'admin.label': 'Admin',
    'admin.platformAdmin': 'Platform admin',
    'admin.nav.dashboard': 'Dashboard',
    'admin.nav.products': 'Products',
    'admin.nav.categories': 'Categories',
    'admin.nav.orders': 'Orders',
    'admin.nav.quotes': 'Quotes',
    'admin.nav.invoices': 'Invoices',
    'admin.nav.approvals': 'Approvals',
    'admin.nav.customers': 'Customers',
    'admin.nav.search': 'Search',
    'admin.nav.settings': 'Settings',
    // Common
    'common.pending': 'Working…',
    'common.toast.error.unexpected': 'Something went wrong. Please try again.',
    // Auth
    'auth.toast.linkSent': 'Magic link sent. Check your inbox.',
    'auth.toast.linkFailed': "We couldn't send the magic link. Try again.",
    'auth.signIn.sending': 'Sending…',
    // Onboarding
    'onboarding.toast.submitted': 'Application submitted. We will email you once reviewed.',
    'onboarding.toast.resubmitted': 'Certificate resubmitted. Back to pending review.',
    'onboarding.toast.fileMissing': 'The certificate file is required.',
    'onboarding.toast.alreadyHasOrg': 'You already belong to an organization.',
    'onboarding.toast.invalidCountry': 'Country must be a 2-letter ISO code.',
    'onboarding.sending': 'Submitting…',
    // Admin verification
    'admin.toast.approved': 'Customer approved ✓',
    'admin.toast.approvedNoop': 'Customer was already approved (no changes).',
    'admin.toast.rejected': 'Customer rejected.',
    'admin.toast.rejectedNoop': 'Customer was already rejected with that reason (no changes).',
    'admin.toast.reasonRequired': 'A rejection reason is required.',
    'admin.confirm.approve': 'Approve {name}? This lets them see prices and place orders.',
    'admin.confirm.reject': 'Reject {name}?',
    'admin.action.approve': 'Approve',
    'admin.action.reject': 'Reject',
    'admin.action.rejectReasonLabel': 'Rejection reason',
    'admin.action.rejectReasonPlaceholder': 'Expired certificate / illegible / etc.',
    'admin.action.approving': 'Approving…',
    'admin.action.rejecting': 'Rejecting…',
    'admin.toast.wireReconciled': 'Wire reconciled ✓',
    'admin.toast.wireFailed': 'Wire reconciliation failed.',
    'admin.toast.certUploaded': 'Certificate uploaded and customer approved ✓',
    'admin.toast.certFailed': 'Certificate upload failed.',
    // Cart
    'cart.toast.added': 'Added to cart ✓',
    'cart.toast.updated': 'Cart updated.',
    'cart.toast.removed': 'Item removed.',
    'cart.toast.failed': 'Could not update the cart.',
    'cart.confirm.remove': 'Remove this item from the cart?',
    // Product CTAs
    'product.add': 'Add',
    'product.unavailable': 'Unavailable',
    'product.adding': 'Adding…',
    // Checkout
    'checkout.toast.orderPlaced': 'Order placed ✓',
    'checkout.toast.failed': 'We could not place the order.',
    'checkout.placing': 'Placing order…',
  },
  'es-419': {
    'localeSwitch.label': 'Idioma',
    'localeSwitch.en': 'English',
    'localeSwitch.es': 'Español',
    'product.signInForPrice': 'Iniciá sesión para ver precios',
    'product.outOfStock': 'Sin stock',
    // Landing
    'landing.metaDescription':
      'Baterías de reemplazo para iPhone, mayoristas en USA + Latinoamérica. Registrá tu negocio para ver precios.',
    'landing.tagline': 'Baterías mayoristas para iPhone · USA + LATAM',
    'landing.intro':
      'Catálogo mayorista de baterías de reemplazo para iPhone. Precios y compras disponibles para negocios verificados.',
    'landing.cta.register': 'Registrá tu negocio',
    'landing.cta.exploreCatalog': 'Explorar catálogo',
    'landing.cta.signInExisting': '¿Ya tenés cuenta? Entrar',
    'landing.nav.catalog': 'Catálogo',
    'landing.nav.myAccount': 'Mi cuenta',
    'landing.nav.signIn': 'Iniciar sesión',
    'landing.nav.register': 'Registrarse',
    'landing.howItWorks.title': 'Cómo funciona',
    'landing.howItWorks.step1.title': 'Registrá tu negocio',
    'landing.howItWorks.step1.body':
      'Datos básicos + certificado de reventa (o equivalente). Un solo formulario.',
    'landing.howItWorks.step2.title': 'Te aprobamos',
    'landing.howItWorks.step2.body':
      'Revisamos el certificado manualmente. Una vez aprobado, ves precios mayoristas.',
    'landing.howItWorks.step3.title': 'Comprá',
    'landing.howItWorks.step3.body':
      'Catálogo completo, precios por cliente, wire o tarjeta. Envío FedEx Ground.',
    'landing.footer.signOut': 'Salir',
    // Auth
    'auth.signIn.title': 'Iniciá sesión en {brand}',
    'auth.signIn.subtitle': 'Ingresá tu email y te enviamos un link mágico.',
    'auth.signIn.emailPlaceholder': 'vos@empresa.com',
    'auth.signIn.submit': 'Enviar link mágico',
    'auth.signIn.checkInbox.title': 'Revisá tu email',
    'auth.signIn.checkInbox.body':
      'Te enviamos un link mágico a tu bandeja. Hacé clic para entrar.',
    // Select org
    'selectOrg.title': 'Elegí tu organización',
    'selectOrg.subtitle': 'Cambiar de organización en el futuro vaciará tu carrito.',
    'selectOrg.select': 'Seleccionar',
    'selectOrg.empty.title': 'Sin organizaciones',
    'selectOrg.empty.body':
      'No pertenecés a ninguna organización. Pedile a un admin que te invite.',
    // Onboarding form
    'onboarding.title': 'Registrá tu negocio',
    'onboarding.intro':
      'Para acceder a precios mayoristas y comprar, necesitamos los datos básicos de tu negocio y el certificado de reventa (o equivalente extranjero). Lo revisamos manualmente y te avisamos por email en cuanto esté aprobado.',
    'onboarding.section.business': 'Datos del negocio',
    'onboarding.business.name': 'Razón social',
    'onboarding.business.namePlaceholder': 'Acme Repair Shop',
    'onboarding.business.country': 'País (ISO-2)',
    'onboarding.business.addressLine1': 'Dirección (calle y número)',
    'onboarding.business.addressLine2': 'Dirección (línea 2, opcional)',
    'onboarding.business.city': 'Ciudad',
    'onboarding.business.state': 'Estado / provincia (opcional)',
    'onboarding.business.postalCode': 'Código postal',
    'onboarding.section.cert': 'Certificado de reventa',
    'onboarding.cert.subtitle':
      'Resale Certificate (USA) o documento equivalente del país. PDF o imagen, ≤ 10 MB.',
    'onboarding.cert.type': 'Tipo',
    'onboarding.cert.type.us': 'US Resale Certificate',
    'onboarding.cert.type.foreign': 'Equivalente extranjero',
    'onboarding.cert.jurisdiction': 'Jurisdicción',
    'onboarding.cert.jurisdictionPlaceholder': 'TX, FL, …',
    'onboarding.cert.number': 'Número del certificado',
    'onboarding.cert.file': 'Archivo',
    'onboarding.cert.fileHint': 'PDF o imagen, ≤ 10 MB',
    'onboarding.submit': 'Enviar para revisión',
    // Onboarding pending
    'onboarding.pending.cardTitle': 'Tu negocio',
    'onboarding.pending.body':
      'Tu cuenta está en revisión. Te enviamos un email cuando esté aprobada. Esto suele tardar 1 día hábil.',
    'onboarding.pending.submittedOn': 'Enviada el {date}.',
    'onboarding.pending.exploreLink': 'Mientras tanto, explorá el catálogo →',
    // Onboarding rejected
    'onboarding.rejected.intro': 'Tu solicitud fue rechazada con el siguiente motivo:',
    'onboarding.rejected.resubmitNote':
      'Podés volver a enviar el certificado actualizado. La cuenta volverá a estado PENDING hasta nueva revisión.',
    'onboarding.rejected.submit': 'Re-enviar para revisión',
    // Storefront nav
    'storefront.nav.catalog': 'Catálogo',
    'storefront.nav.quotes': 'Cotizaciones',
    'storefront.nav.cart': 'Carrito',
    'storefront.nav.orders': 'Órdenes',
    'storefront.nav.invoices': 'Facturas',
    'storefront.nav.approvals': 'Aprobaciones',
    'storefront.nav.signIn': 'Entrar',
    // Catalog
    'catalog.title': 'Catálogo',
    'catalog.countOne': '1 producto',
    'catalog.countMany': '{count} productos',
    'catalog.allCategories': 'Todos',
    'catalog.empty': 'No hay productos disponibles.',
    'catalog.tableHead.sku': 'SKU',
    'catalog.tableHead.product': 'Producto',
    'catalog.tableHead.category': 'Categoría',
    'catalog.tableHead.stock': 'Stock',
    'catalog.tableHead.price': 'Precio',
    'catalog.tableHead.action': 'Acción',
    'catalog.disabled.impersonating': 'No puedes colocar órdenes mientras impersonas',
    'catalog.disabled.anon': 'Iniciá sesión para ver precios y comprar',
    'catalog.disabled.noOrg': 'Completá el registro de tu negocio',
    'catalog.disabled.pending': 'Tu cuenta está en revisión',
    'catalog.disabled.rejected': 'Tu cuenta fue rechazada — revisá el motivo',
    'catalog.signInLinkShort': 'Iniciá sesión',
    // PDP
    'pdp.signInForPriceLong': 'Iniciá sesión o registrá tu negocio para ver precios mayoristas →',
    'pdp.viewLabel.sku': 'SKU',
    'pdp.relatedTitle.recommended': 'Recomendado para ti',
    'pdp.relatedTitle.related': 'Productos relacionados',
    'pdp.disabled.impersonating': 'No puedes colocar órdenes mientras impersonas',
    'pdp.disabled.outOfStock': 'Sin stock',
    'pdp.noImage': 'Sin imagen',
    'pdp.privateBadge': 'Producto privado para tu organización',
    // Cart
    'cart.title': 'Carrito',
    'cart.empty.title': 'Tu carrito está vacío',
    'cart.empty.body': 'Explora el catálogo y agrega productos.',
    'cart.empty.goCatalog': 'Ir al catálogo',
    'cart.subtotal': 'Subtotal',
    'cart.unitPrice': 'Precio unitario',
    'cart.quantity': 'Cant.',
    'cart.update': 'Actualizar',
    'cart.remove': 'Quitar',
    'cart.checkout': 'Ir al checkout',
    'cart.summary': 'Resumen',
    'cart.taxNote': 'Impuestos y envío se calcularán en el checkout.',
    'cart.proceedCheckout': 'Proceder al checkout · {amount}',
    'cart.continueShopping': 'Continuar comprando',
    'cart.noLongerAvailable': 'Ya no disponible',
    'cart.skuLabel': 'SKU',
    'cart.noImage': 'Sin imagen',
    // Checkout
    'checkout.title': 'Checkout',
    'checkout.subtitle': 'Revisá y confirmá tu pedido.',
    'checkout.section.review': 'Revisión',
    'checkout.section.addresses': 'Direcciones',
    'checkout.billing': 'Facturación',
    'checkout.shipping': 'Envío',
    'checkout.poNumber': 'Número de PO (opcional)',
    'checkout.notes': 'Notas (opcional)',
    'checkout.placeOrder': 'Colocar pedido',
    'checkout.subtitle2': 'Revisa tu pedido y confirma las direcciones para colocar la orden.',
    'checkout.step1': '1. Revisar items',
    'checkout.step2': '2. Direcciones',
    'checkout.step3': '3. PO y notas',
    'checkout.step4': '4. Confirmar',
    'checkout.skuLabel': 'SKU',
    'checkout.qtyLabel': 'cant',
    'checkout.issue.inactive': 'Inactivo',
    'checkout.issue.stock': 'Stock {n}',
    'checkout.issue.priceChanged': 'Precio cambió a {price}',
    'checkout.noAddresses': 'No hay direcciones registradas. Agregá una en el panel admin primero.',
    'checkout.poPlaceholder': 'PO-2026-001',
    'checkout.notesPlaceholder': 'Instrucciones especiales, ventanas de entrega, etc.',
    'checkout.blockingIssue':
      'No puedes colocar la orden hasta resolver los issues marcados arriba. Volvé al carrito para ajustar.',
    'checkout.total': 'Total',
    // Orders
    'orders.title': 'Órdenes',
    'orders.empty': 'Aún no hay órdenes.',
    'orders.selectOrg': 'Selecciona una organización primero.',
    // Order detail
    'orderDetail.placedOn': 'Colocada por {user} · {date}',
    'orderDetail.linesHeading': 'Líneas',
    'orderDetail.addressesHeading': 'Direcciones',
    'orderDetail.billing': 'Facturación',
    'orderDetail.shipping': 'Envío',
    'orderDetail.poNumber': 'PO',
    'orderDetail.notes': 'Notas',
    'orderDetail.subtotal': 'Subtotal',
    'orderDetail.total': 'Total',
    'orderDetail.payWithCardCardTitle': 'Pagar con tarjeta',
    'orderDetail.payWithCardCardBody':
      'Te redirigimos a Stripe Checkout (hosted). El pago se confirma vía webhook firmado — nunca desde la URL de retorno.',
    'orderDetail.payWithCardButton': 'Pagar {amount}',
    'orderDetail.payment.pendingTitle': 'Procesando pago',
    'orderDetail.payment.confirmedTitle': '¡Gracias! Pago confirmado',
    'orderDetail.payment.processingBody':
      'Recibimos tu pago en Stripe. Estamos esperando la confirmación firmada del procesador para acreditarlo (suele tardar segundos).',
    'orderDetail.payment.confirmedBody':
      'Recibimos la confirmación del procesador. Te enviamos un email con el recibo y los próximos pasos. Pronto verás el tracking del envío acá.',
    'orderDetail.payment.backLink': 'Volver al detalle de la orden',
    // Quotes, invoices, approvals, notifications
    'quotes.title': 'Cotizaciones',
    'quotes.empty': 'Aún no hay cotizaciones.',
    'invoices.title': 'Facturas',
    'invoices.empty': 'Aún no hay facturas.',
    'approvals.title': 'Aprobaciones',
    'approvals.empty': 'No hay aprobaciones pendientes.',
    'notifications.title': 'Notificaciones',
    'notifications.empty': 'No hay notificaciones.',
    'notifications.markAllRead': 'Marcar todo como leído',
    // Admin nav
    'admin.label': 'Admin',
    'admin.platformAdmin': 'Platform admin',
    'admin.nav.dashboard': 'Dashboard',
    'admin.nav.products': 'Productos',
    'admin.nav.categories': 'Categorías',
    'admin.nav.orders': 'Órdenes',
    'admin.nav.quotes': 'Cotizaciones',
    'admin.nav.invoices': 'Facturas',
    'admin.nav.approvals': 'Aprobaciones',
    'admin.nav.customers': 'Clientes',
    'admin.nav.search': 'Búsqueda',
    'admin.nav.settings': 'Settings',
    // Common
    'common.pending': 'Procesando…',
    'common.toast.error.unexpected': 'Algo salió mal. Volvé a intentar.',
    // Auth
    'auth.toast.linkSent': 'Te enviamos el link mágico. Revisá tu bandeja.',
    'auth.toast.linkFailed': 'No pudimos enviar el link. Volvé a intentar.',
    'auth.signIn.sending': 'Enviando…',
    // Onboarding
    'onboarding.toast.submitted':
      'Solicitud enviada. Te avisamos por email en cuanto la revisemos.',
    'onboarding.toast.resubmitted': 'Certificado re-enviado. Volvió a estado pendiente.',
    'onboarding.toast.fileMissing': 'El archivo del certificado es obligatorio.',
    'onboarding.toast.alreadyHasOrg': 'Ya pertenecés a una organización.',
    'onboarding.toast.invalidCountry': 'El país debe ser código ISO-2 (2 letras).',
    'onboarding.sending': 'Enviando…',
    // Admin verification
    'admin.toast.approved': 'Cliente aprobado ✓',
    'admin.toast.approvedNoop': 'El cliente ya estaba aprobado (sin cambios).',
    'admin.toast.rejected': 'Cliente rechazado.',
    'admin.toast.rejectedNoop': 'El cliente ya estaba rechazado con ese motivo (sin cambios).',
    'admin.toast.reasonRequired': 'El motivo de rechazo es obligatorio.',
    'admin.confirm.approve': '¿Aprobar a {name}? Esto les habilita ver precios y comprar.',
    'admin.confirm.reject': '¿Rechazar a {name}?',
    'admin.action.approve': 'Aprobar',
    'admin.action.reject': 'Rechazar',
    'admin.action.rejectReasonLabel': 'Motivo de rechazo',
    'admin.action.rejectReasonPlaceholder': 'Certificado vencido / ilegible / etc.',
    'admin.action.approving': 'Aprobando…',
    'admin.action.rejecting': 'Rechazando…',
    'admin.toast.wireReconciled': 'Wire conciliado ✓',
    'admin.toast.wireFailed': 'Falló la conciliación del wire.',
    'admin.toast.certUploaded': 'Certificado subido y cliente aprobado ✓',
    'admin.toast.certFailed': 'Falló la subida del certificado.',
    // Cart
    'cart.toast.added': 'Agregado al carrito ✓',
    'cart.toast.updated': 'Carrito actualizado.',
    'cart.toast.removed': 'Item eliminado.',
    'cart.toast.failed': 'No pudimos actualizar el carrito.',
    'cart.confirm.remove': '¿Quitar este item del carrito?',
    // Product CTAs
    'product.add': 'Agregar',
    'product.unavailable': 'No disponible',
    'product.adding': 'Agregando…',
    // Checkout
    'checkout.toast.orderPlaced': 'Orden colocada ✓',
    'checkout.toast.failed': 'No pudimos colocar la orden.',
    'checkout.placing': 'Colocando orden…',
  },
}

export function t(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  let msg = MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? ''
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return msg
}
