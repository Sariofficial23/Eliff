import bot from '../core/bot.js';
import config from '../config/default.js';
import {
  getOrderById,
  setOrderCourier,
  updateOrderStatus,
} from '../models/Order.js';

// Manzil matni va GPS havolasini ajratib olish
const parseLocation = (loc = '') => {
  const urlMatch = loc.match(/https?:\/\/\S+/);
  const address = loc
    .replace(/https?:\/\/\S+/, '')
    .replace(/\|/g, '')
    .trim();
  return { address, mapUrl: urlMatch ? urlMatch[0] : '' };
};

const fmt = (n) => Number(n || 0).toLocaleString('ru-RU').replace(/,/g, ' ');

const courierName = (from) =>
  [from.first_name, from.last_name].filter(Boolean).join(' ') +
  (from.username ? ` (@${from.username})` : '');

// /start komandasi
export const handleStart = async (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "Do'st";

  const text =
    `Assalomu alaykum, ${name}! 🍔\n\n` +
    `Elif Fast Food'ga xush kelibsiz. Mazali, issiqqina taomlarni tez va oson buyurtma qiling.\n\n` +
    `Buyurtma berish uchun pastdagi tugmani bosing 👇`;

  const options = config.miniAppUrl
    ? {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍔 Buyurtma berish', web_app: { url: config.miniAppUrl } }],
          ],
        },
      }
    : {};

  // sendMessage'ni xavfsiz yuboramiz (masalan, foydalanuvchi botni bloklasa
  // 403 xatosi jarayonni o'chirib yubormasligi uchun)
  const message = config.miniAppUrl
    ? [text, options]
    : [text + "\n\n⚠️ Mini App hali ulanmagan (MINI_APP_URL bo'sh)."];

  bot
    .sendMessage(chatId, ...message)
    .catch((e) => console.log('sendMessage xato:', e.message));
};

// Botning pastki "menu" tugmasini Mini App'ga ulash
export const setupMenuButton = async () => {
  if (!config.miniAppUrl) return;
  try {
    await bot.setChatMenuButton({
      menu_button: {
        type: 'web_app',
        text: 'Buyurtma 🍕',
        web_app: { url: config.miniAppUrl },
      },
    });
    console.log('✅ Menu tugmasi Mini App\'ga ulandi');
  } catch (e) {
    console.log('Menu tugmasi xatosi:', e.message);
  }
};

// Buyurtma tasdiqlanganda mijozga xabar yuborish
export const sendOrderConfirmation = (telegramId) => {
  bot
    .sendMessage(
      telegramId,
      "Buyurtmangiz muvaffaqiyatli qabul qilindi! Kuryerimiz tez orada bog'lanadi 🍔",
    )
    .catch((e) => console.log('Xabar yuborishda xato:', e.message));
};

// Yangi buyurtmani kuryerlar guruhiga yuborish
export const notifyCouriers = (order) => {
  if (!config.courierGroupId) return;

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsText = items.map((i) => `• ${i.name} x${i.qty}`).join('\n');
  const { address, mapUrl } = parseLocation(order.location || '');

  let text = `🆕 <b>Yangi buyurtma #${order.id}</b>\n\n`;
  text += `${itemsText}\n\n`;
  text += `💰 Jami: <b>${fmt(order.total)} so'm</b>\n`;
  text += `📞 ${order.phone || '—'}`;
  if (address) text += `\n📍 ${address}`;

  const keyboard = [];
  if (mapUrl) keyboard.push([{ text: '🗺 Xaritada ochish', url: mapUrl }]);
  keyboard.push([{ text: '✅ Men olaman', callback_data: `take_${order.id}` }]);

  bot
    .sendMessage(config.courierGroupId, text, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    })
    .catch((e) => console.log('Kuryer guruhiga yuborishda xato:', e.message));
};

