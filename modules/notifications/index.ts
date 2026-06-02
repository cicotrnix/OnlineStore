export {
  countUnread,
  dispatch,
  listForUser,
  markAllAsRead,
  markAsRead,
  retryFailedEmails,
} from './service'
export type { DispatchInput } from './service'
export { emailSubscriber } from './email-subscriber'
