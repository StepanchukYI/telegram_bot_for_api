var config = require('./config.json');

const TelegramBot = require('node-telegram-bot-api'),
    request = require('request'),
    bot = new TelegramBot(config.token, {polling: true});

// Listen for any kind of message. There are different kinds of
// messages.

var users = [];

bot.onText(/\/category/, (msg) => {
    sendCategory(msg);
});
bot.onText(/\/information/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Пока так, а там продолжим!)');
});
bot.onText(/\/basket/, (msg) => {
    viewCart(msg);
});
bot.onText(/\/promo/, (msg) => {

});
bot.onText(/\/consultation/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Пока так, а там продолжим!)');
});
bot.onText(/\/exit/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Пока так, а там продолжим!)');
});
bot.onText(/\/start/, (msg) => {
    mainMenu(msg);
    sendCategory(msg);
});
bot.on('message', (msg) => {
    getUser(msg.chat);
    removeMessage(msg);

    if (msg.text === 'Смотреть товары') {
        sendCategory(msg);
    }
    if (msg.text === 'Информация') {
        bot.sendMessage(msg.chat.id, 'Пока так, а там продолжим!)');
    }
    if (msg.text === 'Корзина') {
        viewCart(msg);
    }
    if (msg.text === 'Получить промокод') {
        getPromo(msg);
    }
    if (msg.text === 'Консультация') {
        bot.sendMessage(msg.chat.id, 'Если не нашел информацию для себя, свяжись с нами по этому телеграм каналу @123123123');
    }
    if (msg.text === 'Отмена') {
        mainMenu(msg)
    }
});

// Handle callback queries
bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    var action = callbackQuery.data.split(":");
    const msg = callbackQuery.message;
    getUser(msg.chat);
    removeMessage(msg);
    if (action[0] == 'category') {
        category = [];
        if (action[1]) {
            category.push(action[1]);
        }
        if (action[2]) {
            category.push(action[2]);
        }
        if (category[0] != 0) {
            sendProductOffset(category, msg, 0);
        }
        sendSubCategory(category, msg);
    }
    else if (action[0] == 'product') {
        if (action[1] == 'id') {
            sendSingleProduct(action[2], msg);
        }
        else if (action[1] == 'offset') {
            data4 = parseInt(action[4]);
            sendProductOffset(category, msg, action[3]);
        }
        else if (action[1] == 'back') {
            sendCategory(msg);
        }
        else if (action[1] == 'addCart') {
            addProductToCart(action[2], msg, true)
        }
        else if (action[1] == 'deleteCart') {
            addProductToCart(action[2], msg, false)
        }
    }
    else if (action[0] == 'order') {
        if (action[1] == 'checkout') {
            console.log(action);

            orderCheckout(msg);
        }
    }
});

