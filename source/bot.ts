import grammy from 'grammy';
import user from './model/user.js';

const bot = new grammy.Bot("5991825741:AAHV84uI9UhoX6AA3mCoCHwhMmzl_fhwbSs");

const users: user[] = [];

//!----------------------commands----------------------!//

bot.command("start", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (!userObj) {
        ctx.reply("Welcome.please enter your login token:");
        const newUser = new user(ctx.chat.id);
        users.push(newUser);
    } else if (!userObj.token) {
        ctx.reply("Please enter your token:");
    } else if (userObj.token) {
        ctx.reply("You have loged in");
    }
});

bot.command("status", (ctx) => {
    if (getChatObject(ctx.chat.id)) {
        ctx.reply("Ok");
    } else {
        ctx.reply("You should send your login token first.click /start");
    }
});

//!----------------------events----------------------!//

bot.on("message", (ctx) => {
    const user = getChatObject(ctx.chat.id);
    if (user && !user.token && ctx.message.text) {
        user.token = ctx.message.text;
    }
});

//!----------------------functions----------------------!//

function getChatObject(chatId: number): user | void {
    for (let value of users) {
        if (value.chatId == chatId) {
            return value;
        }
    }
}

//!----------------------launch----------------------!//

bot.start();