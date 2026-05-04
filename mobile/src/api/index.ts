/**
 * API index file
 * Export all API clients from this file
 */

export { XanderApi, xanderApi } from './xanderApi';
export type {
  // Core types
  Message,
  Session,
  SendMessageResponse,
  DispatchRequest,
  DispatchResponse,
  // Legacy types (for backward compatibility)
  XanderMessage,
  XanderSession,
  XanderResponse,
  XanderApiConfig,
  XanderApiError,
} from './xanderApi';