function sendProductOffset(category, msg, off) {
    let offset = parseInt(off);
    request.post(config.host + 'product/list', {json: {category_id: category[0], limit: 4, offset: offset}},
        (error, response, body) => {
            if (!error && response.statusCode == 200) {
                if (body.products.length > 0) {
                    var products = body.products;
                    var btnArray = [];
                    var tempArray = [];
                    var mediaArray = [];
                    var dataArray = [];
                    for (let i in products) {
                        dataArray.push({
                            text: !!products[i].product_name ? products[i].product_name : "Название отсутствует",
                            callback_data: 'product:id:' + products[i].product_id,
                        });
                        tempArray.push({
                            type: "photo",
                            media: products[i].product_image_urls[0],
                        });

                        if (dataArray.length == 2 || i == products.length - 1) {
                            mediaArray.push(tempArray);
                            btnArray.push(dataArray);
                            tempArray = [];
                            dataArray = [];
                        }
                    }

                    productsOption = {
                        parse_mode: "HTML",
                        disable_web_page_preview: false,
                        reply_markup: JSON.stringify({
                            inline_keyboard: [btnArray[0]]
                        })
                    };

                    bot.sendMessage(msg.chat.id, 'Выбирай товар!', productsOption)
                        .then((answer) => {
                            users[msg.chat.id].messages.push(answer.message_id);
                            bot.sendMediaGroup(msg.chat.id, mediaArray[0])
                                .then((answer) => {
                                    for (let k in answer) {
                                        users[msg.chat.id].messages.push(answer[k].message_id);
                                    }
                                    if (mediaArray[1] && btnArray[1]) {
                                        productsOption = {
                                            parse_mode: "HTML",
                                            disable_web_page_preview: false,
                                            reply_markup: JSON.stringify({
                                                inline_keyboard: [btnArray[1]]
                                            })
                                        };
                                        bot.sendMessage(msg.chat.id, 'Выбирай товар!', productsOption)
                                            .then((answer) => {
                                                users[msg.chat.id].messages.push(answer.message_id);
                                                bot.sendMediaGroup(msg.chat.id, mediaArray[1])
                                                    .then((answer) => {
                                                        for (let k in answer) {
                                                            users[msg.chat.id].messages.push(answer[k].message_id);
                                                        }
                                                        pagination = {
                                                            parse_mode: "HTML",
                                                            disable_web_page_preview: false,
                                                            reply_markup: JSON.stringify({
                                                                inline_keyboard: [
                                                                    [
                                                                        {
                                                                            text: 'Предыдущая страница',
                                                                            callback_data: 'product:offset:' + category[0] + ':' + offset ? (offset - products.length) : 0 + ':' + products.length,
                                                                        },
                                                                        {
                                                                            text: 'Следующая страница',
                                                                            callback_data: 'product:offset:' + category[0] + ':' + (offset + products.length) + ':' + products.length,
                                                                        }
                                                                    ]
                                                                ]
                                                            })
                                                        };
                                                        bot.sendMessage(msg.chat.id, 'Следующая страница', pagination).then((answer) => {
                                                            users[msg.chat.id].messages.push(answer.message_id);
                                                        });
                                                    });
                                            });

                                    } else {
                                        pagination = {
                                            parse_mode: "HTML",
                                            disable_web_page_preview: false,
                                            reply_markup: JSON.stringify({
                                                inline_keyboard: [
                                                    [
                                                        {
                                                            text: 'Предыдущая страница',
                                                            callback_data: 'product:offset:' + category[0] + ':' + offset ? (offset - products.length) : 0 + ':' + products.length,
                                                        },
                                                        {
                                                            text: 'Следующая страница',
                                                            callback_data: 'product:offset:' + category[0] + ':' + (offset + products.length) + ':' + products.length,
                                                        }
                                                    ]
                                                ]
                                            })
                                        };
                                        bot.sendMessage(msg.chat.id, 'Следующая страница', pagination).then((answer) => {
                                            users[msg.chat.id].messages.push(answer.message_id);
                                        });
                                    }

                                });
                        });
                }
            }
        });
}

function sendSingleProduct(product_id, msg) {
    var flag = false;
    request.get(config.host + 'product/get/?product_id=' + product_id,
        (error, response, body) => {
            if (!error && response.statusCode == 200) {
                if (JSON.parse(body).products.length > 0) {
                    product = JSON.parse(body).products[0];
                    if (!users[msg.chat.id].products || users[msg.chat.id].products.length == 0) {
                        users[msg.chat.id].products = [];
                    } else {
                        for (i = 0; i < users[msg.chat.id].products.length; i++) {
                            if (users[msg.chat.id].products[i] == product.product_id) {
                                flag = true;
                            }
                        }
                    }
                    catOption1 = {
                        parse_mode: "HTML",
                        disable_web_page_preview: false,
                        reply_markup: JSON.stringify({
                            inline_keyboard: [[{
                                text: (flag ? 'Убрать из корзины' : 'Добавить в корзину'),
                                callback_data: 'product:' + (flag ? 'deleteCart' : 'addCart') + ':' + product.product_id,

                            },
                                {
                                    text: 'Вернуться назад',
                                    callback_data: 'product:back'
                                }]]
                        })
                    };
                    images = [];
                    for (let i in product.product_image_urls) {
                        images.push(
                            {
                                type: "photo",
                                media: product.product_image_urls[i],
                            }
                        )
                    }
                    bot.sendMessage(msg.chat.id, product.product_name + "\n" + product.full_description, catOption1)
                        .then((answer) => {
                            users[msg.chat.id].messages.push(answer.message_id);
                            bot.sendMediaGroup(msg.chat.id, images).then((answer) => {
                                for (let i in answer) {
                                    users[msg.chat.id].messages.push(answer[i].message_id);
                                }
                            });
                        });
                }
            }
        });
}

