export type ActivityType =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_RESET'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  message: string;
  actor?: string;
  timestamp: number;
}
