// Простая OAuth интеграция без сервера
// Использует только перенаправления на OAuth провайдеров

const SIMPLE_OAUTH_CONFIG = {
    github: {
        name: 'GitHub',
        authUrl: 'https://github.com/login/oauth/authorize',
        clientId: 'your_github_client_id', // Замените на настоящий Client ID
        scope: 'user:email',
        redirectUri: window.location.origin + '/oauth/callback.html'
    },
    discord: {
        name: 'Discord',
        authUrl: 'https://discord.com/api/oauth2/authorize',
        clientId: 'your_discord_client_id', // Замените на настоящий
        scope: 'identify email',
        redirectUri: window.location.origin + '/oauth/callback.html'
    },
    google: {
        name: 'Google',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        clientId: 'your_google_client_id', // Замените на настоящий
        scope: 'openid email profile',
        redirectUri: window.location.origin + '/oauth/callback.html'
    }
};

function redirectToOAuth(provider) {
    const config = SIMPLE_OAUTH_CONFIG[provider];
    if (!config) {
        alert(`OAuth провайдер ${provider} не настроен`);
        return;
    }

    // Проверяем, настроен ли провайдер
    if (config.clientId.includes('your_') || config.clientId === '') {
        const setupInstructions = {
            google: `Google OAuth не настроен!\n\nБыстрая настройка:\n1. Перейдите: https://console.cloud.google.com/\n2. Создайте проект → APIs & Services → Credentials\n3. OAuth 2.0 Client ID → Web application\n4. Redirect URI: ${config.redirectUri}\n5. Скопируйте Client ID в oauth-simple.js\n\nПодробная инструкция в README.md`,
            discord: `Discord OAuth не настроен!\n\nБыстрая настройка:\n1. Перейдите: https://discord.com/developers/applications\n2. New Application → OAuth2 → General\n3. Redirects: ${config.redirectUri}\n4. Скопируйте Client ID в oauth-simple.js\n\nПодробная инструкция в README.md`,
            github: `GitHub OAuth не настроен!\n\nБыстрая настройка:\n1. Перейдите: https://github.com/settings/developers\n2. New OAuth App → Authorization callback URL: ${config.redirectUri}\n3. Скопируйте Client ID в oauth-simple.js\n\nПодробная инструкция в README.md`
        };

        const shouldContinue = confirm(`${setupInstructions[provider]}\n\nВыберите опцию:\n- OK: Попробовать демо-режим (может не сработать)\n- Отмена: Открыть README.md с инструкциями`);

        if (!shouldContinue) {
            window.open('https://github.com/maksaikadll/Fartovka_Web/blob/main/README.md#режим-без-сервера-github-pages', '_blank');
            return;
        }
    }

    // Генерируем состояние для защиты
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_provider', provider);

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

    // Для демо-режима (если Client ID не настроен) перенаправляем на callback с демо-параметрами
    if (config.clientId.includes('your_')) {
        // Демо-режим: имитируем успешную авторизацию через callback
        const demoState = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('oauth_provider', provider);
        // Не устанавливаем oauth_state, чтобы callback понял, что это демо

        // Перенаправляем на callback с демо-параметрами
        const callbackUrl = `${window.location.origin}/oauth/callback.html?code=demo_${provider}_${Date.now()}&state=demo`;
        window.location.href = callbackUrl;
        return;
    }

    const authUrl = `${config.authUrl}?${params.toString()}`;
    window.location.href = authUrl;
}

function demoOAuthLogin(provider) {
    // Имитируем успешную OAuth авторизацию
    const demoUsers = {
        github: {
            id: '12345',
            login: 'demo_github_user',
            email: 'demo@github.com',
            name: 'Demo GitHub User',
            avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4'
        },
        discord: {
            id: '67890',
            username: 'demo_discord_user',
            email: 'demo@discord.com',
            global_name: 'Demo Discord User',
            avatar: null
        },
        google: {
            id: '11111',
            email: 'demo@gmail.com',
            name: 'Demo Google User',
            picture: 'https://lh3.googleusercontent.com/a/default-avatar'
        }
    };

    const userData = demoUsers[provider];
    if (!userData) return;

    // Создаем пользователя
    const nickname = generateUniqueNickname(provider, userData);
    const user = {
        id: Date.now(),
        nickname: nickname,
        email: userData.email || null,
        oauthProvider: provider,
        oauthId: userData.id,
        avatar: getAvatarUrl(provider, userData),
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

    // Сохраняем в localStorage
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('isLoggedIn', 'true');

    // Имитируем перенаправление
    alert(`🎉 Демо-${provider} авторизация успешна!\n\nПользователь: ${user.nickname}\nEmail: ${user.email}\n\nПеренаправление в личный кабинет...`);

    setTimeout(() => {
        window.location.href = '/dashboard.html';
    }, 1000);
}

function generateUniqueNickname(provider, data) {
    const baseName = data.login || data.username || data.name || data.global_name || `${provider}_user`;
    let nickname = baseName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    let counter = 1;
    const originalNickname = nickname;
    while (localStorage.getItem(`user_${nickname}`)) {
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

// Экспорт для глобального использования
window.redirectToOAuth = redirectToOAuth;
window.demoOAuthLogin = demoOAuthLogin;