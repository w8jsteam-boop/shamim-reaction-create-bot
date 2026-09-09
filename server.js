const express = require("express");
const { Telegraf, Markup } = require("telegraf");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);
const ADMIN_GROUP_ID = Number(process.env.ADMIN_GROUP_ID);
const UPDATE_CHANNEL = process.env.UPDATE_CHANNEL || "@spdfairyappi";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN missing");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

/*
|--------------------------------------------------------------------------
| Memory storage
|--------------------------------------------------------------------------
| এই version restart হলে created-bot list হারাবে।
| Production version-এ database ব্যবহার করা উচিত।
|--------------------------------------------------------------------------
*/

const createdBots = new Map();

/*
|--------------------------------------------------------------------------
| Main Menu
|--------------------------------------------------------------------------
*/

function mainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🤖 Create Bot", "create_bot"),
      Markup.button.callback("📊 My Bots", "my_bots")
    ],
    [
      Markup.button.callback("🔄 Update", "update"),
      Markup.button.callback("👤 Owner", "owner")
    ],
    [
      Markup.button.callback("❓ Help", "help")
    ]
  ]);
}

/*
|--------------------------------------------------------------------------
| Start
|--------------------------------------------------------------------------
*/

bot.start(async (ctx) => {
  const user = ctx.from;

  await ctx.reply(
`👋 Welcome to Shamim Reaction Create Bot

🤖 এই বটের মাধ্যমে তুমি নিজের Telegram Bot তৈরি ও পরিচালনা করতে পারবে।

👤 User ID: ${user.id}

নিচের Menu থেকে একটি অপশন নির্বাচন করো।`,
    mainMenu()
  );

  await notifyAdmin(user);
});

/*
|--------------------------------------------------------------------------
| Admin Group Notification
|--------------------------------------------------------------------------
*/

async function notifyAdmin(user) {
  try {
    const username = user.username
      ? `@${user.username}`
      : "No username";

    const name = [
      user.first_name || "",
      user.last_name || ""
    ].join(" ").trim();

    await bot.telegram.sendMessage(
      ADMIN_GROUP_ID,
`🆕 NEW USER

👤 Name: ${name || "Unknown"}
🔗 Username: ${username}
🆔 User ID: ${user.id}

👤 Profile:
https://t.me/${user.username || "user?id=" + user.id}

📅 User started the bot.`,
      {
        disable_web_page_preview: true
      }
    );

  } catch (error) {
    console.error("Admin notification error:", error.message);
  }
}

/*
|--------------------------------------------------------------------------
| Create Bot
|--------------------------------------------------------------------------
*/

bot.action("create_bot", async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.reply(
`🤖 CREATE YOUR BOT

তোমার BotFather থেকে পাওয়া Bot Token এখানে পাঠাও।

উদাহরণ:

123456789:AAxxxxxxxxxxxxxxxx

⚠️ শুধুমাত্র নিজের তৈরি bot-এর token ব্যবহার করো।

Token পাঠানোর পর আমি token যাচাই করে bot information দেখাব।`
  );

  ctx.session = ctx.session || {};
  ctx.session.waitingForToken = true;
});

/*
|--------------------------------------------------------------------------
| Text Handler
|--------------------------------------------------------------------------
*/

bot.on("text", async (ctx) => {
  const session = ctx.session || {};

  if (!session.waitingForToken) return;

  const token = ctx.message.text.trim();

  if (!token.includes(":")) {
    return ctx.reply(
      "❌ Token format সঠিক নয়। আবার BotFather-এর token পাঠাও।"
    );
  }

  session.waitingForToken = false;

  try {
    const testBot = new Telegraf(token);

    const me = await testBot.telegram.getMe();

    createdBots.set(ctx.from.id, {
      id: me.id,
      username: me.username,
      firstName: me.first_name,
      createdBy: ctx.from.id,
      createdAt: new Date().toISOString()
    });

    await ctx.reply(
`✅ BOT VERIFIED

🤖 Name: ${me.first_name}
🔗 Username: @${me.username}
🆔 Bot ID: ${me.id}

তোমার bot successfully verify হয়েছে।

⚠️ নিরাপত্তার জন্য token chat-এ সংরক্ষণ করা হয়নি।`
    );

    await bot.telegram.sendMessage(
      ADMIN_GROUP_ID,
`🤖 NEW BOT VERIFIED

👤 User ID: ${ctx.from.id}

🤖 Bot:
@${me.username}

🆔 Bot ID:
${me.id}

📅 ${new Date().toLocaleString("en-BD")}`
    );

  } catch (error) {
    console.error(error);

    await ctx.reply(
      "❌ এই token দিয়ে Telegram Bot API-তে সংযোগ করা যায়নি। BotFather token আবার যাচাই করো।"
    );
  }
});

/*
|--------------------------------------------------------------------------
| My Bots
|--------------------------------------------------------------------------
*/

bot.action("my_bots", async (ctx) => {
  await ctx.answerCbQuery();

  const data = createdBots.get(ctx.from.id);

  if (!data) {
    return ctx.reply(
      "📭 তোমার কোনো bot এখনো verify করা হয়নি।"
    );
  }

  await ctx.reply(
`🤖 YOUR BOT

Name: ${data.firstName}
Username: @${data.username}
Bot ID: ${data.id}

Created:
${data.createdAt}`
  );
});

/*
|--------------------------------------------------------------------------
| Update
|--------------------------------------------------------------------------
*/

bot.action("update", async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.reply(
`🔄 UPDATE

আমাদের Telegram Channel-এ join করে সর্বশেষ update নাও।

👇`,
    Markup.inlineKeyboard([
      [
        Markup.button.url(
          "📢 Update Channel",
          "https://t.me/spdfairyappi"
        )
      ]
    ])
  );
});

/*
|--------------------------------------------------------------------------
| Owner
|--------------------------------------------------------------------------
*/

bot.action("owner", async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.reply(
`👤 OWNER

Bot Owner:
Shamim Ahamed

🆔 ID:
7070690513

কোনো সমস্যা হলে Owner-এর সাথে যোগাযোগ করো।`,
    Markup.inlineKeyboard([
      [
        Markup.button.url(
          "👤 Contact Owner",
          "tg://user?id=7070690513"
        )
      ]
    ])
  );
});

/*
|--------------------------------------------------------------------------
| Help
|--------------------------------------------------------------------------
*/

bot.action("help", async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.reply(
`❓ HELP

1️⃣ Create Bot চাপো
2️⃣ BotFather token পাঠাও
3️⃣ Bot verify হবে
4️⃣ My Bots থেকে bot information দেখতে পারবে
5️⃣ Update থেকে channel দেখতে পারবে
6️⃣ Owner থেকে support নিতে পারবে`
  );
});

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    status: "online",
    bot: "Shamim Reaction Create Bot"
  });
});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

/*
|--------------------------------------------------------------------------
| Start Telegram Bot
|--------------------------------------------------------------------------
*/

bot.launch()
  .then(() => {
    console.log("Telegram bot started");
  })
  .catch((error) => {
    console.error("Telegram bot error:", error);
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
