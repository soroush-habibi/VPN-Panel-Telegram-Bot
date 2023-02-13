import grammy from 'grammy';
import user from './model/user.js';

const bot = new grammy.Bot("5991825741:AAHV84uI9UhoX6AA3mCoCHwhMmzl_fhwbSs");

bot.command("start", (ctx) => {
    ctx.reply("welcome.please enter your login token:");
});

bot.start();