function addProductToCart(product_id, msg, action) {
    flag = false;
    if (!users[msg.chat.id].products || users[msg.chat.id].products.length == 0) {
        users[msg.chat.id].products = [];
    } else {
        for (i = 0; i < users[msg.chat.id].products.length; i++) {
            if (users[msg.chat.id].products[i] == product_id) {
                if (!action) {
                    users[msg.chat.id].products.splice(users[msg.chat.id].products.indexOf(users[msg.chat.id].products[i]), 1);
                    var opts = {
                        inline_keyboard: [
                            [
                                {
                                    text: 'Добавить в корзину',
                                    callback_data: 'product:addCart:' + product_id,

                                },
                                {
                                    text: 'Вернуться назад',
                                    callback_data: 'product:back'
                                }
                            ]
                        ]
                    };
                    bot.editMessageText('Товар удален из корзины.', {
                        chat_id: msg.chat.id,
                        message_id: msg.message_id,
                        reply_markup: opts,
                    });
                }
                flag = true;
            }
        }
    }
    if (!flag) {
        users[msg.chat.id].products.push({product_id: product_id});
        var opts = {
            inline_keyboard: [
                [
                    {
                        text: 'Убрать из корзины',
                        callback_data: 'product:deleteCart:' + product_id,

                    },
                    {
                        text: 'Вернуться назад',
                        callback_data: 'product:back'
                    }
                ]
            ]
        };
        bot.editMessageText('Товар успешно добавлен в корзину.', {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            reply_markup: opts,
        });
    }

}

function viewCart(msg) {
    if (!users[msg.chat.id].products || users[msg.chat.id].products.length == 0) {
        catOption1 = {
            parse_mode: "HTML",
            disable_web_page_preview: false,
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [
                        {
                            text: "Вернуться назад",
                            callback_data: 'category:0:Выбирай категорию!'
                        }
                    ]
                ]
            })
        };
        bot.sendMessage(msg.chat.id, "Корзина пуста. Чтобы добавить товары в корзину, вернитесь назад", catOption1);

        return 0;
    }
    else {
        var dataArray = [];
        var btnArray = [];
        for (let i = 0; i < users[msg.chat.id].products.length; i++) {
            request.get(config.host + 'product/get/?product_id=' + users[msg.chat.id].products[i].product_id,
                (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        if (JSON.parse(body).products.length > 0) {
                            product = JSON.parse(body).products[0];
                            dataArray.push({
                                text: !!product.product_name ? product.product_name : "Название отсутствует",
                                callback_data: 'product:id:' + product.product_id,

                            });
                            if (dataArray.length > 1 || i + 1 == users[msg.chat.id].products.length) {
                                btnArray.push(dataArray);
                                dataArray = [];
                            }
                            if (i + 1 == users[msg.chat.id].products.length) {
                                btnArray.push([{
                                    text: "Оформить заказ",
                                    callback_data: 'order:checkout'
                                }]);
                                btnArray.push([{
                                    text: "Вернуться назад",
                                    callback_data: 'category:0:Выбирай категорию!'
                                }]);

                                productsOption = {
                                    parse_mode: "HTML",
                                    disable_web_page_preview: false,
                                    reply_markup: JSON.stringify({
                                        inline_keyboard: btnArray
                                    })
                                };

                                bot.sendMessage(msg.chat.id, "Вот все товары в корзине", productsOption)
                            }
                        }
                    }

                }
            )
        }


    }

}

