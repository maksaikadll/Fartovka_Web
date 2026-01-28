// Version 1.2.1
const navbar = document.querySelector('.navbar');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

window.addEventListener('scroll', () => {
    if (!navbar) return;
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
});

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });
}


const ACCOUNT_API_URL = 'http://web4.informatics.ru:82/api/0b7f6114de5a56625f4a9a0c19e57123';

const accountTabs = document.querySelectorAll('.account-tabs .tab-btn');
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');

const registerNicknameInput = document.getElementById('register-nickname');
const registerEmailInput = document.getElementById('register-email');
const registerPasswordInput = document.getElementById('register-password');
const registerMessage = document.getElementById('register-message');

const loginNicknameInput = document.getElementById('login-nickname');
const loginPasswordInput = document.getElementById('login-password');
const loginMessage = document.getElementById('login-message');
const myAccountCard = document.getElementById('my-account-card');
const profileAvatar = document.getElementById('profile-avatar');
const profileName = document.getElementById('profile-name');
const profileSub = document.getElementById('profile-sub');
const profileEmail = document.getElementById('profile-email');
const profileCreated = document.getElementById('profile-created');
const profileId = document.getElementById('profile-id');
const profileCopyIdBtn = document.getElementById('profile-copy-id');
const profileDeleteBtn = document.getElementById('profile-delete');

let accountUsers = [];
let currentIp = null;

const resolveClientIp = async () => {
    if (currentIp) return currentIp;
    try {
        const resp = await fetch('https://api.ipify.org?format=json');
        if (!resp.ok) throw new Error('Bad IP response');
        const data = await resp.json();
        currentIp = data.ip || null;
    } catch (e) {
        console.error('Не удалось получить IP клиента:', e);
        currentIp = null;
    }
    return currentIp;
};

const getInitials = (nickname) => {
    const s = (nickname || '').trim();
    if (!s) return '?';
    return s.slice(0, 2).toUpperCase();
};

const formatDateRu = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('ru-RU');
};

const renderMyAccount = (user) => {
    if (!myAccountCard) return;

    if (!user) {
        myAccountCard.style.display = 'none';
        return;
    }

    myAccountCard.style.display = '';
    if (profileAvatar) profileAvatar.textContent = getInitials(user.nickname);
    if (profileName) profileName.textContent = user.nickname || '—';
    if (profileSub) profileSub.textContent = 'Игровой профиль';
    if (profileEmail) profileEmail.textContent = user.email || '—';
    if (profileCreated) profileCreated.textContent = formatDateRu(user.createdAt);
    if (profileId) profileId.textContent = String(user.id ?? '—');
};

if (accountTabs) {
    accountTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetForm = tab.getAttribute('data-form');

            if (tab.classList.contains('active')) return;

            accountTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const allForms = document.querySelectorAll('.account-form');
            allForms.forEach(form => {
                if (form.id === `${targetForm}-form`) {
                    form.classList.add('active');
                    form.style.display = 'block';
                    form.classList.add('fade-in');
                    setTimeout(() => {
                        form.classList.remove('fade-in');
                    }, 600);
                } else {
                    form.classList.remove('active');
                    form.classList.add('fade-out');
                    setTimeout(() => {
                        form.style.display = 'none';
                        form.classList.remove('fade-out');
                    }, 600);
                }
            });
        });
    });
}

const hashPassword = (password) => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
};

const setAccountMessage = (messageElement, text, type = 'info') => {
    if (!messageElement) return;
    messageElement.textContent = text;
    messageElement.classList.remove('account-message--success', 'account-message--error');
    if (type === 'success') messageElement.classList.add('account-message--success');
    if (type === 'error') messageElement.classList.add('account-message--error');
};

const loadAccountData = async () => {
    try {
        await resolveClientIp();
        const response = await fetch(ACCOUNT_API_URL);
        if (!response.ok) throw new Error('Не удалось загрузить данные аккаунтов');
        const data = await response.json();
        accountUsers = (data && Array.isArray(data.users)) ? data.users : [];

        let myAcc = null;
        if (currentIp && accountUsers.length) {
            const sameIp = accountUsers.filter(u => u.ip && u.ip === currentIp);
            if (sameIp.length) {
                sameIp.sort((a, b) => {
                    const da = new Date(a.createdAt || 0).getTime();
                    const db = new Date(b.createdAt || 0).getTime();
                    return db - da;
                });
                myAcc = sameIp[0];
            }
        }
        renderMyAccount(myAcc);
    } catch (error) {
        console.error('Ошибка при загрузке аккаунтов:', error);
        setAccountMessage('Не удалось загрузить данные аккаунтов. Попробуйте позже.', 'error');
        accountUsers = [];
        renderMyAccount(null);
    }
};

