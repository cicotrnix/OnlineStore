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
  },
}

export function t(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  let msg = MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? ''
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return msg
}
