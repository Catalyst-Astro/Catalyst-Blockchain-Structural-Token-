export interface NotificationSettings {
  emailEnabled: boolean;
  slackEnabled: boolean;
  slackWebhookUrl: string;
}

export const defaultNotificationSettings: NotificationSettings = {
  emailEnabled: false,
  slackEnabled: false,
  slackWebhookUrl: ''
};
