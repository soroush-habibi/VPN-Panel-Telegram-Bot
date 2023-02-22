import grammy from 'grammy';
import qrImage from 'qr-image';
import moment from 'moment';

import user from './model/user.js';
import db from './model/db.js';

const bot = new grammy.Bot("5991825741:AAGzDG7sIV90vU_5vNSVmh0506gO8lNz53I");

bot.api.setMyCommands([{
    command: "start", description: "login with token..."
}]);

let users: user[] = [];

const startTime = moment().utc();

//!----------------------keyboards----------------------!//

const customKeyboard = new grammy.Keyboard()
    .text("get config")
    .text("server status").row()
    .text("profile")
    .text("guide").row()
    .text("support")
    .text("log out")
    .persistent()
    .resized();

const adminCustomKeyboard = new grammy.Keyboard()
    .text("users list")
    .text("add user").row()
    .text("add config")
    .text("remove config").row()
    .text("change status")
    .text("server status").row()
    .text("stats")
    .text("announce").row()
    .text("log out")
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
    } else if (!userObj.token) {
        ctx.reply("Please enter your token:", { reply_markup: { remove_keyboard: true } });
    } else if (userObj.token) {
        if (userObj.admin) {
            ctx.reply("You have logged in", { reply_markup: adminCustomKeyboard });
        } else {
            ctx.reply("You have logged in", { reply_markup: customKeyboard });
        }
    }
});

//!----------------------hears----------------------!//

bot.hears("server status", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.token) {
        ctx.reply("Ok");
    } else {
        ctx.reply("You should send your login token first. click /start");
    }
});

bot.hears("get config", async (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        ctx.reply("You are admin");
    } else if (userObj && userObj.token) {
        const sub = await db.getSub(userObj.token);
        if (sub) {
            if (sub.configs.length == 0) {
                ctx.reply("You do not have any configs.\nIf your subscription did not expires please contact support!");
            } else {
                const inlineKeyboard = new grammy.InlineKeyboard();
                for (let i = 0; i < sub.configs.length; i++) {
                    inlineKeyboard.text(`Config${i + 1}`, `config${i + 1}`);
                }
                inlineKeyboard.row()
                for (let i = 0; i < sub.configs.length; i++) {
                    inlineKeyboard.text(`QR${i + 1}`, `qr${i + 1}`);
                }
                ctx.reply("Choose your config:", { reply_markup: inlineKeyboard });
            }
        } else {
            ctx.reply("Can not find your account!");
        }
    } else {
        ctx.reply("You should send your login token first. click /start");
    }
});

bot.hears("stats", async (ctx) => {
    let userObj = getChatObject(ctx.chat.id);

    if (userObj && userObj.admin) {
        const upTime: string = startTime.fromNow();
        const usersCount: number = users.length;

        const dbStats = await db.getStats();

        const qrClicks = dbStats.qr_clicks;
        const configClicks = dbStats.config_clicks;

        ctx.reply(`📊<b>Statistics:</b>
        
<b>⏰Bot uptime: ${upTime}</b>
<b>👥Users count: ${usersCount}</b>
<b>📷QR code received: ${qrClicks}</b>
<b>📝Config received: ${configClicks}</b>`, { parse_mode: 'HTML' });
    } else {
        ctx.reply("You dont have permission to see bot stats");
    }
});

bot.hears("log out", async (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.token) {
        removeChatObject(ctx.chat.id);
        await db.removeSession(ctx.chat.id);
        ctx.reply("logged out!", { reply_markup: { remove_keyboard: true } });
    } else {
        ctx.reply("you are not logged in", { reply_markup: { remove_keyboard: true } });
    }
});

bot.hears("profile", async (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        ctx.reply("You are admin");
    } else if (userObj && userObj.token) {
        const dbUser = await db.getSub(userObj.token);
        const endTime = moment(dbUser?.expiry_date);
        if (endTime.isBefore(moment.now())) {
            ctx.reply(`🔒<b>Token: </b><span class="tg-spoiler">${userObj.token}</span>
⌛️expires in: expired!`, { parse_mode: "HTML" });
        } else {
            ctx.reply(`🔒<b>Token: </b><span class="tg-spoiler">${userObj.token}</span>
⌛️expires in: ${endTime.fromNow(true)}`, { parse_mode: "HTML" });
        }
    } else {
        ctx.reply("You should send your login token first. click /start");
    }
});

bot.hears("announce", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);

    if (userObj && userObj.admin) {
        ctx.reply("send your announcement:");
        userObj.status = "announce";
    } else {
        ctx.reply("You dont have permission to send announcement");
    }
});

bot.hears("add config", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);

    if (userObj && userObj.admin) {
        ctx.reply("send user token and your config in base64 form in separate lines:");
        userObj.status = "add config";
    } else {
        ctx.reply("You dont have permission to add config");
    }
});

bot.hears("remove config", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);

    if (userObj && userObj.admin) {
        ctx.reply("send user token and your config in base64 form in separate lines:");
        userObj.status = "remove config";
    } else {
        ctx.reply("You dont have permission to remove config");
    }
});

//!----------------------callback queries----------------------!//