function orderCheckout(msg) {
    if (!users[msg.chat.id].user_phone && users[msg.chat.id].products && users[msg.chat.id].products.length > 0) {
        var option = {
            parse_mode: "Markdown",
            reply_markup: {
                one_time_keyboard: true,
                keyboard: [
                    [{
                        text: "Мой номер телефона",
                        request_contact: true
                    }],
                    [
                        "Отмена"
                    ]
                ]
            }
        };
        bot.sendMessage(msg.chat.id, 'Введи свой номер телефона, чтобы провести регистрацию и оформление заказа)', option).then(() => {
            bot.once("contact", (msg) => {
                users[msg.chat.id].user_phone = msg.contact.phone_number;
                option = {
                    reply_markup: {
                        one_time_keyboard: true,
                        keyboard: [
                            [
                                {
                                    text: "Смотреть товары",
                                    callback_data: '/categories'
                                },
                                {
                                    text: "Информация",
                                    callback_data: '/information'
                                }
                            ],
                            [
                                {
                                    text: "Корзина",
                                    callback_data: '/basket'
                                },
                                {
                                    text: "Получить промокод",
                                    callback_data: '/promo'
                                }
                            ],
                            [
                                {
                                    text: "Консультация",
                                    callback_data: '/consultation'
                                },
                                {
                                    text: "Отмена",
                                    callback_data: '/exit'
                                }
                            ]
                        ]
                    }
                };
                bot.sendMessage(msg.chat.id, 'Спасибо, ' + msg.contact.first_name + ' , за твой телефон ' + msg.contact.phone_number + '! Провожу оформление заказа))', option).then(() => {
                    checkout(msg);
                });
            });

        });
    }
    else {
        checkout(msg);
    }
}

function checkout(msg) {
    request.post(config.host + 'order', {
            json: {
                name: users[msg.chat.id].user_name,
                surename: users[msg.chat.id].user_last_name,
                phone: users[msg.chat.id].user_phone,
                pay_type: 1,
                basket_list: users[msg.chat.id].products,
                delivery_type: 1
            }
        },
        (error, response, body) => {
            console.log(response);
            if (!error && response.statusCode == 200) {
                console.log(body);
            }
        });
}

function removeMessage(msg) {
    if (users[msg.chat.id].messages && users[msg.chat.id].messages.length > 0) {
        for (let i in users[msg.chat.id].messages) {
            bot.deleteMessage(msg.chat.id, users[msg.chat.id].messages[i]);
        }
        users[msg.chat.id].messages = [];
    }
}

function getUser(user) {
    if (!users[user.id]) {
        user = users[user.id] = {
            user_id: user.id,
            user_name: user.first_name,
            user_last_name: user.last_name,
            messages: [],
            main_cat_message_id: []
        };
    } else {
        user = users[user.id];
    }
    return user;
}

function sendSubCategory(category, msg) {
    if (category[0] == '0') {
        sendCategory(msg);
    }
    else {
        request.get(config.host + 'product/category/?category_id=' + category[0],
            (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    categories = JSON.parse(body).categories;
                    categoryArray = [];
                    dataArray = [];
                    for (let i = 0; i < categories.length; i++) {
                        dataArray.push({
                            text: categories[i].category_name,
                            callback_data: 'category:' + categories[i].category_id + ':' + categories[i].category_name
                        });
                        if (dataArray.length == 2) {
                            categoryArray.push(dataArray);
                            dataArray = [];
                        }
                    }

                    categoryArray.push([{
                        text: "Вернуться назад",
                        callback_data: 'category:0:Выбирай категорию!'
                    }]);

                    catOption = {
                        parse_mode: "HTML",
                        disable_web_page_preview: false,
                        reply_markup: JSON.stringify({
                            inline_keyboard: categoryArray
                        })
                    };
                    bot.sendMessage(msg.chat.id, 'Категория ' + category[1] + ' :', catOption).then((answer) => {
                        bot.deleteMessage(msg.chat.id, users[msg.chat.id].main_cat_message_id);
                        users[msg.chat.id].main_cat_message_id = answer.message_id;
                    });
                }
            });
    }
}

