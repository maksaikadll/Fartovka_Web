const express = require('express');
const session = require('express-session');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройки OAuth (замените на свои реальные ключи)
const OAUTH_CONFIG = {
    github: {
        clientId: process.env.GITHUB_CLIENT_ID || 'your_github_client_id',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || 'your_github_client_secret',
        redirectUri: 'http://localhost:3000/auth/github/callback',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userUrl: 'https://api.github.com/user',
        scope: 'user:email'
    },
    discord: {
        clientId: process.env.DISCORD_CLIENT_ID || 'your_discord_client_id',
        clientSecret: process.env.DISCORD_CLIENT_SECRET || 'your_discord_client_secret',
        redirectUri: 'http://localhost:3000/auth/discord/callback',
        authUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        userUrl: 'https://discord.com/api/users/@me',
        scope: 'identify email'
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || 'your_google_client_id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret',
        redirectUri: 'http://localhost:3000/auth/google/callback',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: 'openid email profile'
    }
};

// Middleware
app.use(express.json());
app.use(express.static('.')); // Раздача статических файлов

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_session_secret_key_change_in_production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // В production установите true для HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 часа
    }
}));

// Генерация случайного состояния для защиты от CSRF
function generateState() {
    return crypto.randomBytes(32).toString('hex');
}

// Проверка аутентификации
function requireAuth(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/account.html');
}

// Роуты для OAuth

// Инициация OAuth авторизации
app.get('/auth/:provider', (req, res) => {
    const provider = req.params.provider;
    const config = OAUTH_CONFIG[provider];

    if (!config) {
        return res.status(400).json({ error: 'Unknown OAuth provider' });
    }

    const state = generateState();
    req.session.oauthState = state;

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scope,
        response_type: 'code',
        state: state
    });

    if (provider === 'google') {
        params.set('access_type', 'offline');
        params.set('prompt', 'consent');
    }

    const authUrl = `${config.authUrl}?${params.toString()}`;
    res.redirect(authUrl);
});

// Обработка OAuth callback
app.get('/auth/:provider/callback', async (req, res) => {
    const provider = req.params.provider;
    const { code, state } = req.query;
    const config = OAUTH_CONFIG[provider];

    try {
        // Проверка состояния для защиты от CSRF
        if (state !== req.session.oauthState) {
            throw new Error('Invalid OAuth state');
        }

        // Обмен кода на токен доступа
        const tokenResponse = await axios.post(config.tokenUrl, null, {
            params: {
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code: code,
                redirect_uri: config.redirectUri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Accept': 'application/json'
            }
        });

        const { access_token, token_type } = tokenResponse.data;

        // Получение данных пользователя
        const userResponse = await axios.get(config.userUrl, {
            headers: {
                'Authorization': `${token_type || 'Bearer'} ${access_token}`,
                'Accept': 'application/json'
            }
        });

        let userData = userResponse.data;

        // Для GitHub нужно получить email отдельно
        if (provider === 'github' && !userData.email) {
            const emailResponse = await axios.get('https://api.github.com/user/emails', {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Accept': 'application/json'
                }
            });
            const emails = emailResponse.data;
            const primaryEmail = emails.find(email => email.primary && email.verified);
            if (primaryEmail) {
                userData.email = primaryEmail.email;
            }
        }

        // Создание или обновление пользователя
        const user = await createOrUpdateUser(provider, userData);

        // Сохранение пользователя в сессии
        req.session.user = user;
        req.session.oauthProvider = provider;
        req.session.accessToken = access_token;

        // Перенаправление в личный кабинет
        res.redirect('/dashboard.html');

    } catch (error) {
        console.error(`OAuth error for ${provider}:`, error.response?.data || error.message);
        res.redirect('/account.html?error=oauth_failed');
    }
});

// Получение данных текущего пользователя
app.get('/api/user', requireAuth, (req, res) => {
    res.json({
        user: req.session.user,
        provider: req.session.oauthProvider
    });
});

// Выход из системы
app.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

// Имитация работы с пользователями (в production замените на настоящую базу данных)
const users = new Map();

async function createOrUpdateUser(provider, oauthData) {
    const oauthId = oauthData.id;
    const key = `${provider}_${oauthId}`;

    let user = users.get(key);

    if (!user) {
        // Создание нового пользователя
        const nickname = generateUniqueNickname(provider, oauthData);
        user = {
            id: Date.now(),
            nickname: nickname,
            email: oauthData.email || null,
            oauthProvider: provider,
            oauthId: oauthId,
            avatar: getAvatarUrl(provider, oauthData),
            createdAt: new Date().toISOString(),
            friends: [],
            stats: {
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                winRate: 0
            }
        };
        users.set(key, user);
        console.log(`Created new user: ${nickname} (${provider})`);
    } else {
        // Обновление существующего пользователя
        user.email = oauthData.email || user.email;
        user.avatar = getAvatarUrl(provider, oauthData);
        console.log(`Updated existing user: ${user.nickname} (${provider})`);
    }

    return user;
}

function generateUniqueNickname(provider, data) {
    const baseName = data.login || data.username || data.name ||
                    data.global_name || `${provider}_user_${data.id}`;

    // Удаление специальных символов и приведение к нижнему регистру
    let nickname = baseName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    // Убеждаемся в уникальности
    let counter = 1;
    let originalNickname = nickname;
    while (Array.from(users.values()).some(u => u.nickname === nickname)) {
        nickname = `${originalNickname}_${counter}`;
        counter++;
    }

    return nickname;
}

function getAvatarUrl(provider, data) {
    switch (provider) {
        case 'github':
            return data.avatar_url;
        case 'discord':
            return data.avatar
                ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
                : null;
        case 'google':
            return data.picture;
        default:
            return null;
    }
}

// Middleware для обработки ошибок
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📝 OAuth providers configured:');
    console.log('   • GitHub:', OAUTH_CONFIG.github.clientId !== 'your_github_client_id' ? '✅' : '❌');
    console.log('   • Discord:', OAUTH_CONFIG.discord.clientId !== 'your_discord_client_id' ? '✅' : '❌');
    console.log('   • Google:', OAUTH_CONFIG.google.clientId !== 'your_google_client_id' ? '✅' : '❌');
});