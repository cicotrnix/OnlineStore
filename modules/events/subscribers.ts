// Barrel de registro boot-time. Los cortes registran acá sus suscriptores.
import { accountingSubscriber } from '@/modules/accounting'
import { analyticsSubscriber } from '@/modules/analytics'
import { emailSubscriber } from '@/modules/notifications'
import { registerSubscriber } from './registry'

registerSubscriber(accountingSubscriber)
registerSubscriber(emailSubscriber)
registerSubscriber(analyticsSubscriber)