function sendCategory(msg) {

    var keyboard = [
        [{text: '🍑 Бельё 🔥', callback_data: 'category:6:🍑 Бельё 🔥'}, {
            text: '👙 Купальники 👙',
            callback_data: 'category:7:👙 Купальники 👙'
        }],
        [{text: '👚 Одежда 👘👗', callback_data: 'category:5:👚 Одежда 👘👗'}, {
            text: '💄 Косметика 👄',
            callback_data: 'category:9:💄 Косметика 👄'
        }],
        [{text: '💍 Аксессуары 🕶', callback_data: 'category:10:💍 Аксессуары 🕶'}, {
            text: '🏁 Финальная распродажа 🎰',
            callback_data: 'category:54:🏁 Финальная распродажа 🎰'
        }],
        [{text: '💗 PINK 💕', callback_data: 'category:56:💗 PINK 💕'}, {
            text: '🎁 Подарки 🎊',
            callback_data: 'category:57:🎁 Подарки 🎊'
        }]
    ];

    catOption = {
        parse_mode: "HTML",
        disable_web_page_preview: false,
        reply_markup: JSON.stringify({
            inline_keyboard: keyboard
        })
    };
    bot.sendMessage(msg.chat.id, 'Выбирай категорию!', catOption).then((answer) => {
        bot.deleteMessage(msg.chat.id, users[msg.chat.id].main_cat_message_id);
        users[msg.chat.id].main_cat_message_id = answer.message_id;
    });
}

function mainMenu(msg) {
    var option = {
        parse_mode: "Markdown",
        reply_markup: {
            one_time_keyboard: true,
            keyboard: [
                [
                    {
                        text: "Смотреть товары",
                        callback_data: 'categories'
                    },
                    {
                        text: "Информация",
                        callback_data: 'information'
                    }
                ],
                [
                    {
                        text: "Корзина",
                        callback_data: 'basket'
                    },
                    {
                        text: "Получить промокод",
                        callback_data: 'promo'
                    }
                ],
                [
                    {
                        text: "Консультация",
                        callback_data: 'consultation'
                    },
                    {
                        text: "Отмена",
                        callback_data: 'exit'
                    }
                ]
            ]
        }
    };
    bot.sendMessage(msg.chat.id, 'Добро пожаловать к нам в чатик, ' + msg.from.first_name + '. Выбирай категорию и давай продолжим!)', option).then((answer) => {
        users[msg.chat.id].messages.push(answer.message_id);
    });

}

function getPromo(msg) {
    var option = {
        parse_mode: "Markdown",
        reply_markup: {
            one_time_keyboard: true,
            keyboard: [
                [{
                    text: "Мой номер телефона",
                    request_contact: true
                }],
                [
                    "Отмена"
                ]
            ]
        }
    };


    bot.sendMessage(msg.chat.id, 'Введи свой номер телефона, чтобы плучить промокод!)', option).then(() => {
        bot.once("contact", (msg) => {
            users[msg.chat.id].user_phone = msg.contact.phone_number;
            option = {
                reply_markup: {
                    one_time_keyboard: true,
                    keyboard: [
                        [
                            {
                                text: "Смотреть товары",
                                callback_data: '/categories'
                            },
                            {
                                text: "Информация",
                                callback_data: '/information'
                            }
                        ],
                        [
                            {
                                text: "Корзина",
                                callback_data: '/basket'
                            },
                            {
                                text: "Получить промокод",
                                callback_data: '/promo'
                            }
                        ],
                        [
                            {
                                text: "Консультация",
                                callback_data: '/consultation'
                            },
                            {
                                text: "Отмена",
                                callback_data: '/exit'
                            }
                        ]
                    ]
                }
            };
            bot.sendMessage(msg.chat.id, 'Спасибо, ' + msg.contact.first_name + ' , за твой телефон ' + msg.contact.phone_number + '! Сейчас вот тебе промокод, пользуйся на здоровье!))', option);

        });

    });
}
