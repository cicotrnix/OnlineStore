// Barrel de registro boot-time. Los cortes registran acá sus suscriptores.
import { accountingSubscriber } from '@/modules/accounting'
import { registerSubscriber } from './registry'

registerSubscriber(accountingSubscriber)
