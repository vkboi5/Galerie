const { Telegraf } = require("telegraf");
const TOKEN = "7241962815:AAF9oLswihIXe2vFpco_dT8pGjOhmFY4fzs";
const bot = new Telegraf(TOKEN);

const web_link = "https://resources-buddy-filled-lot.trycloudflare.com";

bot.start((ctx) =>
  ctx.reply("Welcome :)))))", {
    reply_markup: {
      keyboard: [[{ text: "web app", web_app: { url: web_link } }]],
    },
  })
);

bot.launch();