export interface UserChatModel {
  chatId: number;
  address?: string;
  isAwaitingAddress: boolean;
  hasEnteredAddress: boolean;
}