bot.callbackQuery(/(config)\d+/, async (ctx) => {
    let userObj;
    ctx.chat && (userObj = getChatObject(ctx.chat.id));
    if (userObj && userObj.admin) {
        ctx.reply("You are admin");
    } else if (ctx.chat) {
        let userObj = getChatObject(ctx.chat.id);
        if (userObj && await db.checkSub(userObj.token)) {
            const sub = await db.getSub(userObj.token);
            if (sub) {
                const num: number = parseInt(ctx.callbackQuery.data.slice(6));
                const buff = new Buffer(JSON.stringify(sub.configs[num - 1]));
                ctx.reply("vmess://" + buff.toString("base64"));
                await db.clickConfig();
            }
        }
        await ctx.answerCallbackQuery();
    }
});

bot.callbackQuery(/(qr)\d+/, async (ctx) => {
    let userObj;
    ctx.chat && (userObj = getChatObject(ctx.chat.id));
    if (userObj && userObj.admin) {
        ctx.reply("You are admin");
    } else if (ctx.chat) {
        let userObj = getChatObject(ctx.chat.id);
        if (userObj && await db.checkSub(userObj.token)) {
            const sub = await db.getSub(userObj.token);
            if (sub) {
                const num: number = parseInt(ctx.callbackQuery.data.slice(2));
                const buff = new Buffer(JSON.stringify(sub.configs[num - 1]));
                ctx.replyWithPhoto(new grammy.InputFile(
                    qrImage.imageSync("vmess://" + buff.toString("base64"), { type: "png" })
                ));
                await db.clickQr();
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
        } else if (!(await db.checkSub(ctx.message.text.trim()))) {
            ctx.reply("Can not find token in database!", { reply_markup: { remove_keyboard: true } });
        } else {
            const dbUser = await db.getSub(ctx.message.text.trim());
            dbUser?.admin && (user.admin = true);
            if (user.admin) {
                ctx.reply("done!", { reply_markup: adminCustomKeyboard });
            } else {
                ctx.reply("done!", { reply_markup: customKeyboard });
            }
            user.token = ctx.message.text.trim();
            await db.addSession(ctx.chat.id, ctx.message.text.trim(), user.admin);
        }
    } else if (user && user.token && user.admin && user.status === "announce") {
        for (let i of users) {
            if (i.chatId === ctx.chat.id) {
                continue;
            }
            if (ctx.message.document) {
                ctx.api.sendDocument(i.chatId, ctx.message.document.file_id, { caption: ctx.message.text, protect_content: true });
            } else if (ctx.message.text) {
                ctx.api.sendMessage(i.chatId, ctx.message.text, { protect_content: true });
            }
        }
        user.status = "";
    } else if (user && user.token && user.admin && user.status === "add config") {
        if (ctx.message.text) {
            const userToken = ctx.message.text.split("\n")[0];
            let vmess = ctx.message.text.split("\n")[1];
            if (/vmess:\/\/(.+)/.test(vmess) && /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/.test(userToken)) {
                vmess = vmess.slice(8);
                const buff = new Buffer(vmess, "base64");
                const config = JSON.parse(buff.toString('ascii'));

                const dbUser = await db.getSub(userToken);

                if (dbUser?.admin) {
                    ctx.reply("You can not add config to admin");
                } else {
                    const result = await db.addConfig(userToken, config);
                    if (result) {
                        ctx.reply("Config added successfully!");
                    } else {
                        ctx.reply("Can not find user!");
                    }
                }
            } else {
                ctx.reply("Invalid input");
            }
        }
        user.status = "";
    } else if (user && user.token && user.admin && user.status === "remove config") {
        if (ctx.message.text) {
            const userToken = ctx.message.text.split("\n")[0];
            let vmess = ctx.message.text.split("\n")[1];
            if (/vmess:\/\/(.+)/.test(vmess) && /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/.test(userToken)) {
                vmess = vmess.slice(8);
                const buff = new Buffer(vmess, "base64");
                const config = JSON.parse(buff.toString('ascii'));

                const dbUser = await db.getSub(userToken);

                if (dbUser?.admin) {
                    ctx.reply("You can not add config to admin");
                } else {
                    const result = await db.removeConfig(userToken, config);
                    if (result) {
                        ctx.reply("Config removed successfully!");
                    } else {
                        ctx.reply("Can not find user or config!");
                    }
                }
            } else {
                ctx.reply("Invalid input");
            }
        }
    }
});

bot.on("my_chat_member", async (ctx) => {
    removeChatObject(ctx.chat.id);
    await db.removeSession(ctx.chat.id);
});

setTimeout(() => {
    resetStatus();
}, 1000 * 60 * 5);

//!----------------------functions----------------------!//

function getChatObject(chatId: number): user | void {
    for (let value of users) {
        if (value.chatId == chatId) {
            return value;
        }
    }
}

function removeChatObject(chatId: number): void {
    for (let i = 0; i < users.length; i++) {
        if (users[i].chatId === chatId) {
            users.splice(i);
            return;
        }
    }
}

function resetStatus(): void {
    for (let value of users) {
        value.status = "";
    }
}

//!----------------------error handling----------------------!//

bot.catch((err) => {
    console.log(err.message);
});

//!----------------------launch----------------------!//

db.connect(async (client) => {
    const sessions = await db.getSessions();

    for (let i of sessions) {
        const userObj = new user(i.chat_id);
        userObj.token = i.token;
        userObj.admin = i.admin;
        users.push(userObj);
    }

    client.close();
    bot.start();
});