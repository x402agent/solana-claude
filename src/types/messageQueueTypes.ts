/**
 * Message queue operation types.
 * Stub — provides the shapes needed by messageQueueManager and sessionStorage.
 */

export type QueueOperation =
  | 'enqueue'
  | 'dequeue'
  | 'clear'
  | 'reorder'
  | string

export interface QueueOperationMessage {
  type: 'queue-operation'
  operation: QueueOperation
  timestamp: string
  sessionId: string
  content?: string
  [key: string]: unknown
}