// "Men olaman" tugmasi bosilganda
export const handleCallback = async (query) => {
  try {
    const data = query.data || '';
    const chatId = query.message?.chat?.id;
    const messageId = query.message?.message_id;
    const name = courierName(query.from);

    // ---- 1) Kuryer buyurtmani oladi: "Men olaman" ----
    if (data.startsWith('take_')) {
      const orderId = Number(data.slice(5));
      const order = await getOrderById(orderId);

      if (!order) {
        return bot.answerCallbackQuery(query.id, {
          text: 'Buyurtma topilmadi',
          show_alert: true,
        });
      }
      if (order.courier) {
        return bot.answerCallbackQuery(query.id, {
          text: `Bu buyurtmani allaqachon ${order.courier} oldi`,
          show_alert: true,
        });
      }

      await setOrderCourier(orderId, name);

      // Xabarni yangilaymiz: kim olganini yozamiz + "Yetkazildi" tugmasini qo'yamiz
      const { mapUrl } = parseLocation(order.location || '');
      const newText =
        (query.message.text || `Buyurtma #${orderId}`) +
        `\n\n✅ Qabul qildi: ${name}`;
      const rows = [];
      if (mapUrl) rows.push([{ text: '🗺 Xaritada ochish', url: mapUrl }]);
      rows.push([
        { text: '🏁 Yetkazildi', callback_data: `deliver_${orderId}` },
      ]);

      bot
        .editMessageText(newText, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: rows },
        })
        .catch(() => {});

      return bot.answerCallbackQuery(query.id, {
        text: 'Siz bu buyurtmani oldingiz ✅',
      });
    }

    // ---- 2) Kuryer yetkazib berdi: "Yetkazildi" ----
    if (data.startsWith('deliver_')) {
      const orderId = Number(data.slice(8));
      const order = await getOrderById(orderId);

      if (!order) {
        return bot.answerCallbackQuery(query.id, {
          text: 'Buyurtma topilmadi',
          show_alert: true,
        });
      }
      if (order.status === 'yetkazildi') {
        return bot.answerCallbackQuery(query.id, {
          text: 'Bu buyurtma allaqachon yetkazilgan',
          show_alert: true,
        });
      }
      // Faqat buyurtmani olgan kuryer "Yetkazildi" deb belgilay oladi
      if (order.courier && order.courier !== name) {
        return bot.answerCallbackQuery(query.id, {
          text: `Buni faqat ${order.courier} belgilay oladi`,
          show_alert: true,
        });
      }

      await updateOrderStatus(orderId, 'yetkazildi');

      // Xabarni yakunlaymiz: "Yetkazildi", tugmani olib tashlaymiz (xarita qoladi)
      const { mapUrl } = parseLocation(order.location || '');
      const newText =
        (query.message.text || `Buyurtma #${orderId}`) +
        `\n\n🏁 Yetkazildi ✅ (${name})`;
      const rows = [];
      if (mapUrl) rows.push([{ text: '🗺 Xaritada ochish', url: mapUrl }]);

      bot
        .editMessageText(newText, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: rows },
        })
        .catch(() => {});

      return bot.answerCallbackQuery(query.id, { text: 'Yetkazildi ✅' });
    }
  } catch (e) {
    console.log('Callback xato:', e.message);
  }
};

// Chat ID'ni aniqlash uchun (/id komandasi va guruhga qo'shilganda)
export const handleChatId = (msg) => {
  bot
    .sendMessage(msg.chat.id, `Bu chat ID: <code>${msg.chat.id}</code>`, {
      parse_mode: 'HTML',
    })
    .catch(() => {});
};

export const handleAddedToGroup = (msg) => {
  const added = msg.new_chat_members || [];
  if (added.some((m) => m.is_bot)) {
    bot
      .sendMessage(
        msg.chat.id,
        `✅ Bot guruhga qo'shildi!\nBu guruh ID: <code>${msg.chat.id}</code>\n\nShu ID'ni Render'da COURIER_GROUP_ID ga qo'ying.`,
        { parse_mode: 'HTML' },
      )
      .catch(() => {});
  }
};
