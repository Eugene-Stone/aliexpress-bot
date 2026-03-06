const { TOKEN_const, CHANNEL_const, USER_1, USER_2 } = require("./constants");

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cheerio = require("cheerio");
const translate = require("translate-google");
const fs = require("fs");

// const TOKEN = "BOT_TOKEN";
// const CHANNEL = "@yourchannel";
const TOKEN = TOKEN_const;
const CHANNEL = CHANNEL_const;

const allowedUsers = [
	USER_1, // твой ID
	USER_2, // например второй админ
];

const bot = new TelegramBot(TOKEN, { polling: true });


let queue = [];
if (fs.existsSync("queue.json")) {
	queue = JSON.parse(fs.readFileSync("queue.json"));
}

function saveQueue() {
	fs.writeFileSync("queue.json", JSON.stringify(queue, null, 2));
}

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
	const { data } = await axios.get(url, {
		headers: {
			"user-agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
			accept:
				"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
			"accept-language": "en-US,en;q=0.9",
			referer: "https://www.aliexpress.com/",
		},
	});

	// console.log(data.slice(0, 2000));

	const $ = cheerio.load(data);

	const title =
		$('meta[property="og:title"]').attr("content") || $("title").text();

	const image = $('meta[property="og:image"]').attr("content");

	let video = null;

	// 1️⃣ пытаемся взять из runParams
	const runParams = data.match(/window\.runParams\s*=\s*({.*?});/s);

	if (runParams) {
		try {
			const json = JSON.parse(runParams[1]);

			video =
				json?.videoModule?.videoList?.[0]?.playUrl ||
				json?.videoModule?.videoList?.[0]?.videoUrl ||
				null;
		} catch {}
	}

	// 2️⃣ если не нашли — ищем в INITIAL_STATE
	if (!video) {
		const initialState = data.match(
			/window\.__INITIAL_STATE__\s*=\s*({.*?});/s,
		);

		if (initialState) {
			try {
				const json = JSON.parse(initialState[1]);

				video =
					json?.item?.video?.playUrl ||
					json?.item?.video?.videoUrl ||
					json?.item?.video?.url ||
					null;
			} catch {}
		}
	}

	return {
		title,
		image,
		video,
		url,
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

async function processQueue() {
	if (queue.length === 0) return;

	const url = queue.shift();
	saveQueue();

	try {
		const product = await parseProduct(url);

		// console.log("VIDEO:", product.video);

		product.title = shortenTitle(await translateTitle(product.title));

		const hook = hooks[Math.floor(Math.random() * hooks.length)];
		const linkText =
			linkTexts[Math.floor(Math.random() * linkTexts.length)];
		const subscribe =
			subscribeTexts[
				Math.floor(Math.random() * subscribeTexts.length)
			];

		try {
			if (product.video) {
				// await bot.sendVideo(CHANNEL, { url: product.video });
				await bot.sendVideo(CHANNEL, { url: product.video }, {
					caption: `${hook}\n\n${product.title}\n${product.url}\n\n${subscribe}`,
					reply_markup: {
						inline_keyboard: [[{ text: linkText, url: product.url }]],
					},
				});
			} else {
				throw new Error("Видео нет");
			}
		} catch {
			await bot.sendPhoto(CHANNEL, product.image, {
				caption: `${hook}\n\n${product.title}\n${product.url}\n\n${subscribe}`,
				reply_markup: {
					inline_keyboard: [[{ text: linkText, url: product.url }]],
				},
			});
		}

	} catch (e) {
		console.log("Ошибка постинга", e.message);
	}
}

// 5000 = 5 сек
// 60000 = 1 минута
// 300000 = 5 минут
// 900000 = 15 минут
// 1800000 = 30 минут
// 3600000 = 60 минут
setInterval(processQueue, 5000);



bot.on("message", async (msg) => {
	if (!allowedUsers.includes(msg.from.id)) {
		return;
	}

	const urls = msg.text.split("\n").filter((l) => l.includes("aliexpress"));
	for (const url of urls) {
		queue.push(url);
		saveQueue();
	}

	bot.sendMessage(
		msg.chat.id,
		// `Добавлено ссылок: ${urls.length}\nВ очереди: ${queue.length}`,
		`Добавлено ссылок: ${urls.length}`,
	);
});
