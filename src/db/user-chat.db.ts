import { knex as knexFactory } from 'knex';
import { UserChatModel } from '../models/user-chat.model';
import knexConfig from '../../knex-config';

// production, staging
const env = process.env.APP_ENV || 'staging';
const knex = knexFactory(knexConfig[env]);

const USER_CHART_TABLE = 'users_chat';

export const addUserChat = async (userChat: UserChatModel): Promise<void> => {
  await knex(USER_CHART_TABLE).insert(userChat);
};

export const updateUserChat = async (chatId: number, userChat: UserChatModel): Promise<void> => {
  await knex(USER_CHART_TABLE).where({ chatId }).update(userChat);
}

export const getUserChatByChatId = async (chatId: number): Promise<UserChatModel | undefined> => {
  const result = await knex(USER_CHART_TABLE).where({ chatId }).first();
  return result;
};

export const deleteUserChatByChatId = async (chatId: number): Promise<void> => {
  await knex(USER_CHART_TABLE).where({ chatId }).del();
};