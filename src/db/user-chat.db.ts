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
  try {
    await knex(USER_CHART_TABLE).where({ chatId }).update(userChat);
  } catch (e) {
    console.error(e);
  }
}

export const getUserChatByChatId = async (chatId: number): Promise<UserChatModel | undefined> => {
  try {
    const result = await knex(USER_CHART_TABLE).where({ chatId }).first();
    return result;
  } catch (e) {
    console.error(e);
  }
};

export const deleteUserChatByChatId = async (chatId: number): Promise<void> => {
  try {
    await knex(USER_CHART_TABLE).where({ chatId }).delete();
  } catch (e) {
    console.error(e);
  }
};