const saveAccountData = async () => {
    const payload = { users: accountUsers };

    const response = await fetch(ACCOUNT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Не удалось сохранить данные аккаунта');
    return response.json().catch(() => ({}));
};

if (registerForm) {
    loadAccountData();

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nickname = (registerNicknameInput?.value || '').trim();
        const email = (registerEmailInput?.value || '').trim();
        const password = (registerPasswordInput?.value || '').trim();

        if (!nickname) {
            setAccountMessage(registerMessage, 'Введите никнейм.', 'error');
            return;
        }

        if (!password) {
            setAccountMessage(registerMessage, 'Введите пароль.', 'error');
            return;
        }

        try {
            await resolveClientIp();

            if (!currentIp) {
                setAccountMessage(registerMessage, 'Не удалось определить ваш IP адрес. Попробуйте позже.', 'error');
                return;
            }

            await loadAccountData();

            const exists = accountUsers.some(
                (user) => user.nickname && user.nickname.toLowerCase() === nickname.toLowerCase()
            );
            if (exists) {
                setAccountMessage(registerMessage, 'Игрок с таким никнеймом уже существует.', 'error');
                return;
            }

            const hashedPassword = hashPassword(password);
            const newUser = {
                id: Date.now(),
                nickname,
                email: email || null,
                password: hashedPassword,
                createdAt: new Date().toISOString(),
                ip: currentIp,
                friends: [],
                stats: {
                    gamesPlayed: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    winRate: 0
                }
            };

            accountUsers.push(newUser);
            await saveAccountData();

            setAccountMessage(registerMessage, 'Аккаунт успешно создан! Перенаправление в личный кабинет...', 'success');

            localStorage.setItem('currentUser', JSON.stringify(newUser));
            localStorage.setItem('isLoggedIn', 'true');

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } catch (error) {
            console.error('Ошибка при создании аккаунта:', error);
            setAccountMessage(registerMessage, 'Не удалось сохранить аккаунт. Попробуйте позже.', 'error');
        }
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nickname = (loginNicknameInput?.value || '').trim();
        const password = (loginPasswordInput?.value || '').trim();

        if (!nickname) {
            setAccountMessage(loginMessage, 'Введите никнейм.', 'error');
            return;
        }

        if (!password) {
            setAccountMessage(loginMessage, 'Введите пароль.', 'error');
            return;
        }

        try {
            await loadAccountData();

            const user = accountUsers.find(
                (user) => user.nickname && user.nickname.toLowerCase() === nickname.toLowerCase()
            );

            if (!user) {
                setAccountMessage(loginMessage, 'Пользователь с таким никнеймом не найден.', 'error');
                return;
            }

            const hashedPassword = hashPassword(password);
            if (user.password !== hashedPassword) {
                setAccountMessage(loginMessage, 'Неверный пароль.', 'error');
                return;
            }

            setAccountMessage(loginMessage, 'Вход выполнен успешно! Перенаправление в личный кабинет...', 'success');

            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('isLoggedIn', 'true');

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } catch (error) {
            console.error('Ошибка при входе:', error);
            setAccountMessage(loginMessage, 'Не удалось выполнить вход. Попробуйте позже.', 'error');
        }
    });
}

const oauthProviders = {
    github: {
        name: 'GitHub',
        icon: 'github',
        color: '#24292e',
        authUrl: 'https://github.com/login/oauth/authorize',
        clientId: 'your_github_client_id', // В реальном приложении нужно заменить
        scope: 'user:email',
        mockUser: {
            provider: 'github',
            nickname: 'github_user_',
            email: 'user@github.com'
        }
    },
    discord: {
        name: 'Discord',
        icon: 'discord',
        color: '#5865f2',
        authUrl: 'https://discord.com/api/oauth2/authorize',
        clientId: 'your_discord_client_id', // В реальном приложении нужно заменить
        scope: 'identify email',
        mockUser: {
            provider: 'discord',
            nickname: 'discord_user_',
            email: 'user@discord.com'
        }
    },
    google: {
        name: 'Google',
        icon: 'google',
        color: '#4285f4',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        clientId: 'your_google_client_id', // В реальном приложении нужно заменить
        scope: 'openid email profile',
        mockUser: {
            provider: 'google',
            nickname: 'google_user_',
            email: 'user@gmail.com'
        }
    }
};

const handleOAuthLogin = (provider) => {
    const config = oauthProviders[provider];
    if (!config) {
        setAccountMessage(loginMessage, `OAuth провайдер ${provider} не настроен`, 'error');
        return;
    }

    setAccountMessage(loginMessage, `Подключение к ${config.name}...`, 'info');

    // Небольшая задержка для показа сообщения
    setTimeout(() => {
        window.location.href = `/auth/${provider}`;
    }, 500);
};

// Обработчики для всех OAuth кнопок
Object.keys(oauthProviders).forEach(provider => {
    const btn = document.getElementById(`${provider}-login-btn`);
    if (btn) {
        btn.addEventListener('click', () => handleOAuthLogin(provider));
    }
});

if (profileCopyIdBtn) {
    profileCopyIdBtn.addEventListener('click', async () => {
        const value = profileId && profileId.textContent ? profileId.textContent.trim() : '';
        if (!value) {
            setAccountMessage('Нет ID для копирования.', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(value);
            setAccountMessage('ID скопирован в буфер обмена.', 'success');
        } catch {
            setAccountMessage('Не удалось скопировать ID (браузер запретил).', 'error');
        }
    });
}

if (profileDeleteBtn) {
    profileDeleteBtn.addEventListener('click', async () => {
        try {
            await resolveClientIp();
            await loadAccountData();

            if (!currentIp) {
                setAccountMessage('Не удалось определить ваш IP. Удаление аккаунта недоступно.', 'error');
                return;
            }

            const accountToDelete = accountUsers.find((user) => user.ip === currentIp);

            if (!accountToDelete) {
                setAccountMessage('Аккаунт для этого IP не найден.', 'error');
                return;
            }

            accountUsers = accountUsers.filter((user) => user.id !== accountToDelete.id);

            await saveAccountData();
            renderMyAccount(null);
            setAccountMessage('Ваш аккаунт удалён.', 'success');
        } catch (e) {
            console.error('Ошибка при удалении аккаунта:', e);
            setAccountMessage('Не удалось удалить аккаунт. Попробуйте позже.', 'error');
        }
    });
}

