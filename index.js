const express = require('express');
const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN env var is required');
}

const WELCOME_TEXT = [
  'Хули ты не в чате? Мы вообще-то всей семьёй тут общаемся!🤬',
  '',
  'Еще кстати прям там подбираем размеры и отвечаем на другие вопросы!',
  '',
  'В чате полно мошенников-долбоебов, не ведись!',
].join('\n');

const WELCOME_KEYBOARD = Markup.inlineKeyboard([
  [
    Markup.button.url('Чат', 'https://t.me/cortisolchat'),
    Markup.button.url('Сайт', 'https://www.cortisoljeans.ru'),
  ],
  [
    Markup.button.url('Бот поддержки', 'https://t.me/cortisolsupportbot'),
  ],
]);

const START_TEXT = 'Я чат-бот Кости Кортизола!';

const START_KEYBOARD = Markup.inlineKeyboard([
  Markup.button.url('Тгк', 'https://t.me/cortisoljeans'),
  Markup.button.url('Чат', 'https://t.me/cortisolchat'),
]);

// media_group_id -> timestamp of when it was handled. Prevents duplicate
// greetings when a single channel post fans out into multiple forwarded
// messages (album/media group).
const handledMediaGroups = new Map();
const MEDIA_GROUP_TTL_MS = 2 * 60 * 1000;

function pruneHandledMediaGroups() {
  const now = Date.now();
  for (const [mediaGroupId, seenAt] of handledMediaGroups) {
    if (now - seenAt > MEDIA_GROUP_TTL_MS) {
      handledMediaGroups.delete(mediaGroupId);
    }
  }
}

const bot = new Telegraf(BOT_TOKEN);

bot.on('message', async (ctx, next) => {
  const message = ctx.message;

  if (!message.is_automatic_forward) {
    return next();
  }

  if (message.media_group_id) {
    pruneHandledMediaGroups();
    if (handledMediaGroups.has(message.media_group_id)) {
      return;
    }
    handledMediaGroups.set(message.media_group_id, Date.now());
  }

  await ctx.reply(WELCOME_TEXT, {
    reply_to_message_id: message.message_id,
    ...WELCOME_KEYBOARD,
  });
});

bot.start(async (ctx) => {
  if (ctx.chat.type !== 'private') {
    return;
  }

  await ctx.reply(START_TEXT, START_KEYBOARD);
});

bot.launch().then(() => {
  console.log('Bot started (long polling)');
});

const app = express();
app.get('/health', (_req, res) => res.status(200).send('ok'));
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Healthcheck server listening on port ${port}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
