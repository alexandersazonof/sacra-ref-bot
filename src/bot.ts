import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import { isEthereumAddress } from './utils/eth-utils';
import { getUsers, getUsersByRefCode } from './graphql/graph-service';
import { addUserChat, deleteUserChatByChatId, getUserChatByChatId, updateUserChat } from './db/user-chat.db';

dotenv.config();

const IMAGE_LINK = 'https://ibb.co/mCNswNx'
const LINK = process.env.SACRA_LINK  || 'https://sacra.game/';
const GUIDE_LINK = process.env.SACRA_GUIDE_LINK || 'https://docs.google.com/document/d/1vXL50i3T_SWwOxAWCEv16QPJFYlEhvMZk3_z30cf-34/edit';
const TOKEN: string = process.env.SACRA_TELEGRAM_BOT_TOKEN || '';
const AMOUNT = '10';

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, async msg => {
  const chatId = msg.chat.id;
  bot.sendPhoto(chatId, IMAGE_LINK, {
    caption:`Hello @${msg.chat.username} 🔥\n` +
      "Welcome to Sacra - the first fully on-chain RPG game. \n" +
      `🤑With this bot you can get heroes with which you will earn your ${AMOUNT}$ when you launch Sacra!\n` +
      "Let's go?\n" +
      "Enter /go\n"
  })
});

bot.onText(/\/go/, async msg => {
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
    bot.sendMessage(chatId,
      'Send your crypto wallet address to start💰');
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
  bot.sendMessage(chatId, 'Menu:', {
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
  deleteMessage(chatId, messageId);
});

function getHeroes(chatId: number) {
  bot.sendMessage(chatId,
    "Complete tasks in the game and get your heroes🧟‍♀️\n" +
    "You can get 8 heroes!\n" +
    "\n" +
    "🔅Completed the first biome \n" +
    "🔅Defeat the Second Boss \n" +
    "🔅Overcome the Third Boss\n" +
    "🔅Victory over the Fourth Boss \n" +
    "\n" +
    `Go - ${LINK}`);
}

async function yourArmy(chatId: number) {
  const userChat = await getUserChatByChatId(chatId);
  if (userChat && userChat.address) {
    const refUsers = await getUsersByRefCode(userChat.address);
    bot.sendMessage(chatId, `
🔗 *Ref link:* ${LINK}?refCode=${userChat.address}&utm_id=ref_bot
👫 *Invite a friend using your link* and get 🦸‍♂️ 1 hero for every 2 friends who have completed level 5.
📖 *Guide:* [What needs to be done](${GUIDE_LINK})

🛡 *Your army stats:*
- You have 🧑‍🤝‍🧑 ${refUsers.length} users in your army.
- 🎖 Only ${refUsers.filter(user => user.heroes.filter(hero => hero.stats.level >= 5).length > 0).length} users got level 5 heroes.

The more friends you invite, the more ${AMOUNT}$ are waiting for you in the game!
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

    let refUserRecords: Record<string, number> = {};

    for (const user of users) {
      for (const hero of user.heroes) {
        if (hero.refCode) {
          if (!refUserRecords[hero.refCode]) {
            refUserRecords[hero.refCode] = 0;
          }
          refUserRecords[hero.refCode]++;
        }
      }
    }

    refUserRecords = Object.fromEntries(
      Object.entries(refUserRecords).sort(([,a],[,b]) => b - a)
    );

    for (const [index, [refCode, count]] of Object.entries(Object.entries(refUserRecords))) {
      messageText += `*${parseInt(index) + 1}.* ${refCode} - ${count} player\n`;
    }

    const currentUserIndex = Object.keys(refUserRecords).findIndex(refCode => refCode.toLowerCase() === userChat.address?.toLowerCase() || '');
    if (currentUserIndex > 49) {
      const currentUser = users[currentUserIndex];
      messageText += `\nYour position: *${currentUserIndex + 1}* (${currentUser.id} - ${currentUser.heroes.filter(hero => !!hero.refCode).length} player)`;
    }

    bot.sendMessage(chatId, messageText, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(chatId, "❌ Can not find your address. Please enter your Ethereum address again.");
  }
}

function rules(chatId: number) {
  bot.sendMessage(chatId,
    `To get heroes, complete tasks in the game:
⚜️Completed the first biome = 1 hero
⚜️Defeat the Second Boss = 1 hero
⚜️Overcome the Third Boss = 2 heroes
⚜️Victory over the Fourth Boss = 4 heroes
You can get 8 heroes!

👫Referral program. For every 2 friends who upgrade their hero to level 5, you will receive 1 hero!

You can claim your heroes in the [Sacra](${LINK}) game.`, { parse_mode: "Markdown" }
  );
}

async function exit(chatId: number) {
  await deleteUserChatByChatId(chatId);
  bot.sendMessage(chatId, "You have exited the game. Please enter /start to start again.");
}

function deleteMessage(chatId: number, messageId: number): void {
  bot.deleteMessage(chatId, messageId).then(success => {
    if (success) {
      console.log('Message deleted successfully');
    } else {
      console.log('Failed to delete the message');
    }
  }).catch(err => {
    console.error('Error in deleting message:', err);
  });
}

