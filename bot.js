const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cheerio = require("cheerio");
const translate = require("translate-google");

const TOKEN = "BOT_TOKEN";
const CHANNEL = "@yourchannel";

const bot = new TelegramBot(TOKEN, { polling: true });
let queue = [];

let products = [];

async function translateTitle(text) {
	try {
		const translated = await translate(text, { to: "ru" });
		return translated;
	} catch (err) {
		console.log("Ошибка перевода:", err.message);
		return text;
	}
}

function shortenTitle(title) {
	if (title.length > 90) {
		return title.substring(0, 90) + "...";
	}
	return title;
}

async function parseProduct(url) {
	const { data } = await axios.get(url);

	const $ = cheerio.load(data);

	const title = $('meta[property="og:title"]').attr("content") || $("title").text();
	const image = $('meta[property="og:image"]').attr("content");
	const price = $('meta[property="product:price:amount"]').attr("content") || $('[class*="price"]').first().text();

	return {
		title,
		image,
		url,
		price,
	};
}


const hooks = [
	"🔥 Ты захочешь себе:",
	"😎 Это стоит взять:",
	"🔥 Очень полезная штука:",
	"💡 Гениальная находка:",
	"🤯 Это реально круто:",
	"🛒 Нашёл интересную вещь:",
	"🔥 Полезная покупка:",
	"💥 Это может пригодиться:",
	"👌 Удобная штука:",
	"🚀 Стоит внимания:",
	"🔥 Неожиданно полезно:",
	"😏 Отличная находка:",
	"🛍 Стоит попробовать:",
	"⚡ Реально полезная вещь:",
	"🔥 Вещь, которая удивит:",
	"💎 Отличное решение:",
	"🎯 Попадание в точку:",
	"🧠 Умная покупка:",
	"🛒 Хорошая находка:",
	"🔥 Это стоит взять:",
	"💡 Полезная штука для дома:",
	"😎 Неожиданно крутая вещь:",
	"🔥 Очень интересная находка:",
	"🛍 Крутая штука с AliExpress:",
	"⚡ Это реально удобно:",
	"💥 Стоит попробовать:",
	"🧠 Продуманная вещь:",
	"👌 Удобная и полезная:",
	"🔥 Отличная идея:",
	"🚀 Полезный гаджет:",
	"💡 Это может пригодиться:",
	"😏 Неожиданно полезно:",
	"🛒 Нашёл классную штуку:",
	"🔥 Хорошая покупка:",
	"💥 Очень удобная вещь:",
	"🧠 Интересное решение:",
	"💎 Крутая находка:",
	"🎯 Практичная штука:",
	"🔥 Стоит внимания:",
	"⚡ Полезная вещь:",
	"🛍 Вещь которая удивляет:",
	"😎 Хорошая идея:",
	"🔥 Можно использовать каждый день:",
	"💡 Полезная штука для быта:",
	"🚀 Стоит посмотреть:",
	"👌 Это реально удобно:",
	"💥 Удобное решение:",
	"🧠 Практичная покупка:",
	"🔥 Отличная находка:",
	"🛒 Может пригодиться:",
];

const linkTexts = [
	"🛒 Забрать можно тут:",
	"🛒 Купить по ссылке:",
	"🛒 Посмотреть товар:",
	"🛒 Забирай по ссылке:",
	"🛒 Ссылка на товар:",
	"🛒 Купить здесь:",
	"🛒 Посмотреть на AliExpress:",
	"🛒 Заказать можно тут:",
	"🛒 Смотри товар:",
	"🛒 Вот ссылка:",
];

const subscribeTexts = [
	"Присоединяйся 👉 @AliCoolForYou",
	"Больше находок 👉 @AliCoolForYou",
	"Ещё больше товаров 👉 @AliCoolForYou",
	"Подписывайся 👉 @AliCoolForYou",
	"Ежедневные находки 👉 @AliCoolForYou",
	"Интересные товары 👉 @AliCoolForYou",
	"Лучшие товары 👉 @AliCoolForYou",
	"Полезные вещи 👉 @AliCoolForYou",
];



bot.on("message", async (msg) => {
	// const url = msg.text;
	const urls = msg.text.split("\n").filter(l => l.includes("aliexpress"));
	for (const url of urls) {
		queue.push(url);
	}

	bot.sendMessage(msg.chat.id, `Добавлено ссылок: ${urls.length}`);

	async function processQueue() {

		if (queue.length === 0) return;

		const url = queue.shift();

		try {

			const product = await parseProduct(url);
			product.title = shortenTitle(await translateTitle(product.title));

			const hook = hooks[Math.floor(Math.random() * hooks.length)];
			const linkText = linkTexts[Math.floor(Math.random() * linkTexts.length)];
			const subscribe = subscribeTexts[Math.floor(Math.random() * subscribeTexts.length)];

			await bot.sendPhoto(CHANNEL, product.image, {
				caption: `${hook} \n\n${product.title}\n${product.url}\n\n${subscribe}`,
				reply_markup: {
					inline_keyboard: [[{ text: linkText, url: product.url }]],
				},
			});

		} catch (e) {
			console.log("Ошибка постинга", e.message);
		}

	}
	
	// 5000 = 5 сек
	// 60000 = 1 минута
	// 300000 = 5 минут
	// 900000 = 15 минут
	setInterval(processQueue, 5000);
});
