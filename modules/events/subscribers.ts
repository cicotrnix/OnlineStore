// Barrel de registro boot-time. Los cortes registran acá sus suscriptores.
import { accountingSubscriber } from '@/modules/accounting'
import { emailSubscriber } from '@/modules/notifications'
import { registerSubscriber } from './registry'

registerSubscriber(accountingSubscriber)
registerSubscriber(emailSubscriber)
