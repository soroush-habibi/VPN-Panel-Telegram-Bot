import grammy from 'grammy';
const bot = new grammy.Bot("5991825741:AAHV84uI9UhoX6AA3mCoCHwhMmzl_fhwbSs");
bot.command("start", (ctx) => {
    ctx.reply("welcome.please enter your login token:");
});
bot.start();
