import type { OperationRecordProps } from '@/domain/operations/OperationRecord';
import type { NotificationSettings } from '@/domain/settings/NotificationSettings';

type CatalystApi = Window['catalyst'];

export class ControlRoomService {
  private readonly api?: CatalystApi;

  public constructor(api?: CatalystApi) {
    this.api = api;
  }

  public async listOperations(): Promise<OperationRecordProps[]> {
    if (!this.api?.operationsList) {
      throw new Error('Electron operation bridge unavailable');
    }
    const response = await this.api.operationsList();
    return response.operations;
  }

  public async createOperation(input: Partial<OperationRecordProps>): Promise<OperationRecordProps[]> {
    if (!this.api?.operationsCreate) {
      throw new Error('Electron operation bridge unavailable');
    }
    const response = await this.api.operationsCreate(input);
    return response.operations;
  }

  public async getNotifications(): Promise<NotificationSettings> {
    if (!this.api?.notificationsGet) {
      throw new Error('Electron notification bridge unavailable');
    }
    const response = await this.api.notificationsGet();
    return response.notifications;
  }

  public async updateNotifications(
    patch: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    if (!this.api?.notificationsUpdate) {
      throw new Error('Electron notification bridge unavailable');
    }
    const response = await this.api.notificationsUpdate(patch);
    return response.notifications;
  }
}
