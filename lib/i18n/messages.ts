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
  // Header unificado (chrome único storefront + account + home)
  | 'header.catalog'
  | 'header.searchPlaceholder'
  | 'header.cart'
  | 'header.cartItems'
  | 'header.account'
  | 'header.buyAgain'
  | 'header.orders'
  | 'header.quotes'
  | 'header.invoices'
  | 'header.approvals'
  | 'header.notifications'
  | 'header.signIn'
  | 'header.signOut'
  | 'header.register'
  | 'header.menu'
  | 'header.close'
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
  | 'auth.brand.cycles'
  | 'auth.field.email'
  | 'auth.field.password'
  | 'auth.field.newPassword'
  | 'auth.field.confirmPassword'
  | 'auth.invite.notFound.title'
  | 'auth.invite.notFound.body'
  | 'auth.invite.accepted.title'
  | 'auth.invite.accepted.body'
  | 'auth.invite.expired.title'
  | 'auth.invite.expired.body'
  | 'auth.invite.join'
  | 'auth.invite.roleHint'
  | 'auth.invite.accept'
  // Forgot password
  | 'auth.forgot.title'
  | 'auth.forgot.subtitle'
  | 'auth.forgot.submit'
  | 'auth.forgot.sending'
  | 'auth.forgot.backToSignIn'
  | 'auth.forgot.checkInbox'
  // Reset password
  | 'auth.reset.title'
  | 'auth.reset.subtitle'
  | 'auth.reset.submit'
  | 'auth.reset.sending'
  | 'auth.reset.invalidTitle'
  | 'auth.reset.invalidBody'
  | 'auth.reset.requestNew'
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
  // Account hub
  | 'account.title'
  | 'account.nav.overview'
  | 'account.nav.profile'
  | 'account.nav.addresses'
  | 'account.nav.security'
  // Account overview
  | 'account.overview.identity'
  | 'account.overview.name'
  | 'account.overview.email'
  | 'account.overview.locale'
  | 'account.overview.edit'
  | 'account.overview.organization'
  | 'account.overview.role'
  | 'account.overview.verification'
  | 'account.overview.taxExempt'
  | 'account.overview.paymentTerms'
  | 'account.overview.credit'
  | 'account.overview.switch'
  | 'account.overview.quickAccess'
  | 'account.overview.orders'
  | 'account.overview.invoices'
  | 'account.overview.quotes'
  | 'account.overview.notSet'
  | 'account.verification.VERIFIED'
  | 'account.verification.PENDING'
  | 'account.verification.REJECTED'
  | 'account.locale.en'
  | 'account.locale.es'
  // Account profile
  | 'account.profile.subtitle'
  | 'account.profile.emailHint'
  | 'account.profile.submit'
  | 'account.toast.profileSaved'
  | 'account.toast.profileInvalid'
  | 'account.toast.addressForbidden'
  | 'account.toast.addressInUse'
  | 'account.toast.addressInvalid'
  | 'account.toast.addressSaved'
  | 'account.toast.addressDeleted'
  | 'account.toast.addressDefaultSet'
  // Account addresses
  | 'account.addresses.subtitle'
  | 'account.addresses.add'
  | 'account.addresses.edit'
  | 'account.addresses.delete'
  | 'account.addresses.cancel'
  | 'account.addresses.save'
  | 'account.addresses.confirmDelete'
  | 'account.addresses.setDefaultBilling'
  | 'account.addresses.setDefaultShipping'
  | 'account.addresses.badgeBilling'
  | 'account.addresses.badgeShipping'
  | 'account.addresses.empty'
  | 'account.addresses.readOnly'
  | 'account.addresses.field.label'
  | 'account.addresses.field.recipient'
  | 'account.addresses.field.line1'
  | 'account.addresses.field.line2'
  | 'account.addresses.field.city'
  | 'account.addresses.field.state'
  | 'account.addresses.field.postalCode'
  | 'account.addresses.field.country'
  | 'account.addresses.field.phone'
  // Account security
  | 'account.security.subtitle'
  | 'account.security.passwordSection'
  | 'account.security.sessionsSection'
  | 'account.security.signOutEverywhere'
  | 'account.security.signOutEverywhereHint'
  | 'account.toast.signedOutEverywhere'
  // Account orders
  | 'account.orders.title'
  | 'account.orders.empty'
  | 'account.orders.linesLabel'
  | 'account.orders.orderLabel'
  | 'account.orders.placedBy'
  | 'account.orders.linesSection'
  | 'account.orders.col.sku'
  | 'account.orders.col.product'
  | 'account.orders.col.price'
  | 'account.orders.col.qty'
  | 'account.orders.col.total'
  | 'account.orders.addresses'
  | 'account.orders.billing'
  | 'account.orders.shipping'
  | 'account.orders.notes'
  | 'account.orders.subtotal'
  | 'account.orders.total'
  | 'account.orders.payCard'
  | 'account.orders.payCardHint'
  | 'account.orders.payCta'
  | 'account.orders.pp.processingTitle'
  | 'account.orders.pp.confirmedTitle'
  | 'account.orders.pp.confirmedBody'
  | 'account.orders.pp.processingBody1'
  | 'account.orders.pp.processingBody2'
  | 'account.orders.pp.backToOrder'
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
  | 'catalog.stock.inStock'
  | 'catalog.stock.incoming'
  | 'catalog.stock.comingSoon'
  | 'catalog.stock.outOfStock'
  | 'catalog.notify'
  | 'catalog.qtyDecrease'
  | 'catalog.qtyIncrease'
  | 'catalog.chip.spotWeld'
  | 'catalog.chip.plugAndPlay'
  | 'catalog.chip.flexProgrammed'
  | 'catalog.chip.tagOn'
  | 'catalog.loginForPrice'
  | 'catalog.viewCards'
  | 'catalog.viewList'
  // PDP
  | 'pdp.signInForPriceLong'
  | 'pdp.viewLabel.sku'
  | 'pdp.relatedTitle.recommended'
  | 'pdp.relatedTitle.related'
  | 'pdp.disabled.impersonating'
  | 'pdp.disabled.outOfStock'
  | 'pdp.noImage'
  | 'pdp.privateBadge'
  | 'pdp.volumePricing'
  | 'pdp.tierMinQty'
  | 'pdp.tierUnitPrice'
  | 'pdp.requestQuote'
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
  | 'minicart.title'
  | 'minicart.checkout'
  | 'minicart.viewFull'
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
  // Status badges (admin — dominios completos)
  | 'status.order.PENDING_PAYMENT'
  | 'status.order.PENDING_APPROVAL'
  | 'status.order.CONFIRMED'
  | 'status.order.SHIPPED'
  | 'status.order.DELIVERED'
  | 'status.order.CANCELLED'
  | 'status.quote.DRAFT'
  | 'status.quote.SUBMITTED'
  | 'status.quote.QUOTED'
  | 'status.quote.ACCEPTED'
  | 'status.quote.REJECTED'
  | 'status.quote.EXPIRED'
  | 'status.invoice.PENDING'
  | 'status.invoice.PAID'
  | 'status.invoice.OVERDUE'
  | 'status.invoice.CANCELLED'
  | 'status.approval.PENDING'
  | 'status.approval.APPROVED'
  | 'status.approval.REJECTED'
  | 'status.payment.PENDING'
  | 'status.payment.AUTHORIZED'
  | 'status.payment.CAPTURED'
  | 'status.payment.REFUND_PENDING'
  | 'status.payment.REFUNDED'
  | 'status.payment.FAILED'
  | 'status.payment.NEEDS_REVIEW'
  | 'approvals.title'
  | 'approvals.empty'
  | 'notifications.title'
  | 'notifications.empty'
  | 'notifications.markAllRead'
  // Admin nav
  | 'admin.label'
  | 'admin.platformAdmin'
  | 'admin.dashboard.title'
  | 'admin.dashboard.welcome'
  | 'admin.dashboard.pendingQuotes'
  | 'admin.dashboard.pendingApprovals'
  | 'admin.dashboard.overdueInvoices'
  | 'admin.dashboard.openBalance'
  | 'admin.dashboard.orgsTitle'
  | 'admin.dashboard.noOrgs'
  | 'admin.dashboard.createInSettings'
  // Admin catalog (Fase 1)
  | 'admin.products.bulkQueued'
  | 'admin.products.title'
  | 'admin.products.count'
  | 'admin.products.newProduct'
  | 'admin.products.f.sku'
  | 'admin.products.f.slug'
  | 'admin.products.f.name'
  | 'admin.products.f.basePrice'
  | 'admin.products.f.stock'
  | 'admin.products.f.imageUrl'
  | 'admin.products.f.category'
  | 'admin.products.f.description'
  | 'admin.products.chooseCategory'
  | 'admin.products.col.sku'
  | 'admin.products.col.product'
  | 'admin.products.col.category'
  | 'admin.products.col.price'
  | 'admin.products.col.stock'
  | 'admin.products.col.status'
  | 'admin.products.col.private'
  | 'admin.products.col.action'
  | 'admin.products.active'
  | 'admin.products.inactive'
  | 'admin.products.tiers.title'
  | 'admin.products.tiers.hint'
  | 'admin.products.tiers.base'
  | 'admin.products.tiers.minQty'
  | 'admin.products.tiers.unitPrice'
  | 'admin.products.tiers.minQtyRow'
  | 'admin.categories.title'
  | 'admin.categories.count'
  | 'admin.categories.newCategory'
  | 'admin.categories.f.slug'
  | 'admin.categories.f.name'
  | 'admin.categories.f.sortOrder'
  | 'admin.categories.col.order'
  | 'admin.categories.col.slug'
  | 'admin.categories.col.name'
  | 'admin.categories.col.status'
  | 'admin.categories.active'
  | 'admin.categories.inactive'
  | 'admin.productDetail.flashQueued'
  | 'admin.productDetail.flashPublished'
  | 'admin.productDetail.subtitle'
  | 'admin.productDetail.aiContent'
  | 'admin.productDetail.aiHint'
  | 'admin.productDetail.longDescription'
  | 'admin.productDetail.published'
  | 'admin.productDetail.draft'
  // Admin commerce (Fase 2)
  | 'admin.col.number'
  | 'admin.col.customer'
  | 'admin.col.date'
  | 'admin.col.created'
  | 'admin.col.total'
  | 'admin.col.status'
  | 'admin.col.sku'
  | 'admin.col.product'
  | 'admin.col.price'
  | 'admin.col.qty'
  | 'admin.col.requester'
  | 'admin.col.amount'
  | 'admin.col.action'
  | 'admin.col.order'
  | 'admin.col.dueDate'
  | 'admin.col.payment'
  | 'admin.col.subject'
  | 'admin.col.threshold'
  | 'admin.col.base'
  | 'admin.col.quoted'
  | 'admin.orders.title'
  | 'admin.orders.count'
  | 'admin.orders.lines'
  | 'admin.orders.actions'
  | 'admin.orders.payment'
  | 'admin.orders.method'
  | 'admin.orders.wireRef'
  | 'admin.orders.subtotal'
  | 'admin.orders.total'
  | 'admin.quotes.title'
  | 'admin.quotes.count'
  | 'admin.quotes.customerNotes'
  | 'admin.quotes.doQuote'
  | 'admin.quotes.doRevise'
  | 'admin.quotes.lines'
  | 'admin.quotes.validUntil'
  | 'admin.quotes.internalNotes'
  | 'admin.quotes.quotedPriceFor'
  | 'admin.invoices.title'
  | 'admin.invoices.count'
  | 'admin.invoices.refPlaceholder'
  | 'admin.invoices.refAria'
  | 'admin.approvals.title'
  | 'admin.approvals.pendingCount'
  // Admin customers (Fase 3)
  | 'admin.customers.title'
  | 'admin.customers.count'
  | 'admin.customers.filter.all'
  | 'admin.customers.filter.pending'
  | 'admin.customers.filter.verified'
  | 'admin.customers.filter.rejected'
  | 'admin.customers.col.org'
  | 'admin.customers.col.slug'
  | 'admin.customers.col.members'
  | 'admin.customers.col.addresses'
  | 'admin.customers.col.submitted'
  | 'admin.customers.col.email'
  | 'admin.customers.col.role'
  | 'admin.customers.col.since'
  | 'admin.customers.managePrices'
  | 'admin.customers.members'
  | 'admin.customers.addresses'
  | 'admin.customers.noAddresses'
  | 'admin.customers.billing'
  | 'admin.customers.shipping'
  | 'admin.customers.b2bVerification'
  | 'admin.customers.taxExempt'
  | 'admin.customers.submittedAt'
  | 'admin.customers.verifiedOn'
  | 'admin.customers.rejectionReason'
  | 'admin.customers.documents'
  | 'admin.customers.docType'
  | 'admin.customers.docTypeUsResale'
  | 'admin.customers.docTypeForeign'
  | 'admin.customers.countryIso2'
  | 'admin.customers.certNumber'
  | 'admin.customers.jurisdiction'
  | 'admin.customers.file'
  | 'admin.customers.impersonation'
  | 'admin.customers.reasonOptional'
  | 'admin.customers.impersonationPlaceholder'
  | 'admin.credit.title'
  | 'admin.credit.creditApprovals'
  | 'admin.credit.limit'
  | 'admin.credit.limitHint'
  | 'admin.credit.terms'
  | 'admin.credit.termsPrepaid'
  | 'admin.credit.threshold'
  | 'admin.credit.thresholdHint'
  | 'admin.credit.currentUsage'
  | 'admin.credit.catalogAccess'
  | 'admin.credit.noGrants'
  | 'admin.credit.grantedProduct'
  | 'admin.credit.grantedCategory'
  | 'admin.credit.productOneOrOther'
  | 'admin.credit.category'
  | 'admin.prices.title'
  | 'admin.prices.hint'
  | 'admin.prices.basePrice'
  | 'admin.prices.yourPrice'
  // Admin platform (Fase 4)
  | 'admin.search.title'
  | 'admin.search.subtitle'
  | 'admin.search.statPending'
  | 'admin.search.statProcessing'
  | 'admin.search.statDone'
  | 'admin.search.statFailed'
  | 'admin.search.reindexTitle'
  | 'admin.search.reindexHint'
  | 'admin.search.failedTitle'
  | 'admin.search.colAttempts'
  | 'admin.search.colError'
  | 'admin.search.noFailed'
  | 'admin.settings.title'
  | 'admin.settings.createOrg'
  | 'admin.settings.namePlaceholder'
  | 'admin.settings.slugPlaceholder'
  | 'admin.settings.invitePlaceholder'
  | 'admin.settings.yourOrgs'
  | 'admin.settings.noOrgs'
  | 'admin.settings.signedInAs'
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
  | 'auth.toast.resetLinkSent'
  | 'auth.toast.resetTokenInvalid'
  | 'auth.toast.passwordReset'
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
  | 'admin.toast.wireRefRequired'
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
  | 'email.reset.subject'
  | 'email.reset.heading'
  | 'email.reset.body'
  // Cart toasts
  | 'cart.toast.added'
  | 'cart.toast.updated'
  | 'cart.toast.removed'
  | 'cart.toast.failed'
  | 'cart.toast.insufficientStock'
  | 'cart.toast.notVerified'
  | 'cart.confirm.remove'
  // Product CTAs
  | 'product.add'
  | 'product.unavailable'
  | 'product.adding'
  // Checkout
  | 'checkout.toast.orderPlaced'
  | 'checkout.toast.failed'
  | 'checkout.toast.insufficientStock'
  | 'checkout.toast.inactive'
  | 'checkout.toast.empty'
  | 'checkout.toast.notVerified'
  | 'checkout.placing'
  // Reorder (loop de re-orden)
  | 'reorder.button'
  | 'reorder.reason.inactive'
  | 'reorder.reason.no_access'
  | 'reorder.reason.out_of_stock'
  | 'reorder.notice.nothingAvailable'
  | 'reorder.toast.added'
  | 'reorder.toast.addedSomeSkipped'
  | 'reorder.toast.notFound'
  | 'reorder.toast.notVerified'
  | 'reorder.toast.failed'

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
    'header.catalog': 'Catalog',
    'header.searchPlaceholder': 'Search products…',
    'header.cart': 'Cart',
    'header.cartItems': 'Cart, {count} items',
    'header.account': 'My account',
    'header.buyAgain': 'Buy again',
    'header.orders': 'Orders',
    'header.quotes': 'Quotes',
    'header.invoices': 'Invoices',
    'header.approvals': 'Approvals',
    'header.notifications': 'Notifications',
    'header.signIn': 'Sign in',
    'header.signOut': 'Sign out',
    'header.register': 'Register',
    'header.menu': 'Menu',
    'header.close': 'Close',
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
    'auth.brand.cycles': '0 cycles',
    'auth.field.email': 'Email',
    'auth.field.password': 'Password',
    'auth.field.newPassword': 'New password',
    'auth.field.confirmPassword': 'Confirm password',
    'auth.invite.notFound.title': 'Invitation not found',
    'auth.invite.notFound.body': 'The link may be invalid or removed.',
    'auth.invite.accepted.title': 'Already accepted',
    'auth.invite.accepted.body': 'This invitation has already been used.',
    'auth.invite.expired.title': 'Invitation expired',
    'auth.invite.expired.body': 'Ask the inviter to send a new one.',
    'auth.invite.join': 'Join {org}',
    'auth.invite.roleHint': 'You were invited to join as {role}.',
    'auth.invite.accept': 'Accept invitation',
    // Forgot password
    'auth.forgot.title': 'Reset your password',
    'auth.forgot.subtitle': "Enter your email and we'll send you a reset link.",
    'auth.forgot.submit': 'Send reset link',
    'auth.forgot.sending': 'Sending…',
    'auth.forgot.backToSignIn': 'Back to sign in',
    'auth.forgot.checkInbox':
      'If an account exists for that email, a reset link is on its way. Check your inbox.',
    // Reset password
    'auth.reset.title': 'Choose a new password',
    'auth.reset.subtitle':
      'Your new password must be at least 8 characters with a letter and a number.',
    'auth.reset.submit': 'Reset password',
    'auth.reset.sending': 'Resetting…',
    'auth.reset.invalidTitle': 'Link expired or invalid',
    'auth.reset.invalidBody': 'This password reset link is no longer valid. Request a new one.',
    'auth.reset.requestNew': 'Request a new link',
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
    // Account hub
    'account.title': 'Account',
    'account.nav.overview': 'Overview',
    'account.nav.profile': 'Profile',
    'account.nav.addresses': 'Addresses',
    'account.nav.security': 'Security',
    // Account overview
    'account.overview.identity': 'Identity',
    'account.overview.name': 'Name',
    'account.overview.email': 'Email',
    'account.overview.locale': 'Language',
    'account.overview.edit': 'Edit',
    'account.overview.organization': 'Organization',
    'account.overview.role': 'Role',
    'account.overview.verification': 'Verification',
    'account.overview.taxExempt': 'Tax-exempt',
    'account.overview.paymentTerms': 'Payment terms',
    'account.overview.credit': 'Credit limit',
    'account.overview.switch': 'Switch',
    'account.overview.quickAccess': 'Quick access',
    'account.overview.orders': 'Orders',
    'account.overview.invoices': 'Invoices',
    'account.overview.quotes': 'Quotes',
    'account.overview.notSet': 'Not set',
    'account.verification.VERIFIED': 'Verified',
    'account.verification.PENDING': 'Pending',
    'account.verification.REJECTED': 'Rejected',
    'account.locale.en': 'English',
    'account.locale.es': 'Spanish',
    // Account profile
    'account.profile.subtitle': 'Update your name and language.',
    'account.profile.emailHint': "Email can't be changed here.",
    'account.profile.submit': 'Save changes',
    'account.toast.profileSaved': 'Profile updated.',
    'account.toast.profileInvalid': 'Check your name and language and try again.',
    'account.toast.addressForbidden': "You don't have permission to manage addresses.",
    'account.toast.addressInUse': "This address is used by existing orders and can't be deleted.",
    'account.toast.addressInvalid': 'Check the address fields and try again.',
    'account.toast.addressSaved': 'Address saved.',
    'account.toast.addressDeleted': 'Address deleted.',
    'account.toast.addressDefaultSet': 'Default address updated.',
    // Account addresses
    'account.addresses.subtitle': 'Shipping and billing addresses for your organization.',
    'account.addresses.add': 'Add address',
    'account.addresses.edit': 'Edit',
    'account.addresses.delete': 'Delete',
    'account.addresses.cancel': 'Cancel',
    'account.addresses.save': 'Save address',
    'account.addresses.confirmDelete': 'Delete this address?',
    'account.addresses.setDefaultBilling': 'Set as billing',
    'account.addresses.setDefaultShipping': 'Set as shipping',
    'account.addresses.badgeBilling': 'Default billing',
    'account.addresses.badgeShipping': 'Default shipping',
    'account.addresses.empty': 'No addresses yet.',
    'account.addresses.readOnly': 'Addresses are managed by organization owners and admins.',
    'account.addresses.field.label': 'Label',
    'account.addresses.field.recipient': 'Recipient',
    'account.addresses.field.line1': 'Address line 1',
    'account.addresses.field.line2': 'Address line 2',
    'account.addresses.field.city': 'City',
    'account.addresses.field.state': 'State / Province',
    'account.addresses.field.postalCode': 'Postal code',
    'account.addresses.field.country': 'Country (2-letter)',
    'account.addresses.field.phone': 'Phone',
    // Account security
    'account.security.subtitle': 'Manage your password and active sessions.',
    'account.security.passwordSection': 'Password',
    'account.security.sessionsSection': 'Sessions',
    'account.security.signOutEverywhere': 'Sign out everywhere',
    'account.security.signOutEverywhereHint':
      'Signs out every other device. Your current session stays active.',
    'account.toast.signedOutEverywhere': 'Signed out of all other sessions.',
    // Account orders
    'account.orders.title': 'Your orders',
    'account.orders.empty': 'No orders in this organization yet.',
    'account.orders.linesLabel': 'lines',
    'account.orders.orderLabel': 'Order',
    'account.orders.placedBy': 'Placed by {email}',
    'account.orders.linesSection': 'Lines',
    'account.orders.col.sku': 'SKU',
    'account.orders.col.product': 'Product',
    'account.orders.col.price': 'Price',
    'account.orders.col.qty': 'Qty',
    'account.orders.col.total': 'Total',
    'account.orders.addresses': 'Addresses',
    'account.orders.billing': 'Billing',
    'account.orders.shipping': 'Shipping',
    'account.orders.notes': 'Notes',
    'account.orders.subtotal': 'Subtotal',
    'account.orders.total': 'Total',
    'account.orders.payCard': 'Pay by card',
    'account.orders.payCardHint':
      'We redirect you to Stripe Checkout (hosted). Payment is confirmed via a signed webhook — never from the return URL.',
    'account.orders.payCta': 'Pay {amount}',
    'account.orders.pp.processingTitle': 'Processing payment',
    'account.orders.pp.confirmedTitle': 'Thank you! Payment confirmed',
    'account.orders.pp.confirmedBody':
      'We received the processor confirmation. We emailed you a receipt and next steps. Shipment tracking will appear here soon.',
    'account.orders.pp.processingBody1':
      'We received your payment at Stripe. We are waiting for the signed processor confirmation to credit it to your order (usually seconds).',
    'account.orders.pp.processingBody2':
      'You can refresh this page or go back to the order detail at any time.',
    'account.orders.pp.backToOrder': 'Back to order detail',
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
    'catalog.stock.inStock': 'In stock',
    'catalog.stock.incoming': 'Incoming',
    'catalog.stock.comingSoon': 'Coming soon',
    'catalog.stock.outOfStock': 'Out of stock',
    'catalog.notify': 'Notify me',
    'catalog.qtyDecrease': 'Decrease quantity',
    'catalog.qtyIncrease': 'Increase quantity',
    'catalog.chip.spotWeld': 'Spot weld',
    'catalog.chip.plugAndPlay': 'Plug & play',
    'catalog.chip.flexProgrammed': 'Flex programmed',
    'catalog.chip.tagOn': 'Tag-on',
    'catalog.loginForPrice': 'Sign in to see prices',
    'catalog.viewCards': 'Cards',
    'catalog.viewList': 'List',
    // PDP
    'pdp.signInForPriceLong': 'Sign in or register your business to see wholesale pricing →',
    'pdp.viewLabel.sku': 'SKU',
    'pdp.relatedTitle.recommended': 'Recommended for you',
    'pdp.relatedTitle.related': 'Related products',
    'pdp.disabled.impersonating': "You can't place orders while impersonating",
    'pdp.disabled.outOfStock': 'Out of stock',
    'pdp.noImage': 'No image',
    'pdp.privateBadge': 'Private product for your organization',
    'pdp.volumePricing': 'Volume pricing',
    'pdp.tierMinQty': 'Min. quantity',
    'pdp.tierUnitPrice': 'Unit price',
    'pdp.requestQuote': 'Request a quote',
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
    'minicart.title': 'Cart',
    'minicart.checkout': 'Checkout',
    'minicart.viewFull': 'View full cart',
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
    // Status badges
    'status.order.PENDING_PAYMENT': 'Pending payment',
    'status.order.PENDING_APPROVAL': 'Pending approval',
    'status.order.CONFIRMED': 'Confirmed',
    'status.order.SHIPPED': 'Shipped',
    'status.order.DELIVERED': 'Delivered',
    'status.order.CANCELLED': 'Cancelled',
    'status.quote.DRAFT': 'Draft',
    'status.quote.SUBMITTED': 'Submitted',
    'status.quote.QUOTED': 'Quoted',
    'status.quote.ACCEPTED': 'Accepted',
    'status.quote.REJECTED': 'Rejected',
    'status.quote.EXPIRED': 'Expired',
    'status.invoice.PENDING': 'Pending',
    'status.invoice.PAID': 'Paid',
    'status.invoice.OVERDUE': 'Overdue',
    'status.invoice.CANCELLED': 'Cancelled',
    'status.approval.PENDING': 'Pending',
    'status.approval.APPROVED': 'Approved',
    'status.approval.REJECTED': 'Rejected',
    'status.payment.PENDING': 'Pending',
    'status.payment.AUTHORIZED': 'Authorized',
    'status.payment.CAPTURED': 'Captured',
    'status.payment.REFUND_PENDING': 'Refund pending',
    'status.payment.REFUNDED': 'Refunded',
    'status.payment.FAILED': 'Failed',
    'status.payment.NEEDS_REVIEW': 'Needs review',
    'approvals.title': 'Approvals',
    'approvals.empty': 'No approvals pending.',
    'notifications.title': 'Notifications',
    'notifications.empty': 'No notifications.',
    'notifications.markAllRead': 'Mark all as read',
    // Admin nav
    'admin.label': 'Admin',
    'admin.platformAdmin': 'Platform admin',
    'admin.dashboard.title': 'Dashboard',
    'admin.dashboard.welcome': 'Welcome back, {email}.',
    'admin.dashboard.pendingQuotes': 'Pending quotes',
    'admin.dashboard.pendingApprovals': 'Pending approvals',
    'admin.dashboard.overdueInvoices': 'Overdue invoices',
    'admin.dashboard.openBalance': 'Open balance (pending + overdue)',
    'admin.dashboard.orgsTitle': 'Your organizations',
    'admin.dashboard.noOrgs': 'No organizations yet.',
    'admin.dashboard.createInSettings': 'Create one in settings',
    // Admin catalog (Fase 1)
    'admin.products.bulkQueued': 'Queued {n} AI content jobs. The worker runs every minute.',
    'admin.products.title': 'Products',
    'admin.products.count': '{count} products registered.',
    'admin.products.newProduct': 'New product',
    'admin.products.f.sku': 'SKU',
    'admin.products.f.slug': 'Slug',
    'admin.products.f.name': 'Name',
    'admin.products.f.basePrice': 'Base price',
    'admin.products.f.stock': 'Initial stock',
    'admin.products.f.imageUrl': 'Image URL (optional)',
    'admin.products.f.category': 'Category',
    'admin.products.f.description': 'Description (markdown, optional)',
    'admin.products.chooseCategory': '— choose —',
    'admin.products.col.sku': 'SKU',
    'admin.products.col.product': 'Product',
    'admin.products.col.category': 'Category',
    'admin.products.col.price': 'Price',
    'admin.products.col.stock': 'Stock',
    'admin.products.col.status': 'Status',
    'admin.products.col.private': 'Private',
    'admin.products.col.action': 'Action',
    'admin.products.active': 'Active',
    'admin.products.inactive': 'Inactive',
    'admin.products.tiers.title': 'Volume discounts',
    'admin.products.tiers.hint':
      'Define quantity tiers. The tier price applies when the ordered quantity is ≥ minQty.',
    'admin.products.tiers.base': 'Base',
    'admin.products.tiers.minQty': 'Min quantity',
    'admin.products.tiers.unitPrice': 'Unit price',
    'admin.products.tiers.minQtyRow': '≥ {n} units',
    'admin.categories.title': 'Categories',
    'admin.categories.count': '{count} categories.',
    'admin.categories.newCategory': 'New category',
    'admin.categories.f.slug': 'Slug',
    'admin.categories.f.name': 'Name',
    'admin.categories.f.sortOrder': 'Order',
    'admin.categories.col.order': 'Order',
    'admin.categories.col.slug': 'Slug',
    'admin.categories.col.name': 'Name',
    'admin.categories.col.status': 'Status',
    'admin.categories.active': 'Active',
    'admin.categories.inactive': 'Inactive',
    'admin.productDetail.flashQueued':
      'AI generation queued (EN + ES). The worker runs every minute.',
    'admin.productDetail.flashPublished': 'Content published for {locale}. Reindex queued.',
    'admin.productDetail.subtitle': 'SKU {sku} · {category}',
    'admin.productDetail.aiContent': 'AI content',
    'admin.productDetail.aiHint':
      'Queues jobs for the supported locales. The worker runs every minute in production.',
    'admin.productDetail.longDescription': 'Long description (markdown)',
    'admin.productDetail.published': 'Published',
    'admin.productDetail.draft': 'Draft',
    // Admin commerce (Fase 2)
    'admin.col.number': 'Number',
    'admin.col.customer': 'Customer',
    'admin.col.date': 'Date',
    'admin.col.created': 'Created',
    'admin.col.total': 'Total',
    'admin.col.status': 'Status',
    'admin.col.sku': 'SKU',
    'admin.col.product': 'Product',
    'admin.col.price': 'Price',
    'admin.col.qty': 'Qty',
    'admin.col.requester': 'Requester',
    'admin.col.amount': 'Amount',
    'admin.col.action': 'Action',
    'admin.col.order': 'Order',
    'admin.col.dueDate': 'Due',
    'admin.col.payment': 'Payment',
    'admin.col.subject': 'Subject',
    'admin.col.threshold': 'Threshold',
    'admin.col.base': 'Base',
    'admin.col.quoted': 'Quoted',
    'admin.orders.title': 'Orders',
    'admin.orders.count': '{count} orders total.',
    'admin.orders.lines': 'Lines',
    'admin.orders.actions': 'Actions',
    'admin.orders.payment': 'Payment',
    'admin.orders.method': 'Method',
    'admin.orders.wireRef': 'Wire reference',
    'admin.orders.subtotal': 'Subtotal',
    'admin.orders.total': 'Total',
    'admin.quotes.title': 'Quotes',
    'admin.quotes.count': '{count} total',
    'admin.quotes.customerNotes': 'Customer notes',
    'admin.quotes.doQuote': 'Quote',
    'admin.quotes.doRevise': 'Revise prices',
    'admin.quotes.lines': 'Lines',
    'admin.quotes.validUntil': 'Valid until',
    'admin.quotes.internalNotes': 'Internal notes',
    'admin.quotes.quotedPriceFor': 'Quoted price for {sku}',
    'admin.invoices.title': 'Invoices',
    'admin.invoices.count': '{count} total',
    'admin.invoices.refPlaceholder': 'Reference',
    'admin.invoices.refAria': 'Payment reference for invoice {number}',
    'admin.approvals.title': 'Approvals',
    'admin.approvals.pendingCount': '{count} pending',
    // Admin customers (Fase 3)
    'admin.customers.title': 'Customers',
    'admin.customers.count': '{count} organizations.',
    'admin.customers.filter.all': 'All',
    'admin.customers.filter.pending': 'Pending',
    'admin.customers.filter.verified': 'Verified',
    'admin.customers.filter.rejected': 'Rejected',
    'admin.customers.col.org': 'Organization',
    'admin.customers.col.slug': 'Slug',
    'admin.customers.col.members': 'Members',
    'admin.customers.col.addresses': 'Addresses',
    'admin.customers.col.submitted': 'Submitted',
    'admin.customers.col.email': 'Email',
    'admin.customers.col.role': 'Role',
    'admin.customers.col.since': 'Since',
    'admin.customers.managePrices': 'Manage prices',
    'admin.customers.members': 'Members',
    'admin.customers.addresses': 'Addresses',
    'admin.customers.noAddresses': 'No addresses.',
    'admin.customers.billing': 'Billing',
    'admin.customers.shipping': 'Shipping',
    'admin.customers.b2bVerification': 'B2B verification',
    'admin.customers.taxExempt': 'Tax exempt',
    'admin.customers.submittedAt': 'Submitted {date}',
    'admin.customers.verifiedOn': 'Verified on {date} · country {country}',
    'admin.customers.rejectionReason': 'Rejection reason:',
    'admin.customers.documents': 'Documents',
    'admin.customers.docType': 'Type',
    'admin.customers.docTypeUsResale': 'US Resale Cert',
    'admin.customers.docTypeForeign': 'Foreign equivalent',
    'admin.customers.countryIso2': 'Country (ISO-2)',
    'admin.customers.certNumber': 'Certificate number',
    'admin.customers.jurisdiction': 'Jurisdiction',
    'admin.customers.file': 'File (PDF / image, max 10 MB)',
    'admin.customers.impersonation': 'Impersonation',
    'admin.customers.reasonOptional': 'Reason (optional)',
    'admin.customers.impersonationPlaceholder': 'Support ticket #...',
    'admin.credit.title': '{org} · Credit & catalog',
    'admin.credit.creditApprovals': 'Credit & approvals',
    'admin.credit.limit': 'Credit limit',
    'admin.credit.limitHint': 'empty = no credit',
    'admin.credit.terms': 'Payment terms',
    'admin.credit.termsPrepaid': 'Prepaid',
    'admin.credit.threshold': 'Approval threshold',
    'admin.credit.thresholdHint': 'empty = no approvals',
    'admin.credit.currentUsage': 'Current usage:',
    'admin.credit.catalogAccess': 'Private catalog access',
    'admin.credit.noGrants': 'No active grants.',
    'admin.credit.grantedProduct': 'Product: {name} ({sku})',
    'admin.credit.grantedCategory': 'Category: {name}',
    'admin.credit.productOneOrOther': 'Product (one or the other)',
    'admin.credit.category': 'Category',
    'admin.prices.title': 'Prices · {org}',
    'admin.prices.hint': 'Set a price override per product. Empty = base price applies.',
    'admin.prices.basePrice': 'Base price',
    'admin.prices.yourPrice': 'Your price',
    // Admin platform (Fase 4)
    'admin.search.title': 'Search',
    'admin.search.subtitle': 'Index queue status. The worker runs every minute in production.',
    'admin.search.statPending': 'Pending',
    'admin.search.statProcessing': 'Processing',
    'admin.search.statDone': 'Done',
    'admin.search.statFailed': 'Failed',
    'admin.search.reindexTitle': 'Reindex all',
    'admin.search.reindexHint':
      'Enqueues an UPSERT per product. The worker processes them gradually.',
    'admin.search.failedTitle': 'Last 20 failed items',
    'admin.search.colAttempts': 'Attempts',
    'admin.search.colError': 'Error',
    'admin.search.noFailed': 'No failed items.',
    'admin.settings.title': 'Settings',
    'admin.settings.createOrg': 'Create organization',
    'admin.settings.namePlaceholder': 'My Repair Shop Co',
    'admin.settings.slugPlaceholder': 'acme-wholesale',
    'admin.settings.invitePlaceholder': 'invitee@company.com',
    'admin.settings.yourOrgs': 'Your organizations',
    'admin.settings.noOrgs': 'No organizations yet.',
    'admin.settings.signedInAs': 'Signed in as {email}',
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
    'auth.toast.resetLinkSent': 'If an account exists for that email, a reset link is on its way.',
    'auth.toast.resetTokenInvalid': 'This reset link is invalid or has expired.',
    'auth.toast.passwordReset': 'Password reset. You are now signed in.',
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
    'admin.toast.wireRefRequired': 'A wire reference is required to mark this invoice paid.',
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
    'email.reset.subject': 'Reset your password',
    'email.reset.heading': 'Reset your password',
    'email.reset.body':
      "We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.",
    // Cart
    'cart.toast.added': 'Added to cart ✓',
    'cart.toast.updated': 'Cart updated.',
    'cart.toast.removed': 'Item removed.',
    'cart.toast.failed': 'Could not update the cart.',
    'cart.toast.insufficientStock': 'Not enough stock for that quantity.',
    'cart.toast.notVerified': 'Your account must be verified to add items.',
    'cart.confirm.remove': 'Remove this item from the cart?',
    // Product CTAs
    'product.add': 'Add',
    'product.unavailable': 'Unavailable',
    'product.adding': 'Adding…',
    // Checkout
    'checkout.toast.orderPlaced': 'Order placed ✓',
    'checkout.toast.failed': 'We could not place the order.',
    'checkout.toast.insufficientStock': 'Not enough stock for one of the items.',
    'checkout.toast.inactive': 'One of the items is no longer available.',
    'checkout.toast.empty': 'Your cart is empty.',
    'checkout.toast.notVerified': 'Your account must be verified to place orders.',
    'checkout.placing': 'Placing order…',
    'reorder.button': 'Reorder',
    'reorder.reason.inactive': 'no longer available',
    'reorder.reason.no_access': 'no longer in your catalog',
    'reorder.reason.out_of_stock': 'out of stock',
    'reorder.notice.nothingAvailable':
      'None of the products in this order are available to reorder.',
    'reorder.toast.added': 'Items added to your cart ✓',
    'reorder.toast.addedSomeSkipped': 'Added to cart. Some items were skipped.',
    'reorder.toast.notFound': 'Order not found.',
    'reorder.toast.notVerified': 'Your account must be verified to reorder.',
    'reorder.toast.failed': 'Could not reorder.',
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
    'header.catalog': 'Catálogo',
    'header.searchPlaceholder': 'Buscar productos…',
    'header.cart': 'Carrito',
    'header.cartItems': 'Carrito, {count} items',
    'header.account': 'Mi cuenta',
    'header.buyAgain': 'Volver a pedir',
    'header.orders': 'Órdenes',
    'header.quotes': 'Cotizaciones',
    'header.invoices': 'Facturas',
    'header.approvals': 'Aprobaciones',
    'header.notifications': 'Notificaciones',
    'header.signIn': 'Iniciar sesión',
    'header.signOut': 'Salir',
    'header.register': 'Registrarse',
    'header.menu': 'Menú',
    'header.close': 'Cerrar',
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
    'auth.brand.cycles': '0 ciclos',
    'auth.field.email': 'Email',
    'auth.field.password': 'Contraseña',
    'auth.field.newPassword': 'Nueva contraseña',
    'auth.field.confirmPassword': 'Confirmar contraseña',
    'auth.invite.notFound.title': 'Invitación no encontrada',
    'auth.invite.notFound.body': 'El link puede ser inválido o haber sido eliminado.',
    'auth.invite.accepted.title': 'Ya aceptada',
    'auth.invite.accepted.body': 'Esta invitación ya fue usada.',
    'auth.invite.expired.title': 'Invitación expirada',
    'auth.invite.expired.body': 'Pedile a quien te invitó que envíe una nueva.',
    'auth.invite.join': 'Unite a {org}',
    'auth.invite.roleHint': 'Te invitaron a unirte como {role}.',
    'auth.invite.accept': 'Aceptar invitación',
    // Forgot password
    'auth.forgot.title': 'Restablecé tu contraseña',
    'auth.forgot.subtitle': 'Ingresá tu email y te enviamos un link para restablecerla.',
    'auth.forgot.submit': 'Enviar link',
    'auth.forgot.sending': 'Enviando…',
    'auth.forgot.backToSignIn': 'Volver a iniciar sesión',
    'auth.forgot.checkInbox':
      'Si existe una cuenta con ese email, te enviamos un link para restablecerla. Revisá tu bandeja.',
    // Reset password
    'auth.reset.title': 'Elegí una contraseña nueva',
    'auth.reset.subtitle':
      'Tu nueva contraseña debe tener al menos 8 caracteres, con una letra y un número.',
    'auth.reset.submit': 'Restablecer contraseña',
    'auth.reset.sending': 'Restableciendo…',
    'auth.reset.invalidTitle': 'Link vencido o inválido',
    'auth.reset.invalidBody': 'Este link de restablecimiento ya no es válido. Pedí uno nuevo.',
    'auth.reset.requestNew': 'Pedir un link nuevo',
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
    // Account hub
    'account.title': 'Cuenta',
    'account.nav.overview': 'Resumen',
    'account.nav.profile': 'Perfil',
    'account.nav.addresses': 'Direcciones',
    'account.nav.security': 'Seguridad',
    // Account overview
    'account.overview.identity': 'Identidad',
    'account.overview.name': 'Nombre',
    'account.overview.email': 'Email',
    'account.overview.locale': 'Idioma',
    'account.overview.edit': 'Editar',
    'account.overview.organization': 'Organización',
    'account.overview.role': 'Rol',
    'account.overview.verification': 'Verificación',
    'account.overview.taxExempt': 'Exento de impuestos',
    'account.overview.paymentTerms': 'Términos de pago',
    'account.overview.credit': 'Límite de crédito',
    'account.overview.switch': 'Cambiar',
    'account.overview.quickAccess': 'Accesos rápidos',
    'account.overview.orders': 'Órdenes',
    'account.overview.invoices': 'Facturas',
    'account.overview.quotes': 'Cotizaciones',
    'account.overview.notSet': 'Sin definir',
    'account.verification.VERIFIED': 'Verificada',
    'account.verification.PENDING': 'Pendiente',
    'account.verification.REJECTED': 'Rechazada',
    'account.locale.en': 'Inglés',
    'account.locale.es': 'Español',
    // Account profile
    'account.profile.subtitle': 'Actualizá tu nombre e idioma.',
    'account.profile.emailHint': 'El email no se cambia desde acá.',
    'account.profile.submit': 'Guardar cambios',
    'account.toast.profileSaved': 'Perfil actualizado.',
    'account.toast.profileInvalid': 'Revisá tu nombre e idioma y volvé a intentar.',
    'account.toast.addressForbidden': 'No tenés permiso para gestionar direcciones.',
    'account.toast.addressInUse': 'Esta dirección la usan órdenes existentes y no se puede borrar.',
    'account.toast.addressInvalid': 'Revisá los campos de la dirección y volvé a intentar.',
    'account.toast.addressSaved': 'Dirección guardada.',
    'account.toast.addressDeleted': 'Dirección borrada.',
    'account.toast.addressDefaultSet': 'Dirección por defecto actualizada.',
    // Account addresses
    'account.addresses.subtitle': 'Direcciones de envío y facturación de tu organización.',
    'account.addresses.add': 'Agregar dirección',
    'account.addresses.edit': 'Editar',
    'account.addresses.delete': 'Borrar',
    'account.addresses.cancel': 'Cancelar',
    'account.addresses.save': 'Guardar dirección',
    'account.addresses.confirmDelete': '¿Borrar esta dirección?',
    'account.addresses.setDefaultBilling': 'Marcar facturación',
    'account.addresses.setDefaultShipping': 'Marcar envío',
    'account.addresses.badgeBilling': 'Facturación por defecto',
    'account.addresses.badgeShipping': 'Envío por defecto',
    'account.addresses.empty': 'Todavía no hay direcciones.',
    'account.addresses.readOnly':
      'Las direcciones las gestionan los owners y admins de la organización.',
    'account.addresses.field.label': 'Etiqueta',
    'account.addresses.field.recipient': 'Destinatario',
    'account.addresses.field.line1': 'Dirección línea 1',
    'account.addresses.field.line2': 'Dirección línea 2',
    'account.addresses.field.city': 'Ciudad',
    'account.addresses.field.state': 'Estado / Provincia',
    'account.addresses.field.postalCode': 'Código postal',
    'account.addresses.field.country': 'País (2 letras)',
    'account.addresses.field.phone': 'Teléfono',
    // Account security
    'account.security.subtitle': 'Gestioná tu contraseña y tus sesiones activas.',
    'account.security.passwordSection': 'Contraseña',
    'account.security.sessionsSection': 'Sesiones',
    'account.security.signOutEverywhere': 'Cerrar sesión en todos lados',
    'account.security.signOutEverywhereHint':
      'Cierra todos los otros dispositivos. Tu sesión actual sigue activa.',
    'account.toast.signedOutEverywhere': 'Cerraste sesión en todas las otras sesiones.',
    // Account orders
    'account.orders.title': 'Tus órdenes',
    'account.orders.empty': 'Aún no hay órdenes en esta organización.',
    'account.orders.linesLabel': 'líneas',
    'account.orders.orderLabel': 'Orden',
    'account.orders.placedBy': 'Colocada por {email}',
    'account.orders.linesSection': 'Líneas',
    'account.orders.col.sku': 'SKU',
    'account.orders.col.product': 'Producto',
    'account.orders.col.price': 'Precio',
    'account.orders.col.qty': 'Cant.',
    'account.orders.col.total': 'Total',
    'account.orders.addresses': 'Direcciones',
    'account.orders.billing': 'Facturación',
    'account.orders.shipping': 'Envío',
    'account.orders.notes': 'Notas',
    'account.orders.subtotal': 'Subtotal',
    'account.orders.total': 'Total',
    'account.orders.payCard': 'Pagar con tarjeta',
    'account.orders.payCardHint':
      'Te redirigimos a Stripe Checkout (hosted). El pago se confirma vía webhook firmado — nunca desde la URL de retorno.',
    'account.orders.payCta': 'Pagar {amount}',
    'account.orders.pp.processingTitle': 'Procesando pago',
    'account.orders.pp.confirmedTitle': '¡Gracias! Pago confirmado',
    'account.orders.pp.confirmedBody':
      'Recibimos la confirmación del procesador. Te enviamos un email con el recibo y los próximos pasos. Pronto verás el tracking del envío acá.',
    'account.orders.pp.processingBody1':
      'Recibimos tu pago en Stripe. Estamos esperando la confirmación firmada del procesador para acreditarlo en tu orden (suele tardar segundos).',
    'account.orders.pp.processingBody2':
      'Podés refrescar esta página o volver al detalle de la orden en cualquier momento.',
    'account.orders.pp.backToOrder': 'Volver al detalle de la orden',
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
    'catalog.stock.inStock': 'En stock',
    'catalog.stock.incoming': 'En camino',
    'catalog.stock.comingSoon': 'Próximamente',
    'catalog.stock.outOfStock': 'Agotado',
    'catalog.notify': 'Avisarme',
    'catalog.qtyDecrease': 'Disminuir cantidad',
    'catalog.qtyIncrease': 'Aumentar cantidad',
    'catalog.chip.spotWeld': 'Soldadura',
    'catalog.chip.plugAndPlay': 'Plug & play',
    'catalog.chip.flexProgrammed': 'Flex programado',
    'catalog.chip.tagOn': 'Tag-on',
    'catalog.loginForPrice': 'Iniciá sesión para ver precios',
    'catalog.viewCards': 'Tarjetas',
    'catalog.viewList': 'Lista',
    // PDP
    'pdp.signInForPriceLong': 'Iniciá sesión o registrá tu negocio para ver precios mayoristas →',
    'pdp.viewLabel.sku': 'SKU',
    'pdp.relatedTitle.recommended': 'Recomendado para ti',
    'pdp.relatedTitle.related': 'Productos relacionados',
    'pdp.disabled.impersonating': 'No puedes colocar órdenes mientras impersonas',
    'pdp.disabled.outOfStock': 'Sin stock',
    'pdp.noImage': 'Sin imagen',
    'pdp.privateBadge': 'Producto privado para tu organización',
    'pdp.volumePricing': 'Descuentos por volumen',
    'pdp.tierMinQty': 'Cantidad mínima',
    'pdp.tierUnitPrice': 'Precio unitario',
    'pdp.requestQuote': 'Solicitar cotización',
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
    'minicart.title': 'Carrito',
    'minicart.checkout': 'Checkout',
    'minicart.viewFull': 'Ver carrito completo',
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
    // Status badges
    'status.order.PENDING_PAYMENT': 'Pago pendiente',
    'status.order.PENDING_APPROVAL': 'Aprobación pendiente',
    'status.order.CONFIRMED': 'Confirmada',
    'status.order.SHIPPED': 'Enviada',
    'status.order.DELIVERED': 'Entregada',
    'status.order.CANCELLED': 'Cancelada',
    'status.quote.DRAFT': 'Borrador',
    'status.quote.SUBMITTED': 'Enviada',
    'status.quote.QUOTED': 'Cotizada',
    'status.quote.ACCEPTED': 'Aceptada',
    'status.quote.REJECTED': 'Rechazada',
    'status.quote.EXPIRED': 'Vencida',
    'status.invoice.PENDING': 'Pendiente',
    'status.invoice.PAID': 'Pagada',
    'status.invoice.OVERDUE': 'Vencida',
    'status.invoice.CANCELLED': 'Cancelada',
    'status.approval.PENDING': 'Pendiente',
    'status.approval.APPROVED': 'Aprobada',
    'status.approval.REJECTED': 'Rechazada',
    'status.payment.PENDING': 'Pendiente',
    'status.payment.AUTHORIZED': 'Autorizado',
    'status.payment.CAPTURED': 'Cobrado',
    'status.payment.REFUND_PENDING': 'Reembolso pendiente',
    'status.payment.REFUNDED': 'Reembolsado',
    'status.payment.FAILED': 'Fallido',
    'status.payment.NEEDS_REVIEW': 'Requiere revisión',
    'approvals.title': 'Aprobaciones',
    'approvals.empty': 'No hay aprobaciones pendientes.',
    'notifications.title': 'Notificaciones',
    'notifications.empty': 'No hay notificaciones.',
    'notifications.markAllRead': 'Marcar todo como leído',
    // Admin nav
    'admin.label': 'Admin',
    'admin.platformAdmin': 'Platform admin',
    'admin.dashboard.title': 'Dashboard',
    'admin.dashboard.welcome': 'Hola de nuevo, {email}.',
    'admin.dashboard.pendingQuotes': 'Cotizaciones pendientes',
    'admin.dashboard.pendingApprovals': 'Aprobaciones pendientes',
    'admin.dashboard.overdueInvoices': 'Facturas vencidas',
    'admin.dashboard.openBalance': 'Saldo abierto (pendiente + vencido)',
    'admin.dashboard.orgsTitle': 'Tus organizaciones',
    'admin.dashboard.noOrgs': 'Todavía no hay organizaciones.',
    'admin.dashboard.createInSettings': 'Creá una en settings',
    // Admin catalog (Fase 1)
    'admin.products.bulkQueued':
      'Encolados {n} jobs de generación AI. El worker procesa cada minuto.',
    'admin.products.title': 'Productos',
    'admin.products.count': '{count} productos registrados.',
    'admin.products.newProduct': 'Nuevo producto',
    'admin.products.f.sku': 'SKU',
    'admin.products.f.slug': 'Slug',
    'admin.products.f.name': 'Nombre',
    'admin.products.f.basePrice': 'Precio base',
    'admin.products.f.stock': 'Stock inicial',
    'admin.products.f.imageUrl': 'URL imagen (opcional)',
    'admin.products.f.category': 'Categoría',
    'admin.products.f.description': 'Descripción (markdown, opcional)',
    'admin.products.chooseCategory': '— elegir —',
    'admin.products.col.sku': 'SKU',
    'admin.products.col.product': 'Producto',
    'admin.products.col.category': 'Categoría',
    'admin.products.col.price': 'Precio',
    'admin.products.col.stock': 'Stock',
    'admin.products.col.status': 'Estado',
    'admin.products.col.private': 'Privado',
    'admin.products.col.action': 'Acción',
    'admin.products.active': 'Activo',
    'admin.products.inactive': 'Inactivo',
    'admin.products.tiers.title': 'Descuentos por volumen',
    'admin.products.tiers.hint':
      'Definí tramos por cantidad. El precio del tramo aplica cuando la cantidad pedida es ≥ minQty.',
    'admin.products.tiers.base': 'Base',
    'admin.products.tiers.minQty': 'Cantidad mínima',
    'admin.products.tiers.unitPrice': 'Precio unitario',
    'admin.products.tiers.minQtyRow': '≥ {n} uds',
    'admin.categories.title': 'Categorías',
    'admin.categories.count': '{count} categorías.',
    'admin.categories.newCategory': 'Nueva categoría',
    'admin.categories.f.slug': 'Slug',
    'admin.categories.f.name': 'Nombre',
    'admin.categories.f.sortOrder': 'Orden',
    'admin.categories.col.order': 'Orden',
    'admin.categories.col.slug': 'Slug',
    'admin.categories.col.name': 'Nombre',
    'admin.categories.col.status': 'Estado',
    'admin.categories.active': 'Activa',
    'admin.categories.inactive': 'Inactiva',
    'admin.productDetail.flashQueued':
      'Generación AI encolada (EN + ES). El worker procesa cada minuto.',
    'admin.productDetail.flashPublished': 'Contenido publicado para {locale}. Reindex en cola.',
    'admin.productDetail.subtitle': 'SKU {sku} · {category}',
    'admin.productDetail.aiContent': 'Contenido AI',
    'admin.productDetail.aiHint':
      'Encola jobs para los locales soportados. El worker corre cada minuto en producción.',
    'admin.productDetail.longDescription': 'Descripción larga (markdown)',
    'admin.productDetail.published': 'Publicado',
    'admin.productDetail.draft': 'Borrador',
    // Admin commerce (Fase 2)
    'admin.col.number': 'Número',
    'admin.col.customer': 'Cliente',
    'admin.col.date': 'Fecha',
    'admin.col.created': 'Creada',
    'admin.col.total': 'Total',
    'admin.col.status': 'Estado',
    'admin.col.sku': 'SKU',
    'admin.col.product': 'Producto',
    'admin.col.price': 'Precio',
    'admin.col.qty': 'Cant.',
    'admin.col.requester': 'Solicitante',
    'admin.col.amount': 'Monto',
    'admin.col.action': 'Acción',
    'admin.col.order': 'Orden',
    'admin.col.dueDate': 'Vence',
    'admin.col.payment': 'Pago',
    'admin.col.subject': 'Subject',
    'admin.col.threshold': 'Threshold',
    'admin.col.base': 'Base',
    'admin.col.quoted': 'Cotizado',
    'admin.orders.title': 'Órdenes',
    'admin.orders.count': '{count} órdenes total.',
    'admin.orders.lines': 'Líneas',
    'admin.orders.actions': 'Acciones',
    'admin.orders.payment': 'Pago',
    'admin.orders.method': 'Método',
    'admin.orders.wireRef': 'Referencia wire',
    'admin.orders.subtotal': 'Subtotal',
    'admin.orders.total': 'Total',
    'admin.quotes.title': 'Cotizaciones',
    'admin.quotes.count': '{count} total',
    'admin.quotes.customerNotes': 'Notas del cliente',
    'admin.quotes.doQuote': 'Cotizar',
    'admin.quotes.doRevise': 'Revisar precios',
    'admin.quotes.lines': 'Líneas',
    'admin.quotes.validUntil': 'Válida hasta',
    'admin.quotes.internalNotes': 'Notas internas',
    'admin.quotes.quotedPriceFor': 'Precio cotizado para {sku}',
    'admin.invoices.title': 'Facturas',
    'admin.invoices.count': '{count} total',
    'admin.invoices.refPlaceholder': 'Referencia',
    'admin.invoices.refAria': 'Referencia de pago para factura {number}',
    'admin.approvals.title': 'Aprobaciones',
    'admin.approvals.pendingCount': '{count} pendientes',
    // Admin customers (Fase 3)
    'admin.customers.title': 'Clientes',
    'admin.customers.count': '{count} organizaciones.',
    'admin.customers.filter.all': 'Todos',
    'admin.customers.filter.pending': 'Pendientes',
    'admin.customers.filter.verified': 'Verificados',
    'admin.customers.filter.rejected': 'Rechazados',
    'admin.customers.col.org': 'Organización',
    'admin.customers.col.slug': 'Slug',
    'admin.customers.col.members': 'Miembros',
    'admin.customers.col.addresses': 'Direcciones',
    'admin.customers.col.submitted': 'Enviada',
    'admin.customers.col.email': 'Email',
    'admin.customers.col.role': 'Rol',
    'admin.customers.col.since': 'Desde',
    'admin.customers.managePrices': 'Gestionar precios',
    'admin.customers.members': 'Miembros',
    'admin.customers.addresses': 'Direcciones',
    'admin.customers.noAddresses': 'Sin direcciones.',
    'admin.customers.billing': 'Facturación',
    'admin.customers.shipping': 'Envío',
    'admin.customers.b2bVerification': 'Verificación B2B',
    'admin.customers.taxExempt': 'Exento de impuestos',
    'admin.customers.submittedAt': 'Enviada {date}',
    'admin.customers.verifiedOn': 'Verificada el {date} · país {country}',
    'admin.customers.rejectionReason': 'Motivo de rechazo:',
    'admin.customers.documents': 'Documentos',
    'admin.customers.docType': 'Tipo',
    'admin.customers.docTypeUsResale': 'US Resale Cert',
    'admin.customers.docTypeForeign': 'Equivalente extranjero',
    'admin.customers.countryIso2': 'País (ISO-2)',
    'admin.customers.certNumber': 'Número del certificado',
    'admin.customers.jurisdiction': 'Jurisdicción',
    'admin.customers.file': 'Archivo (PDF / imagen, máx 10 MB)',
    'admin.customers.impersonation': 'Impersonation',
    'admin.customers.reasonOptional': 'Motivo (opcional)',
    'admin.customers.impersonationPlaceholder': 'Soporte ticket #...',
    'admin.credit.title': '{org} · Crédito y catálogo',
    'admin.credit.creditApprovals': 'Crédito y aprobaciones',
    'admin.credit.limit': 'Límite de crédito',
    'admin.credit.limitHint': 'vacío = sin crédito',
    'admin.credit.terms': 'Términos de pago',
    'admin.credit.termsPrepaid': 'Prepago',
    'admin.credit.threshold': 'Umbral de aprobación',
    'admin.credit.thresholdHint': 'vacío = sin aprobaciones',
    'admin.credit.currentUsage': 'Uso actual:',
    'admin.credit.catalogAccess': 'Acceso a catálogo privado',
    'admin.credit.noGrants': 'Sin grants activos.',
    'admin.credit.grantedProduct': 'Producto: {name} ({sku})',
    'admin.credit.grantedCategory': 'Categoría: {name}',
    'admin.credit.productOneOrOther': 'Producto (uno u otro)',
    'admin.credit.category': 'Categoría',
    'admin.prices.title': 'Precios · {org}',
    'admin.prices.hint': 'Definí un precio override por producto. Vacío = aplica el precio base.',
    'admin.prices.basePrice': 'Precio base',
    'admin.prices.yourPrice': 'Tu precio',
    // Admin platform (Fase 4)
    'admin.search.title': 'Búsqueda',
    'admin.search.subtitle':
      'Estado de la cola de indexación. El worker corre cada minuto en producción.',
    'admin.search.statPending': 'Pendientes',
    'admin.search.statProcessing': 'Procesando',
    'admin.search.statDone': 'Hechas',
    'admin.search.statFailed': 'Fallidas',
    'admin.search.reindexTitle': 'Reindexar todo',
    'admin.search.reindexHint':
      'Encola un UPSERT por cada producto. El worker los procesa gradualmente.',
    'admin.search.failedTitle': 'Últimos 20 ítems fallidos',
    'admin.search.colAttempts': 'Intentos',
    'admin.search.colError': 'Error',
    'admin.search.noFailed': 'Sin ítems fallidos.',
    'admin.settings.title': 'Settings',
    'admin.settings.createOrg': 'Crear organización',
    'admin.settings.namePlaceholder': 'My Repair Shop Co',
    'admin.settings.slugPlaceholder': 'acme-wholesale',
    'admin.settings.invitePlaceholder': 'invitee@company.com',
    'admin.settings.yourOrgs': 'Tus organizaciones',
    'admin.settings.noOrgs': 'Todavía no hay organizaciones.',
    'admin.settings.signedInAs': 'Sesión de {email}',
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
    'auth.toast.resetLinkSent':
      'Si existe una cuenta con ese email, te enviamos un link para restablecerla.',
    'auth.toast.resetTokenInvalid': 'Este link de restablecimiento es inválido o ya venció.',
    'auth.toast.passwordReset': 'Contraseña restablecida. Ya iniciaste sesión.',
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
    'admin.toast.wireRefRequired':
      'Se requiere la referencia de la transferencia para marcar la factura pagada.',
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
    'email.reset.subject': 'Restablecé tu contraseña',
    'email.reset.heading': 'Restablecé tu contraseña',
    'email.reset.body':
      'Recibimos una solicitud para restablecer tu contraseña. Tocá el botón de abajo para elegir una nueva. Este link vence en 1 hora. Si no lo pediste, podés ignorar este email.',
    // Cart
    'cart.toast.added': 'Agregado al carrito ✓',
    'cart.toast.updated': 'Carrito actualizado.',
    'cart.toast.removed': 'Item eliminado.',
    'cart.toast.failed': 'No pudimos actualizar el carrito.',
    'cart.toast.insufficientStock': 'No hay stock suficiente para esa cantidad.',
    'cart.toast.notVerified': 'Tu cuenta debe estar verificada para agregar items.',
    'cart.confirm.remove': '¿Quitar este item del carrito?',
    // Product CTAs
    'product.add': 'Agregar',
    'product.unavailable': 'No disponible',
    'product.adding': 'Agregando…',
    // Checkout
    'checkout.toast.orderPlaced': 'Orden colocada ✓',
    'checkout.toast.failed': 'No pudimos colocar la orden.',
    'checkout.toast.insufficientStock': 'No hay stock suficiente para uno de los items.',
    'checkout.toast.inactive': 'Uno de los items ya no está disponible.',
    'checkout.toast.empty': 'Tu carrito está vacío.',
    'checkout.toast.notVerified': 'Tu cuenta debe estar verificada para colocar órdenes.',
    'checkout.placing': 'Colocando orden…',
    'reorder.button': 'Volver a pedir',
    'reorder.reason.inactive': 'ya no disponible',
    'reorder.reason.no_access': 'ya no está en tu catálogo',
    'reorder.reason.out_of_stock': 'sin stock',
    'reorder.notice.nothingAvailable':
      'Ninguno de los productos de este pedido está disponible para re-pedir.',
    'reorder.toast.added': 'Items agregados a tu carrito ✓',
    'reorder.toast.addedSomeSkipped': 'Agregado al carrito. Algunos items se omitieron.',
    'reorder.toast.notFound': 'Pedido no encontrado.',
    'reorder.toast.notVerified': 'Tu cuenta debe estar verificada para re-pedir.',
    'reorder.toast.failed': 'No pudimos re-pedir.',
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
