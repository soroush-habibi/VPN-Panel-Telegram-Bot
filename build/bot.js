import grammy from 'grammy';
import user from './model/user.js';
import db from './model/db.js';
const bot = new grammy.Bot("5991825741:AAGzDG7sIV90vU_5vNSVmh0506gO8lNz53I");
const users = [];
//!----------------------keyboards----------------------!//
const customKeyboard = new grammy.Keyboard()
    .text("status")
    .persistent()
    .resized();
//!----------------------middlewares----------------------!//
bot.use((ctx, next) => {
    db.connect(async (client) => {
        await next();
        client.close();
    });
});
//!----------------------commands----------------------!//
bot.command("start", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (!userObj) {
        ctx.reply("Welcome.please enter your login token:");
        const newUser = new user(ctx.chat.id);
        users.push(newUser);
    }
    else if (!userObj.token) {
        ctx.reply("Please enter your token:");
    }
    else if (userObj.token) {
        ctx.reply("You have loged in", { reply_markup: customKeyboard });
    }
});
bot.hears("status", (ctx) => {
    if (getChatObject(ctx.chat.id)) {
        ctx.reply("Ok");
    }
    else {
        ctx.reply("You should send your login token first.click /start");
    }
});
//!----------------------events----------------------!//
bot.on("message", (ctx) => {
    const user = getChatObject(ctx.chat.id);
    if (user && !user.token && ctx.message.text) {
        ctx.reply("done!", { reply_markup: customKeyboard });
        user.token = ctx.message.text;
    }
});
//!----------------------functions----------------------!//
function getChatObject(chatId) {
    for (let value of users) {
        if (value.chatId == chatId) {
            return value;
        }
    }
}
//!----------------------launch----------------------!//
bot.start();
