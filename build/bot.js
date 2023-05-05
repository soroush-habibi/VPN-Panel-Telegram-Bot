import grammy from 'grammy';
import qrImage from 'qr-image';
import moment from 'moment';
import inquirer from 'inquirer';
import 'dotenv/config';
import user from './model/user.js';
import db from './model/db.js';
let bot;
if (process.env.BOT_TOKEN) {
    bot = new grammy.Bot(process.env.BOT_TOKEN);
}
else {
    process.exit(1);
}
bot.api.setMyCommands([{
        command: "start", description: "login with token"
    }, {
        command: "cancel", description: "cancel operation"
    }]);
let users = [];
let ips = [];
const startTime = moment().utc();
let globalStatus = `Main server: No Issues🟢
CDN: Minor Issues🟠
Overall: No Issues🟢`;
//!----------------------keyboards----------------------!//
const customKeyboard = new grammy.Keyboard()
    .text("get config")
    .text("server status").row()
    .text("profile")
    .text("support").row()
    .text("log out")
    .persistent()
    .resized();
const adminCustomKeyboard = new grammy.Keyboard()
    .text("users list")
    .text("add config").row()
    .text("remove config")
    .text("change status").row()
    .text("server status")
    .text("stats").row()
    .text("announce")
    .text("update expiry date").row()
    .text("log out")
    .resized();
