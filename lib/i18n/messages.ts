export const LOCALES = ['en-US', 'es-419'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en-US'

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value === 'en-US' || value === 'es-419'
}

export type MessageKey =
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
  | 'landing.hero.eyebrow'
  | 'landing.hero.headlineMain'
  | 'landing.hero.headlineAccent'
  | 'landing.hero.headlineTail'
  | 'landing.hero.lead'
  | 'landing.hero.gaugeLabel'
  | 'landing.hero.chip1Label'
  | 'landing.hero.chip2Label'
  | 'landing.stats.cycles.label'
  | 'landing.stats.health.label'
  | 'landing.stats.capacity.label'
  | 'landing.stats.shipping.label'
  | 'landing.featured.eyebrow'
  | 'landing.featured.title'
  | 'landing.featured.linkAll'
  | 'landing.featured.tagOnFlex'
  | 'landing.featured.loginForPrice'
  | 'spec.label.health'
  | 'spec.label.cycles'
  | 'spec.label.capacity'
  | 'landing.howItWorks.eyebrow'
  | 'landing.howItWorks.title'
  | 'landing.howItWorks.stepLabel'
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
  | 'auth.signIn.passwordPlaceholder'
  | 'auth.signIn.passwordSubmit'
  | 'auth.signIn.passwordSending'
  | 'auth.signIn.forgotPassword'
  | 'auth.signIn.preferEmailLink'
  | 'auth.signIn.noAccount'
  // Sign-up
  | 'auth.signUp.title'
  | 'auth.signUp.subtitle'
  | 'auth.signUp.emailPlaceholder'
  | 'auth.signUp.passwordPlaceholder'
  | 'auth.signUp.confirmPlaceholder'
  | 'auth.signUp.submit'
  | 'auth.signUp.sending'
  | 'auth.signUp.hasAccount'
  | 'auth.signUp.confirmHint'
  | 'auth.signUp.resend'
  | 'auth.signUp.passwordsDontMatch'
  | 'auth.signUp.strength.weak'
  | 'auth.signUp.strength.medium'
  | 'auth.signUp.strength.strong'
  // Account password
  | 'account.password.title'
  | 'account.password.currentLabel'
  | 'account.password.newLabel'
  | 'account.password.confirmLabel'
  | 'account.password.submitChange'
  | 'account.password.submitSet'
  | 'account.password.requestStepUp'
  | 'account.password.otpLabel'
  | 'account.password.noPasswordYet'
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
  | 'onboarding.pending.noCert.intro'
  | 'onboarding.pending.noCert.submit'
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
  | 'invoice.wire.title'
  | 'invoice.wire.beneficiary'
  | 'invoice.wire.bank'
  | 'invoice.wire.account'
  | 'invoice.wire.routing'
  | 'invoice.wire.swift'
  | 'invoice.wire.accountType'
  | 'invoice.wire.reference'
  // Payment status
  | 'payment.status.paid'
  | 'payment.status.pending'
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
  | 'common.yes'
  | 'common.no'
  | 'common.toast.error.unexpected'
  // Auth toasts
  | 'auth.toast.linkSent'
  | 'auth.toast.linkFailed'
  | 'auth.toast.rateLimited'
  | 'auth.signIn.sending'
  | 'auth.toast.invalidCredentials'
  | 'auth.toast.emailNotVerified'
  | 'auth.toast.accountExists'
  | 'auth.toast.weakPassword'
  | 'auth.toast.checkEmailToConfirm'
  | 'auth.toast.invalidEmail'
  | 'auth.toast.stepUpRequired'
  | 'auth.toast.stepUpSent'
  | 'auth.toast.signedIn'
  | 'auth.toast.invalidCurrentPassword'
  | 'auth.toast.passwordAlreadySet'
  | 'auth.toast.passwordChanged'
  | 'auth.toast.passwordSet'
  | 'auth.toast.unauthenticated'
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
  // Admin generic toasts
  | 'admin.toast.saved'
  | 'admin.toast.created'
  | 'admin.toast.updated'
  | 'admin.toast.deleted'
  | 'admin.toast.invalidInput'
  // Admin product/category
  | 'admin.toast.productCreated'
  | 'admin.toast.productEnabled'
  | 'admin.toast.productDisabled'
  | 'admin.toast.productPrivacyToggled'
  | 'admin.toast.categoryCreated'
  | 'admin.toast.categoryPrivacyToggled'
  | 'admin.toast.tierUpserted'
  // Admin orders
  | 'admin.toast.orderStatusChanged'
  | 'admin.toast.orderCancelled'
  | 'admin.toast.paymentDueExtended'
  | 'admin.action.extendPaymentDue'
  | 'admin.order.paymentDue'
  // Admin invoices / quotes
  | 'admin.toast.invoicePaid'
  | 'admin.toast.quoteSent'
  | 'admin.toast.quoteRevised'
  // Admin credit / customer
  | 'admin.toast.creditSaved'
  | 'admin.toast.customerPriceSaved'
  | 'admin.toast.accessGranted'
  | 'admin.toast.accessRevoked'
  // Admin actions labels
  | 'admin.action.save'
  | 'admin.action.saving'
  | 'admin.action.create'
  | 'admin.action.creating'
  | 'admin.action.toggle'
  | 'admin.action.cancel'
  | 'admin.action.cancelling'
  | 'admin.action.confirmCancel'
  | 'admin.action.upload'
  | 'admin.action.uploading'
  | 'admin.action.remove'
  | 'admin.action.grantAccess'
  | 'admin.action.granting'
  | 'admin.action.viewCert'
  | 'admin.action.opening'
  | 'admin.action.uploadAndApprove'
  | 'admin.action.viewAsOrg'
  | 'admin.action.entering'
  | 'admin.action.markPaid'
  | 'admin.action.reconcileWire'
  | 'admin.action.reconciling'
  | 'admin.action.enqueuing'
  | 'admin.action.generateRegenerate'
  | 'admin.action.generateAllContent'
  | 'admin.action.publish'
  | 'admin.action.publishing'
  | 'admin.action.reindexAll'
  | 'admin.action.retry'
  | 'admin.action.createProduct'
  | 'admin.action.activate'
  | 'admin.action.deactivate'
  | 'admin.action.saveTier'
  | 'admin.action.revise'
  | 'admin.action.quote'
  | 'admin.action.sending'
  | 'admin.action.invite'
  | 'admin.action.inviting'
  // Email chrome
  | 'email.greeting'
  | 'email.cta.viewDetail'
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
    'landing.hero.eyebrow': '0 cycles · 100% health',
    'landing.hero.headlineMain': 'Back to',
    'landing.hero.headlineAccent': '100%',
    'landing.hero.headlineTail': '. Zero cycles.',
    'landing.hero.lead':
      'Fresh cells, not recycled. Every battery sends the iPhone back to the day it left the factory — with extended capacity and verified model compatibility.',
    'landing.hero.gaugeLabel': 'battery health',
    'landing.hero.chip1Label': 'cycle count',
    'landing.hero.chip2Label': 'capacity vs OEM',
    'landing.stats.cycles.label': 'charge cycles on arrival',
    'landing.stats.health.label': 'factory battery health',
    'landing.stats.capacity.label': 'capacity over original',
    'landing.stats.shipping.label': 'shipping from Miami',
    'landing.featured.eyebrow': 'Catalog',
    'landing.featured.title': 'Most requested',
    'landing.featured.linkAll': 'View all →',
    'landing.featured.tagOnFlex': 'Tag-On Flex',
    'landing.featured.loginForPrice': 'Sign in to see price',
    'spec.label.health': 'Health',
    'spec.label.cycles': 'Cycles',
    'spec.label.capacity': 'Cap.',
    'landing.howItWorks.eyebrow': 'How it works',
    'landing.howItWorks.title': 'From registration to reorder, no friction',
    'landing.howItWorks.stepLabel': 'Step',
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
    'auth.signIn.passwordPlaceholder': 'Password',
    'auth.signIn.passwordSubmit': 'Sign in',
    'auth.signIn.passwordSending': 'Signing in…',
    'auth.signIn.forgotPassword': 'Forgot your password?',
    'auth.signIn.preferEmailLink': 'Prefer to receive a link by email',
    'auth.signIn.noAccount': "Don't have an account? Sign up",
    // Sign-up
    'auth.signUp.title': 'Create your account',
    'auth.signUp.subtitle': "Email + password. We'll send a confirmation link.",
    'auth.signUp.emailPlaceholder': 'you@company.com',
    'auth.signUp.passwordPlaceholder': 'Min 8 chars, letter + number',
    'auth.signUp.confirmPlaceholder': 'Confirm password',
    'auth.signUp.submit': 'Sign up',
    'auth.signUp.sending': 'Creating account…',
    'auth.signUp.hasAccount': 'Already have an account? Sign in',
    'auth.signUp.confirmHint':
      "Check your email and click the link to verify. Don't see it? Check spam.",
    'auth.signUp.resend': 'Resend confirmation',
    'auth.signUp.passwordsDontMatch': "Passwords don't match.",
    'auth.signUp.strength.weak': 'Weak',
    'auth.signUp.strength.medium': 'Medium',
    'auth.signUp.strength.strong': 'Strong',
    // Account password
    'account.password.title': 'Password',
    'account.password.currentLabel': 'Current password',
    'account.password.newLabel': 'New password',
    'account.password.confirmLabel': 'Confirm new password',
    'account.password.submitChange': 'Update password',
    'account.password.submitSet': 'Set password',
    'account.password.requestStepUp': 'Send verification code',
    'account.password.otpLabel': 'Verification code',
    'account.password.noPasswordYet':
      'You sign in with a magic link. Set a password to sign in faster.',
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
    'onboarding.pending.noCert.intro':
      "We don't have your tax certificate yet. Upload it to start verification.",
    'onboarding.pending.noCert.submit': 'Upload certificate',
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
    'invoice.wire.title': 'Payment instructions (wire / ACH)',
    'invoice.wire.beneficiary': 'Beneficiary',
    'invoice.wire.bank': 'Bank',
    'invoice.wire.account': 'Account number',
    'invoice.wire.routing': 'Routing (ABA)',
    'invoice.wire.swift': 'SWIFT',
    'invoice.wire.accountType': 'Account type',
    'invoice.wire.reference': 'Reference',
    // Payment status
    'payment.status.paid': 'Paid',
    'payment.status.pending': 'Payment pending',
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
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.toast.error.unexpected': 'Something went wrong. Please try again.',
    // Auth
    'auth.toast.linkSent': 'Magic link sent. Check your inbox.',
    'auth.toast.linkFailed': "We couldn't send the magic link. Try again.",
    'auth.toast.rateLimited': 'Too many attempts. Wait a minute and try again.',
    'auth.signIn.sending': 'Sending…',
    'auth.toast.invalidCredentials': 'Invalid email or password.',
    'auth.toast.emailNotVerified': 'Confirm your email before signing in.',
    'auth.toast.accountExists': 'An account with that email already exists. Sign in instead.',
    'auth.toast.weakPassword': 'Password must be at least 8 characters with a letter and a number.',
    'auth.toast.checkEmailToConfirm': 'Check your email to confirm your account.',
    'auth.toast.invalidEmail': 'Enter a valid email.',
    'auth.toast.stepUpRequired': 'Verification code required.',
    'auth.toast.stepUpSent': 'We sent a verification code to your email.',
    'auth.toast.signedIn': 'Signed in.',
    'auth.toast.invalidCurrentPassword': 'Current password is incorrect.',
    'auth.toast.passwordAlreadySet': 'You already have a password set.',
    'auth.toast.passwordChanged': 'Password updated. Other sessions were signed out.',
    'auth.toast.passwordSet': 'Password created. Other sessions were signed out.',
    'auth.toast.unauthenticated': 'Please sign in first.',
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
    'admin.toast.saved': 'Saved ✓',
    'admin.toast.created': 'Created ✓',
    'admin.toast.updated': 'Updated ✓',
    'admin.toast.deleted': 'Deleted ✓',
    'admin.toast.invalidInput': 'Invalid input. Please review.',
    'admin.toast.productCreated': 'Product created ✓',
    'admin.toast.productEnabled': 'Product enabled ✓',
    'admin.toast.productDisabled': 'Product disabled ✓',
    'admin.toast.productPrivacyToggled': 'Product privacy updated ✓',
    'admin.toast.categoryCreated': 'Category created ✓',
    'admin.toast.categoryPrivacyToggled': 'Category privacy updated ✓',
    'admin.toast.tierUpserted': 'Price tier saved ✓',
    'admin.toast.orderStatusChanged': 'Order status updated ✓',
    'admin.toast.orderCancelled': 'Order cancelled.',
    'admin.toast.paymentDueExtended': 'Payment window extended +7 days ✓',
    'admin.action.extendPaymentDue': 'Wire on the way (+7 days)',
    'admin.order.paymentDue': 'Payment due',
    'admin.toast.invoicePaid': 'Invoice marked paid ✓',
    'admin.toast.quoteSent': 'Quote sent ✓',
    'admin.toast.quoteRevised': 'Quote revised ✓',
    'admin.toast.creditSaved': 'Credit settings saved ✓',
    'admin.toast.customerPriceSaved': 'Customer price saved ✓',
    'admin.toast.accessGranted': 'Access granted ✓',
    'admin.toast.accessRevoked': 'Access revoked.',
    'admin.action.save': 'Save',
    'admin.action.saving': 'Saving…',
    'admin.action.create': 'Create',
    'admin.action.creating': 'Creating…',
    'admin.action.toggle': 'Toggle',
    'admin.action.cancel': 'Cancel order',
    'admin.action.cancelling': 'Cancelling…',
    'admin.action.confirmCancel': 'Cancel this order? Stock will be restored.',
    'admin.action.upload': 'Upload',
    'admin.action.uploading': 'Uploading…',
    'admin.action.remove': 'Remove',
    'admin.action.grantAccess': 'Grant access',
    'admin.action.granting': 'Granting…',
    'admin.action.viewCert': 'View certificate',
    'admin.action.opening': 'Opening…',
    'admin.action.uploadAndApprove': 'Upload + auto-approve',
    'admin.action.viewAsOrg': 'View storefront as this org',
    'admin.action.entering': 'Entering…',
    'admin.action.markPaid': 'Mark paid',
    'admin.action.reconcileWire': 'Reconcile wire',
    'admin.action.reconciling': 'Reconciling…',
    'admin.action.enqueuing': 'Enqueuing…',
    'admin.action.generateRegenerate': 'Generate / Regenerate (EN + ES)',
    'admin.action.generateAllContent': 'Generate AI content (all)',
    'admin.action.publish': 'Publish',
    'admin.action.publishing': 'Publishing…',
    'admin.action.reindexAll': 'Reindex all',
    'admin.action.retry': 'Retry',
    'admin.action.createProduct': 'Create product',
    'admin.action.activate': 'Activate',
    'admin.action.deactivate': 'Deactivate',
    'admin.action.saveTier': 'Save tier',
    'admin.action.revise': 'Revise',
    'admin.action.quote': 'Quote',
    'admin.action.sending': 'Sending…',
    'admin.action.invite': 'Invite',
    'admin.action.inviting': 'Inviting…',
    'email.greeting': 'Hi {name},',
    'email.cta.viewDetail': 'View details',
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
    'landing.hero.eyebrow': '0 ciclos · 100% de salud',
    'landing.hero.headlineMain': 'Volvé al',
    'landing.hero.headlineAccent': '100%',
    'landing.hero.headlineTail': '. Cero ciclos.',
    'landing.hero.lead':
      'Celdas nuevas, no recicladas. Cada batería devuelve el iPhone al día que salió de fábrica — con capacidad extendida y compatibilidad verificada por modelo.',
    'landing.hero.gaugeLabel': 'salud de batería',
    'landing.hero.chip1Label': 'cycle count',
    'landing.hero.chip2Label': 'capacidad vs OEM',
    'landing.stats.cycles.label': 'ciclos de carga al recibirla',
    'landing.stats.health.label': 'salud de batería de fábrica',
    'landing.stats.capacity.label': 'capacidad sobre la original',
    'landing.stats.shipping.label': 'despacho desde Miami',
    'landing.featured.eyebrow': 'Catálogo',
    'landing.featured.title': 'Las más pedidas',
    'landing.featured.linkAll': 'Ver todo →',
    'landing.featured.tagOnFlex': 'Tag-On Flex',
    'landing.featured.loginForPrice': 'Iniciá sesión para ver precios',
    'spec.label.health': 'Salud',
    'spec.label.cycles': 'Ciclos',
    'spec.label.capacity': 'Cap.',
    'landing.howItWorks.eyebrow': 'Cómo funciona',
    'landing.howItWorks.title': 'De registro a recompra, sin fricción',
    'landing.howItWorks.stepLabel': 'Paso',
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
    'auth.signIn.passwordPlaceholder': 'Contraseña',
    'auth.signIn.passwordSubmit': 'Entrar',
    'auth.signIn.passwordSending': 'Entrando…',
    'auth.signIn.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.signIn.preferEmailLink': 'Prefiero recibir un link por email',
    'auth.signIn.noAccount': '¿No tenés cuenta? Registrate',
    // Sign-up
    'auth.signUp.title': 'Creá tu cuenta',
    'auth.signUp.subtitle': 'Email + contraseña. Te mandamos un link de confirmación.',
    'auth.signUp.emailPlaceholder': 'vos@empresa.com',
    'auth.signUp.passwordPlaceholder': 'Mín 8 caract., letra + número',
    'auth.signUp.confirmPlaceholder': 'Confirmá la contraseña',
    'auth.signUp.submit': 'Registrarme',
    'auth.signUp.sending': 'Creando cuenta…',
    'auth.signUp.hasAccount': '¿Ya tenés cuenta? Iniciá sesión',
    'auth.signUp.confirmHint':
      'Revisá tu email y hacé click en el link para verificar. ¿No lo ves? Mirá spam.',
    'auth.signUp.resend': 'Reenviar confirmación',
    'auth.signUp.passwordsDontMatch': 'Las contraseñas no coinciden.',
    'auth.signUp.strength.weak': 'Débil',
    'auth.signUp.strength.medium': 'Media',
    'auth.signUp.strength.strong': 'Fuerte',
    // Account password
    'account.password.title': 'Contraseña',
    'account.password.currentLabel': 'Contraseña actual',
    'account.password.newLabel': 'Contraseña nueva',
    'account.password.confirmLabel': 'Confirmá la contraseña nueva',
    'account.password.submitChange': 'Actualizar contraseña',
    'account.password.submitSet': 'Crear contraseña',
    'account.password.requestStepUp': 'Enviar código de verificación',
    'account.password.otpLabel': 'Código de verificación',
    'account.password.noPasswordYet':
      'Hoy entrás con un link mágico. Creá una contraseña para entrar más rápido.',
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
    'onboarding.pending.noCert.intro':
      'Todavía no tenemos tu certificado fiscal. Subilo para iniciar la verificación.',
    'onboarding.pending.noCert.submit': 'Subir certificado',
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
    'invoice.wire.title': 'Instrucciones de pago (transferencia / wire)',
    'invoice.wire.beneficiary': 'Beneficiario',
    'invoice.wire.bank': 'Banco',
    'invoice.wire.account': 'Número de cuenta',
    'invoice.wire.routing': 'Routing (ABA)',
    'invoice.wire.swift': 'SWIFT',
    'invoice.wire.accountType': 'Tipo de cuenta',
    'invoice.wire.reference': 'Referencia',
    // Payment status
    'payment.status.paid': 'Pagado',
    'payment.status.pending': 'Pendiente de pago',
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
    'common.yes': 'Sí',
    'common.no': 'No',
    'common.toast.error.unexpected': 'Algo salió mal. Volvé a intentar.',
    // Auth
    'auth.toast.linkSent': 'Te enviamos el link mágico. Revisá tu bandeja.',
    'auth.toast.linkFailed': 'No pudimos enviar el link. Volvé a intentar.',
    'auth.toast.rateLimited': 'Demasiados intentos. Esperá un minuto y volvé a intentar.',
    'auth.signIn.sending': 'Enviando…',
    'auth.toast.invalidCredentials': 'Email o contraseña inválidos.',
    'auth.toast.emailNotVerified': 'Confirmá tu email antes de entrar.',
    'auth.toast.accountExists': 'Ya existe una cuenta con ese email. Iniciá sesión.',
    'auth.toast.weakPassword': 'La contraseña debe tener al menos 8 caracteres con letra y número.',
    'auth.toast.checkEmailToConfirm': 'Revisá tu email para confirmar tu cuenta.',
    'auth.toast.invalidEmail': 'Ingresá un email válido.',
    'auth.toast.stepUpRequired': 'Falta el código de verificación.',
    'auth.toast.stepUpSent': 'Te enviamos un código de verificación a tu email.',
    'auth.toast.signedIn': 'Sesión iniciada.',
    'auth.toast.invalidCurrentPassword': 'La contraseña actual es incorrecta.',
    'auth.toast.passwordAlreadySet': 'Ya tenés una contraseña configurada.',
    'auth.toast.passwordChanged': 'Contraseña actualizada. Las otras sesiones se cerraron.',
    'auth.toast.passwordSet': 'Contraseña creada. Las otras sesiones se cerraron.',
    'auth.toast.unauthenticated': 'Iniciá sesión primero.',
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
    'admin.toast.saved': 'Guardado ✓',
    'admin.toast.created': 'Creado ✓',
    'admin.toast.updated': 'Actualizado ✓',
    'admin.toast.deleted': 'Eliminado ✓',
    'admin.toast.invalidInput': 'Datos inválidos. Revisalos.',
    'admin.toast.productCreated': 'Producto creado ✓',
    'admin.toast.productEnabled': 'Producto activado ✓',
    'admin.toast.productDisabled': 'Producto desactivado ✓',
    'admin.toast.productPrivacyToggled': 'Privacidad del producto actualizada ✓',
    'admin.toast.categoryCreated': 'Categoría creada ✓',
    'admin.toast.categoryPrivacyToggled': 'Privacidad de la categoría actualizada ✓',
    'admin.toast.tierUpserted': 'Tier de precio guardado ✓',
    'admin.toast.orderStatusChanged': 'Estado de la orden actualizado ✓',
    'admin.toast.orderCancelled': 'Orden cancelada.',
    'admin.toast.paymentDueExtended': 'Ventana de pago extendida +7 días ✓',
    'admin.action.extendPaymentDue': 'Wire en camino (+7 días)',
    'admin.order.paymentDue': 'Vence el pago',
    'admin.toast.invoicePaid': 'Factura marcada como pagada ✓',
    'admin.toast.quoteSent': 'Cotización enviada ✓',
    'admin.toast.quoteRevised': 'Cotización revisada ✓',
    'admin.toast.creditSaved': 'Configuración de crédito guardada ✓',
    'admin.toast.customerPriceSaved': 'Precio del cliente guardado ✓',
    'admin.toast.accessGranted': 'Acceso otorgado ✓',
    'admin.toast.accessRevoked': 'Acceso revocado.',
    'admin.action.save': 'Guardar',
    'admin.action.saving': 'Guardando…',
    'admin.action.create': 'Crear',
    'admin.action.creating': 'Creando…',
    'admin.action.toggle': 'Alternar',
    'admin.action.cancel': 'Cancelar orden',
    'admin.action.cancelling': 'Cancelando…',
    'admin.action.confirmCancel': '¿Cancelar esta orden? Se restaurará el stock.',
    'admin.action.upload': 'Subir',
    'admin.action.uploading': 'Subiendo…',
    'admin.action.remove': 'Quitar',
    'admin.action.grantAccess': 'Otorgar acceso',
    'admin.action.granting': 'Otorgando…',
    'admin.action.viewCert': 'Ver certificado',
    'admin.action.opening': 'Abriendo…',
    'admin.action.uploadAndApprove': 'Subir + auto-aprobar',
    'admin.action.viewAsOrg': 'Ver storefront como esta org',
    'admin.action.entering': 'Entrando…',
    'admin.action.markPaid': 'Marcar pagada',
    'admin.action.reconcileWire': 'Conciliar wire',
    'admin.action.reconciling': 'Conciliando…',
    'admin.action.enqueuing': 'Encolando…',
    'admin.action.generateRegenerate': 'Generar / Regenerar (EN + ES)',
    'admin.action.generateAllContent': 'Generar contenido AI (todos)',
    'admin.action.publish': 'Publicar',
    'admin.action.publishing': 'Publicando…',
    'admin.action.reindexAll': 'Reindex todo',
    'admin.action.retry': 'Reintentar',
    'admin.action.createProduct': 'Crear producto',
    'admin.action.activate': 'Activar',
    'admin.action.deactivate': 'Desactivar',
    'admin.action.saveTier': 'Guardar tramo',
    'admin.action.revise': 'Revisar',
    'admin.action.quote': 'Cotizar',
    'admin.action.sending': 'Enviando…',
    'admin.action.invite': 'Invitar',
    'admin.action.inviting': 'Invitando…',
    'email.greeting': 'Hola {name},',
    'email.cta.viewDetail': 'Ver detalle',
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
