import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import { isEthereumAddress } from './utils/eth-utils';
import { getUsers, getUsersByRefCode } from './graphql/graph-service';
import { addUserChat, deleteUserChatByChatId, getUserChatByChatId, updateUserChat } from './db/user-chat.db';

dotenv.config();

const LINK = process.env.SACRA_LINK  || 'https://sonic-beta.sacra.cc/';
const GUIDE_LINK = process.env.SACRA_GUIDE_LINK || 'https://docs.sacra.cc/sacra-whitepaper/';
const TOKEN: string = process.env.SACRA_TELEGRAM_BOT_TOKEN || '';

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, async msg => {
  const chatId = msg.chat.id;
  const userChat = await getUserChatByChatId(chatId);
  if (userChat && userChat.address) {
    bot.sendMessage(chatId, "You have already started the game. Please choose an option from /menu and exit");
  } else {
    const newUserChat = {
      chatId,
      address: undefined,
      isAwaitingAddress: true,
      hasEnteredAddress: false
    };
    if (!userChat) {
      await addUserChat(newUserChat);
    } else {
      await updateUserChat(chatId, newUserChat);
    }
    bot.sendMessage(chatId, "Welcome to the game! Please send you address to start playing");
  }
});

bot.on('message', async msg => {
  const chatId = msg.chat.id;
  console.log(`chatId : ${chatId} - message : ${msg.text} - from : ${msg.from?.username} - ${msg.from?.first_name} ${msg.from?.last_name} - ${msg.from?.id}`);
  // skip command
  if ((msg.text || '').startsWith('/')) {
    return;
  }
  const userChat = await getUserChatByChatId(chatId);

  if (!userChat) {
    bot.sendMessage(chatId, "Please start the bot by sending /start");
  } else if (userChat && userChat.isAwaitingAddress) {
    const address = msg.text || '';
    if (isEthereumAddress(address)) {
      console.log(`Valid Ethereum address received: ${address}`);
      userChat.address = address;
      userChat.isAwaitingAddress = false;
      userChat.hasEnteredAddress = true;
      await updateUserChat(chatId, userChat);
      mainMenu(chatId);
    } else {
      bot.sendMessage(chatId, "It seems like the address you've entered is not a valid address. Please try again.");
    }
  } else {
    bot.sendMessage(chatId, "Please choose an option from /menu")
  }
});


bot.onText(/\/menu/, async msg => {
  const chatId = msg.chat.id;
  const userChat = await getUserChatByChatId(chatId)
  if (userChat && userChat.hasEnteredAddress) {
    mainMenu(chatId);
  } else {
    bot.sendMessage(chatId, "Please enter your Ethereum address first by sending it to me.");
  }
});

function mainMenu(chatId: number) {
  bot.sendMessage(chatId, "Menu:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Get your heroes", callback_data: "get_heroes" }],
        [{ text: "Your army", callback_data: "your_army" }],
        [{ text: "Rules", callback_data: "rules" }],
        [{ text: "Leaderboard", callback_data: "leaderboard" }],
        [{ text: "Exit/Change address", callback_data: "exit" }]
      ]
    }
  });
}

bot.on("callback_query", async query => {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;

  if (!chatId || !messageId) return;

  switch (query.data) {
    case "get_heroes":
      getHeroes(chatId);
      break;
    case "your_army":
      await yourArmy(chatId);
      break;
    case "rules":
      rules(chatId);
      break;
    case "leaderboard":
      await getLeaderboard(chatId);
      break;
    case "exit":
      exit(chatId);
      break;
    default:
      mainMenu(chatId);
  }

  bot.editMessageReplyMarkup({inline_keyboard: []}, {
    chat_id: chatId,
    message_id: messageId
  });
});

function getHeroes(chatId: number) {
  bot.sendMessage(chatId, "- Сompleted the first biome? So you got 1 hero + link claim\n" +
    "\n" +
    " - Defeat the Second Boss? Another hero for you.\n" +
    "\n" +
    " - You overcome the Third Boss? Catch 2 heroes.\n" +
    "\n" +
    " - You are lucky - victory over the Fourth Boss! You got 4 heroes.");
}

async function yourArmy(chatId: number) {
  const userChat = await getUserChatByChatId(chatId);
  if (userChat && userChat.address) {
    const refUsers = await getUsersByRefCode(userChat.address);
    bot.sendMessage(chatId, `
🔗 *Ref link:* ${LINK}?refCode=${userChat.address} 
👫 *Invite a friend using your link* and get 🦸‍♂️ 1 hero for every 2 friends who have completed level 5.
📖 *Guide:* [What needs to be done](${GUIDE_LINK})

🛡 *Your army stats:*
- You have 🧑‍🤝‍🧑 ${refUsers.length} users in your army.
- 🎖 Only ${refUsers.filter(user => user.heroes.filter(hero => hero.stats.level >= 5).length > 0).length} users got level 5 heroes.

Remember, the more friends you invite, the stronger your army becomes!
    `, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(chatId, "❌ Can not find your address. Please enter your Ethereum address again.");
  }
}

async function getLeaderboard(chatId: number) {
  const userChat = await getUserChatByChatId(chatId);
  if (userChat && userChat.address) {
    const users = await getUsers();
    let messageText = "🏆 *Leaderboard*\n\n";

    users.slice(0, 50).forEach((user, index) => {
      messageText += `*${index + 1}.* ${user.id} - ${user.heroes.filter(hero => !!hero.refCode).length} armies\n`;
    });

    const currentUserIndex = users.findIndex(user => user.id === userChat.address);
    if (currentUserIndex > 49) {
      const currentUser = users[currentUserIndex];
      messageText += `\nYour position: *${currentUserIndex + 1}* (${currentUser.id} - ${currentUser.heroes.filter(hero => !!hero.refCode).length} armies)`;
    }

    bot.sendMessage(chatId, messageText, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(chatId, "❌ Can not find your address. Please enter your Ethereum address again.");
  }
}

function rules(chatId: number) {
  bot.sendMessage(chatId, "Rules");
}

async function exit(chatId: number) {
  await deleteUserChatByChatId(chatId);
  bot.sendMessage(chatId, "You have exited the game. Please enter /start to start again.");
}