//!----------------------middlewares----------------------!//
bot.use((ctx, next) => {
    db.connect(async (client) => {
        await next();
        client.close();
    }, ips);
});
//!----------------------commands----------------------!//
bot.command("start", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (!userObj) {
        ctx.reply("Welcome please enter your config:", { reply_markup: { remove_keyboard: true } });
        const newUser = new user(ctx.chat.id);
        users.push(newUser);
    }
    else if (!userObj.token) {
        ctx.reply("Please enter your config:", { reply_markup: { remove_keyboard: true } });
    }
    else if (userObj.token) {
        if (userObj.admin) {
            ctx.reply("You have logged in", { reply_markup: adminCustomKeyboard });
        }
        else {
            ctx.reply("You have logged in", { reply_markup: customKeyboard });
        }
    }
});
bot.command("answer", async (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        if (/^\w{24}$/g.test(ctx.match)) {
            const ticket = await db.getTicket(ctx.match);
            if (!ticket) {
                ctx.reply("Can not find this ticket!");
            }
            else if (ticket.answer !== "") {
                ctx.reply("Ticket already answered!");
            }
            else {
                ctx.reply(`"${ticket.message}"\n\nSend your answer:`);
                userObj.status = `answer:${ctx.match}`;
            }
        }
        else {
            ctx.reply("Id is not valid!");
        }
    }
    else {
        ctx.reply("You dont have permission to answer a ticket!");
    }
});
bot.command("cancel", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj) {
        if (userObj.status !== "") {
            userObj.status = "";
            ctx.reply("Cancelled!");
        }
    }
});
//!----------------------hears----------------------!//
bot.hears("server status", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.token) {
        ctx.reply(globalStatus);
    }
    else {
        ctx.reply("You should send your login token first. click /start");
    }
});
bot.hears("get config", async (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        ctx.reply("You are admin");
    }
    else if (userObj && userObj.token) {
        const config = await db.checkConfig(userObj.token);
        if (config) {
            const inlineKeyboard = new grammy.InlineKeyboard();
            inlineKeyboard.text(`Config`, `config`);
            inlineKeyboard.row();
            inlineKeyboard.text(`QR`, `qr`);
            ctx.reply("Choose your config:", { reply_markup: inlineKeyboard });
        }
        else {
            ctx.reply("Can not find your account!");
        }
    }
    else {
        ctx.reply("You should send your login token first. click /start");
    }
});
bot.hears("stats", async (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        const upTime = startTime.fromNow();
        const usersCount = users.length;
        const dbStats = await db.getStats();
        if (dbStats) {
            const qrClicks = dbStats.qr_clicks;
            const configClicks = dbStats.config_clicks;
            ctx.reply(`📊<b>Statistics:</b>
        
<b>⏰Bot uptime: ${upTime}</b>
<b>👥Users count: ${usersCount}</b>
<b>📷QR code received: ${qrClicks}</b>
<b>📝Config received: ${configClicks}</b>`, { parse_mode: 'HTML' });
        }
    }
    else {
        ctx.reply("You dont have permission to see bot stats");
    }
});
bot.hears("log out", async (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.token) {
        removeChatObject(ctx.chat.id);
        await db.removeSession(ctx.chat.id);
        ctx.reply("logged out!", { reply_markup: { remove_keyboard: true } });
    }
    else {
        ctx.reply("you are not logged in", { reply_markup: { remove_keyboard: true } });
    }
});
bot.hears("profile", async (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        ctx.reply("You are admin");
    }
    else if (userObj && userObj.token) {
        const config = await db.getConfig(userObj.token);
        let endTime;
        if (!config?.expiryTime || config.expiryTime === "0") {
            endTime = null;
        }
        else {
            endTime = moment(config?.expiryTime);
        }
        if (!endTime) {
            ctx.reply(`🔒<b>Token: </b><span class="tg-spoiler">${userObj.token}</span>
👤Name: ${config?.ps}
⌛️Expires in: ♾`, { parse_mode: "HTML" });
        }
        else if (endTime.isBefore(moment.now())) {
            ctx.reply(`🔒<b>Token: </b><span class="tg-spoiler">${userObj.token}</span>
👤Name: ${config?.ps}
⌛️Expires in: expired!`, { parse_mode: "HTML" });
        }
        else {
            ctx.reply(`🔒<b>Token: </b><span class="tg-spoiler">${userObj.token}</span>
👤Name: ${config?.ps}
⌛️Expires in: ${endTime.fromNow(true)}`, { parse_mode: "HTML" });
        }
    }
    else {
        ctx.reply("You should send your login token first. click /start");
    }
});
bot.hears("announce", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        ctx.reply("send your announcement:");
        userObj.status = "announce";
    }
    else {
        ctx.reply("You dont have permission to send announcement");
    }
});
bot.hears("add config", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        ctx.reply(`Send config data in this format(separate lines):
name of the config
ip
expiry time`);
        userObj.status = "add config";
    }
    else {
        ctx.reply("You dont have permission to add config");
    }
});
bot.hears("remove config", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        ctx.reply(`Send data in this format(separate lines):
ip
id`);
        userObj.status = "remove config";
    }
    else {
        ctx.reply("You dont have permission to remove config");
    }
});
bot.hears("users list", async (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        const inlineKeyboard = new grammy.InlineKeyboard();
        for (let i of ips) {
            inlineKeyboard.text(i, i);
        }
        ctx.reply("Choose a server:", { reply_markup: inlineKeyboard });
    }
    else {
        ctx.reply("You dont have permission to add user");
    }
});
bot.hears("change status", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        ctx.reply("Send new status:");
        userObj.status = "change status";
    }
    else {
        ctx.reply("You dont have permission to change status");
    }
});
bot.hears("support", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        ctx.reply("You are admin");
    }
    else if (userObj && userObj.token) {
        ctx.reply("Send your question (do not send file, photo or video):");
        userObj.status = "send ticket";
    }
    else {
        ctx.reply("You should send your login token first. click /start");
    }
});
bot.hears("update expiry date", (ctx) => {
    let userObj = getChatObject(ctx.chat.id);
    if (userObj && userObj.admin) {
        ctx.reply("Send user token and new expiry date in 2 separate lines:");
        userObj.status = "change expiry date";
    }
    else {
        ctx.reply("You dont have permission to change expiry date");
    }
});
//!----------------------callback queries----------------------!//
bot.callbackQuery("config", async (ctx) => {
    let userObj;
    ctx.chat && (userObj = getChatObject(ctx.chat.id));
    if (userObj && userObj.admin) {
        ctx.reply("You are admin");
    }
    else if (ctx.chat) {
        if (userObj && await db.checkConfig(userObj.token)) {
            const config = await db.getConfig(userObj.token);
            if (config) {
                delete config.expiryTime;
                delete config.rowId;
                ctx.reply("vmess://" + Buffer.from(JSON.stringify(config), 'utf-8').toString("base64"));
                await db.clickConfig();
            }
        }
        await ctx.answerCallbackQuery();
    }
});
bot.callbackQuery("qr", async (ctx) => {
    let userObj;
    ctx.chat && (userObj = getChatObject(ctx.chat.id));
    if (userObj && userObj.admin) {
        ctx.reply("You are admin");
    }
    else if (ctx.chat) {
        if (userObj && await db.checkConfig(userObj.token)) {
            const config = await db.getConfig(userObj.token);
            if (config) {
                delete config.expiryTime;
                delete config.rowId;
                ctx.replyWithPhoto(new grammy.InputFile(qrImage.imageSync("vmess://" + Buffer.from(JSON.stringify(config), 'utf-8').toString("base64"), { type: "png" })));
                await db.clickQr();
            }
        }
        await ctx.answerCallbackQuery();
    }
});
bot.callbackQuery(/^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$/, async (ctx) => {
    const ip = ctx.callbackQuery.data;
    let page = 1;
    const configs = await db.getConfigs(ip, page);
    let data = `📜Page${page}\n🌐IP:${ip}\n\n`;
    if (configs.length) {
        for (let i of configs) {
            let endTime;
            if (!i.expiryTime || i.expiryTime === "0") {
                endTime = null;
            }
            else {
                endTime = moment(i.expiryTime);
            }
            if (!endTime) {
                data += `🔒<b>Token: </b><span class="tg-spoiler">${i.id}</span>
👤Name: ${i.ps}
⌛️Expires in: ♾
⚙️Port: ${i.port}\n\n`;
            }
            else if (moment(i.expiryTime).isBefore(moment.now())) {
                data += `🔒<b>Token: </b><span class="tg-spoiler">${i.id}</span>
👤Name: ${i.ps}
⌛️Expires in: expired!
⚙️Port: ${i.port}\n\n`;
            }
            else {
                data += `🔒<b>Token: </b><span class="tg-spoiler">${i.id}</span>
👤Name: ${i.ps}
⌛️Expires in: ${moment(i.expiryTime).fromNow(true)}
⚙️Port: ${i.port}\n\n`;
            }
        }
        const pagination = new grammy.InlineKeyboard()
            .text("<", "page" + String(page - 1) + " " + ip)
            .text(">", "page" + String(page + 1) + " " + ip);
        ctx.reply(data, { reply_markup: pagination, parse_mode: "HTML" });
    }
    else {
        ctx.reply("List is empty!");
    }
    ctx.answerCallbackQuery();
});
bot.callbackQuery(/page(\d)+ (.)+/, async (ctx) => {
    const page = parseInt(ctx.callbackQuery.data.split(" ")[0].slice(4));
    const ip = ctx.callbackQuery.data.split(" ")[1];
    let pagination;
    if (page == 0) {
        ctx.answerCallbackQuery({ text: "We dont have zero page.sorry😆" });
        return;
    }
    else {
        pagination = new grammy.InlineKeyboard()
            .text("<", "page" + String(page - 1) + " " + ip)
            .text(">", "page" + String(page + 1) + " " + ip);
    }
    const configs = await db.getConfigs(ip, page);
    let data = `📜Page${page}\n🌐IP:${ip}\n\n`;
    if (configs.length) {
        for (let i of configs) {
            let endTime;
            if (!i.expiryTime || i.expiryTime === "0") {
                endTime = null;
            }
            else {
                endTime = moment(i.expiryTime);
            }
            if (!endTime) {
                data += `🔒<b>Token: </b><span class="tg-spoiler">${i.id}</span>
👤Name: ${i.ps}
⌛️Expires in: ♾
⚙️Port: ${i.port}\n\n`;
            }
            else if (moment(i.expiryTime).isBefore(moment.now())) {
                data += `🔒<b>Token: </b><span class="tg-spoiler">${i.id}</span>
👤Name: ${i.ps}
⌛️Expires in: expired!
⚙️Port: ${i.port}\n\n`;
            }
            else {
                data += `🔒<b>Token: </b><span class="tg-spoiler">${i.id}</span>
👤Name: ${i.ps}
⌛️Expires in: ${moment(i.expiryTime).fromNow(true)}
⚙️Port: ${i.port}\n\n`;
            }
        }
        ctx.editMessageText(data, { reply_markup: pagination, parse_mode: "HTML" });
    }
    else {
        ctx.editMessageText(`📜Page${page} is empty!`, { reply_markup: pagination });
    }
    ctx.answerCallbackQuery();
});
//!----------------------events----------------------!//
bot.on("message", async (ctx) => {
    const user = getChatObject(ctx.chat.id);
    if (user && !user.token && ctx.message.text) {
        try {
            const config = JSON.parse(Buffer.from(ctx.message.text.trim().slice(8), "base64").toString("utf-8"));
            if (config.ps) {
                if (!/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/.test(config.id)) {
                    ctx.reply("Token is invalid", { reply_markup: { remove_keyboard: true } });
                }
                else if (!(await db.checkConfig(config.id))) {
                    ctx.reply("Can not find config in database!", { reply_markup: { remove_keyboard: true } });
                }
                else {
                    if (config.id === "c5c1dde1-e995-4e09-fbaf-dda69059e4e6")
                        user.admin = true;
                    if (user.admin) {
                        ctx.reply("done!", { reply_markup: adminCustomKeyboard });
                    }
                    else {
                        ctx.reply("done!", { reply_markup: customKeyboard });
                    }
                    user.token = config.id;
                    await db.addSession(ctx.chat.id, user.token, user.admin);
                }
            }
            else {
                ctx.reply("Config is invalid");
            }
        }
        catch (e) {
            ctx.reply("Config is invalid");
        }
    }
    else if (user && user.token && user.admin && user.status === "announce") {
        for (let i of users) {
            if (i.chatId === ctx.chat.id) {
                continue;
            }
            if (ctx.message.document) {
                ctx.api.sendDocument(i.chatId, ctx.message.document.file_id, { caption: ctx.message.text, protect_content: true });
            }
            else if (ctx.message.text) {
                ctx.api.sendMessage(i.chatId, ctx.message.text, { protect_content: true });
            }
        }
        ctx.reply("Sent!");
        user.status = "";
    }
    else if (user && user.token && user.admin && user.status === "add config") {
        if (ctx.message.text) {
            try {
                const remark = ctx.message.text.split("\n")[0];
                const ip = ctx.message.text.split("\n")[1];
                const expiryTime = moment(ctx.message.text.split("\n")[2]);
                if (remark && (/^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$/).test(ip) && expiryTime.isValid()) {
                    const result = await db.addConfig(remark, ip, expiryTime.toDate());
                    if (result) {
                        ctx.reply("Config added successfully!");
                        const resultConfig = {
                            add: ip,
                            aid: "0",
                            host: "",
                            id: result.token,
                            net: "ws",
                            path: "/",
                            port: String(result.port),
                            ps: remark,
                            scy: "auto",
                            sni: "",
                            tls: "",
                            type: "none",
                            v: "2"
                        };
                        ctx.reply("vmess://" + Buffer.from(JSON.stringify(resultConfig), 'utf-8').toString("base64"));
                    }
                    else {
                        ctx.reply("Operation failed!");
                    }
                }
                else {
                    ctx.reply("Input data is invalid!");
                }
            }
            catch (e) {
                ctx.reply("Input data is invalid!");
            }
        }
        user.status = "";
    }
    else if (user && user.token && user.admin && user.status === "remove config") {
        if (ctx.message.text) {
            try {
                const ip = ctx.message.text.split("\n")[0];
                const id = Number(ctx.message.text.split("\n")[1]);
                const result = await db.removeConfig(ip, id);
                if (result) {
                    ctx.reply("Config removed successfully!");
                }
                else {
                    ctx.reply("Not found!");
                }
            }
            catch (e) {
                ctx.reply("Invalid input");
            }
        }
        user.status = "";
    }
    else if (user && user.token && user.admin && user.status === "change status") {
        if (ctx.message.text) {
            globalStatus = ctx.message.text;
            ctx.reply("Server status changed successfully!");
        }
        user.status = "";
    }
    else if (user && user.token && !user.admin && user.status === "send ticket") {
        if (ctx.message.text) {
            const ids = [];
            for (let i of users) {
                if (i.admin) {
                    ids.push(i.chatId);
                }
            }
            const ticketId = await db.addTicket(user.token, ctx.chat.id, ctx.message.text);
            ctx.api.sendMessage(ids[Math.floor(Math.random() * ids.length)], `You have a new ticket from <span class="tg-spoiler">${user.token}</span>:\n
${ctx.message.text}\n
Send <code>/answer ${ticketId}</code> to answer`, {
                parse_mode: "HTML"
            });
            ctx.reply("Ticket sent!");
        }
        user.status = "";
    }
    else if (user && user.token && user.admin && /^answer:\w{24}$/g.test(user.status)) {
        if (ctx.message.text) {
            if (ctx.message.text.length > 10) {
                const ticket = await db.getTicket(user.status.slice(7));
                if (ticket) {
                    ctx.api.sendMessage(ticket.chat_id, `Admin answered your ticket:\n\n${ctx.message.text}`);
                    await db.answerTicket(String(ticket._id), ctx.message.text);
                }
                else {
                    ctx.reply("Can not find ticket in database!");
                }
                user.status = "";
            }
            else {
                ctx.reply("Your answer should be at least 10 character.try again:");
            }
        }
    }
    else if (user && user.token && user.admin && user.status === "change expiry date") {
        if (ctx.message.text) {
            try {
                const token = ctx.message.text.split("\n")[0];
                const newDate = moment(ctx.message.text.split("\n")[1]);
                if (/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/.test(token) && newDate.isValid()) {
                    const result = await db.updateExpiryDate(token, newDate.toDate());
                    if (result) {
                        ctx.reply("Changed successfully!");
                    }
                    else {
                        ctx.reply("Can not find token in database!");
                    }
                }
                else {
                    ctx.reply("Invalid input");
                }
            }
            catch (e) {
                ctx.reply("Invalid input");
            }
        }
        user.status = "";
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
function getChatObject(chatId) {
    for (let value of users) {
        if (value.chatId == chatId) {
            return value;
        }
    }
}
function removeChatObject(chatId) {
    for (let i = 0; i < users.length; i++) {
        if (users[i].chatId === chatId) {
            users.splice(i);
            return;
        }
    }
}
function resetStatus() {
    for (let value of users) {
        value.status = "";
    }
}
//!----------------------error handling----------------------!//
bot.catch((err) => {
    console.log(err.message);
});
//!----------------------launch----------------------!//
inquirer.prompt([
    {
        name: "ips",
        message: "Enter servers ip:",
        type: "editor",
        validate: (input) => {
            const ips = input.trim().split("\n");
            for (let i of ips) {
                if (!(/^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$/).test(i)) {
                    return false;
                }
            }
            return true;
        }
    }
]).then((value) => {
    ips = value.ips.trim().split("\n");
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
    }, ips);
});
