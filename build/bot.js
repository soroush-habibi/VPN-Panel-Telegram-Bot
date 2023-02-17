import grammy from 'grammy';
import qrImage from 'qr-image';
import user from './model/user.js';
import db from './model/db.js';
const bot = new grammy.Bot("5991825741:AAGzDG7sIV90vU_5vNSVmh0506gO8lNz53I");
const users = [];
//!----------------------keyboards----------------------!//
const customKeyboard = new grammy.Keyboard()
    .text("get config")
    .text("server status").row()
    .text("profile")
    .text("guide").row()
    .text("support")
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
        ctx.reply("Welcome please enter your login token:", { reply_markup: { remove_keyboard: true } });
        const newUser = new user(ctx.chat.id);
        users.push(newUser);
    }
    else if (!userObj.token) {
        ctx.reply("Please enter your token:", { reply_markup: { remove_keyboard: true } });
    }
    else if (userObj.token) {
        ctx.reply("You have loged in", { reply_markup: customKeyboard });
    }
});
//!----------------------hears----------------------!//
bot.hears("server status", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.token) {
        ctx.reply("Ok");
    }
    else {
        ctx.reply("You should send your login token first. click /start");
    }
});
bot.hears("get config", async (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.token) {
        const sub = await db.getSub(userObj.token);
        if (sub) {
            const inlineKeyboard = new grammy.InlineKeyboard();
            for (let i = 0; i < sub.configs.length; i++) {
                inlineKeyboard.text(`Config${i + 1}`, `config${i + 1}`);
            }
            inlineKeyboard.row();
            for (let i = 0; i < sub.configs.length; i++) {
                inlineKeyboard.text(`QR${i + 1}`, `qr${i + 1}`);
            }
            ctx.reply("Choose your config type:", { reply_markup: inlineKeyboard });
        }
        else {
            ctx.reply("Can not find your account!");
        }
    }
    else {
        ctx.reply("You should send your login token first. click /start");
    }
});
//!----------------------callback queries----------------------!//
bot.callbackQuery(/(config)\d+/, async (ctx) => {
    if (ctx.chat) {
        let userObj = getChatObject(ctx.chat.id);
        if (userObj && await db.checkSub(userObj.token)) {
            const sub = await db.getSub(userObj.token);
            if (sub) {
                const num = parseInt(ctx.callbackQuery.data.slice(6));
                const buff = new Buffer(JSON.stringify(sub.configs[num - 1]));
                ctx.reply("vmess://" + buff.toString("base64"));
            }
        }
        await ctx.answerCallbackQuery();
    }
});
bot.callbackQuery(/(qr)\d+/, async (ctx) => {
    if (ctx.chat) {
        let userObj = getChatObject(ctx.chat.id);
        if (userObj && await db.checkSub(userObj.token)) {
            const sub = await db.getSub(userObj.token);
            if (sub) {
                const num = parseInt(ctx.callbackQuery.data.slice(2));
                const buff = new Buffer(JSON.stringify(sub.configs[num - 1]));
                ctx.replyWithPhoto(new grammy.InputFile(qrImage.imageSync("vmess://" + buff.toString("base64"), { type: "png" })));
            }
        }
        await ctx.answerCallbackQuery();
    }
});
//!----------------------events----------------------!//
bot.on("message", async (ctx) => {
    const user = getChatObject(ctx.chat.id);
    if (user && !user.token && ctx.message.text) {
        if (!/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/.test(ctx.message.text.trim())) {
            ctx.reply("Token is invalid", { reply_markup: { remove_keyboard: true } });
        }
        else if (!(await db.checkSub(ctx.message.text.trim()))) {
            ctx.reply("Can not find token in database!", { reply_markup: { remove_keyboard: true } });
        }
        else {
            ctx.reply("done!", { reply_markup: customKeyboard });
            user.token = ctx.message.text.trim();
        }
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
//!----------------------error handling----------------------!//
bot.catch((err) => {
    console.log(err.message);
});
//!----------------------launch----------------------!//
bot.start();
