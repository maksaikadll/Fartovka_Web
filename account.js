// Account page logic (registration + list)
// Stores data at: http://web4.informatics.ru:82/api/0b7f6114de5a56625f4a9a0c19e57123

const navbar = document.querySelector('.navbar');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

// Basic navbar interactions (copied from main, trimmed)
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

// -------------------------------
// Account API (user registration)
// -------------------------------

const ACCOUNT_API_URL = 'http://web4.informatics.ru:82/api/0b7f6114de5a56625f4a9a0c19e57123';

const accountForm = document.getElementById('account-form');
const accountNicknameInput = document.getElementById('account-nickname');
const accountEmailInput = document.getElementById('account-email');
const accountMessage = document.getElementById('account-message');

// My Account (selection based on client IP)
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

const setAccountMessage = (text, type = 'info') => {
    if (!accountMessage) return;
    accountMessage.textContent = text;
    accountMessage.classList.remove('account-message--success', 'account-message--error');
    if (type === 'success') accountMessage.classList.add('account-message--success');
    if (type === 'error') accountMessage.classList.add('account-message--error');
};

const loadAccountData = async () => {
    try {
        await resolveClientIp();
        const response = await fetch(ACCOUNT_API_URL);
        if (!response.ok) throw new Error('Не удалось загрузить данные аккаунтов');
        const data = await response.json();
        accountUsers = (data && Array.isArray(data.users)) ? data.users : [];

        // auto-select my account by IP (if present)
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

if (accountForm) {
    loadAccountData();

    accountForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nickname = (accountNicknameInput?.value || '').trim();
        const email = (accountEmailInput?.value || '').trim();

        if (!nickname) {
            setAccountMessage('Введите никнейм.', 'error');
            return;
        }

        try {
            // Ensure we know client IP before saving
            await resolveClientIp();

            // Always re-load latest state before appending (best-effort, no locking)
            await loadAccountData();

        // Only one account per IP
        if (currentIp && accountUsers.some((user) => user.ip === currentIp)) {
            setAccountMessage('На этот IP уже создан аккаунт. Сначала удалите существующий.', 'error');
            return;
        }

            const exists = accountUsers.some(
                (user) => user.nickname && user.nickname.toLowerCase() === nickname.toLowerCase()
            );
            if (exists) {
                setAccountMessage('Игрок с таким никнеймом уже существует.', 'error');
                return;
            }

            const newUser = {
                id: Date.now(),
                nickname,
                email: email || null,
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

            // After creation: redirect to dashboard
            setAccountMessage('Аккаунт успешно создан! Перенаправление в личный кабинет...', 'success');

            // Save new user data to localStorage for dashboard access
            localStorage.setItem('currentUser', JSON.stringify(newUser));

            // Redirect after a short delay to show the message
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } catch (error) {
            console.error('Ошибка при создании аккаунта:', error);
            setAccountMessage('Не удалось сохранить аккаунт. Попробуйте позже.', 'error');
        }
    });
}

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

            const beforeCount = accountUsers.length;
            accountUsers = accountUsers.filter((user) => !(user.ip === currentIp));

            if (accountUsers.length === beforeCount) {
                setAccountMessage('Аккаунт для этого IP не найден.', 'error');
                return;
            }

            await saveAccountData();
            renderMyAccount(null);
            setAccountMessage('Ваш аккаунт удалён.', 'success');
        } catch (e) {
            console.error('Ошибка при удалении аккаунта:', e);
            setAccountMessage('Не удалось удалить аккаунт. Попробуйте позже.', 'error');
        }
    });
}

