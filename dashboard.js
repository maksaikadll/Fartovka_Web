// Dashboard page logic (profile editing, friends, stats)
// Stores data at: http://web4.informatics.ru:82/api/0b7f6114de5a56625f4a9a0c19e57123

const navbar = document.querySelector('.navbar');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

// Basic navbar interactions
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
// Dashboard API & State
// -------------------------------

const DASHBOARD_API_URL = 'http://web4.informatics.ru:82/api/0b7f6114de5a56625f4a9a0c19e57123';

let currentUser = null;
let allUsers = [];

// Tab switching
const tabButtons = document.querySelectorAll('.tab-btn');
const dashboardPanels = document.querySelectorAll('.dashboard-panel');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');

        tabButtons.forEach(btn => btn.classList.remove('active'));
        dashboardPanels.forEach(panel => panel.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

// Utility functions
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

const showMessage = (text, type = 'info') => {
    // Simple notification - could be enhanced
    alert(text);
    console.log(`[${type.toUpperCase()}] ${text}`);
};

// Load current user from localStorage
const loadCurrentUser = () => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        showMessage('Пользователь не найден. Перенаправление...', 'error');
        setTimeout(() => window.location.href = 'account.html', 2000);
        return null;
    }

    try {
        currentUser = JSON.parse(userData);
        return currentUser;
    } catch (e) {
        console.error('Ошибка парсинга данных пользователя:', e);
        localStorage.removeItem('currentUser');
        showMessage('Ошибка данных пользователя. Перенаправление...', 'error');
        setTimeout(() => window.location.href = 'account.html', 2000);
        return null;
    }
};

// Load all users from API
const loadAllUsers = async () => {
    try {
        const response = await fetch(DASHBOARD_API_URL);
        if (!response.ok) throw new Error('Не удалось загрузить данные');
        const data = await response.json();
        allUsers = (data && Array.isArray(data.users)) ? data.users : [];
        return allUsers;
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        allUsers = [];
        return [];
    }
};

// Save updated user data
const saveUserData = async (updatedUser) => {
    try {
        // Load current data
        await loadAllUsers();

        // Find and update user
        const userIndex = allUsers.findIndex(u => u.id === updatedUser.id);
        if (userIndex === -1) throw new Error('Пользователь не найден');

        allUsers[userIndex] = updatedUser;

        // Save to API
        const response = await fetch(DASHBOARD_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: allUsers })
        });

        if (!response.ok) throw new Error('Не удалось сохранить данные');

        // Update localStorage
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        currentUser = updatedUser;

        return true;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        throw error;
    }
};

// -------------------------------
// Profile Tab
// -------------------------------

const renderProfile = () => {
    if (!currentUser) return;

    const avatar = document.getElementById('profile-avatar-large');
    const nickname = document.getElementById('profile-nickname-large');
    const email = document.getElementById('profile-email-large');
    const created = document.getElementById('profile-created-large');
    const id = document.getElementById('profile-id-large');

    if (avatar) avatar.textContent = getInitials(currentUser.nickname);
    if (nickname) nickname.textContent = currentUser.nickname || '—';
    if (email) email.textContent = currentUser.email || '—';
    if (created) created.textContent = formatDateRu(currentUser.createdAt);
    if (id) id.textContent = String(currentUser.id ?? '—');
};

// Edit Profile
const editProfileBtn = document.getElementById('edit-profile-btn');
const editForm = document.getElementById('edit-profile-form');
const editNickname = document.getElementById('edit-nickname');
const editEmail = document.getElementById('edit-email');
const saveProfileBtn = document.getElementById('save-profile-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

if (editProfileBtn && editForm) {
    editProfileBtn.addEventListener('click', () => {
        editForm.style.display = '';
        if (editNickname) editNickname.value = currentUser?.nickname || '';
        if (editEmail) editEmail.value = currentUser?.email || '';
        editProfileBtn.style.display = 'none';
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        editForm.style.display = 'none';
        editProfileBtn.style.display = '';
    });
}

if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        const newNickname = editNickname?.value?.trim();
        const newEmail = editEmail?.value?.trim();

        if (!newNickname) {
            showMessage('Никнейм не может быть пустым', 'error');
            return;
        }

        try {
            const updatedUser = {
                ...currentUser,
                nickname: newNickname,
                email: newEmail || null
            };

            await saveUserData(updatedUser);
            renderProfile();
            editForm.style.display = 'none';
            editProfileBtn.style.display = '';
            showMessage('Профиль обновлён!', 'success');
        } catch (error) {
            showMessage('Не удалось сохранить изменения', 'error');
        }
    });
}

// Profile Actions
const copyIdBtn = document.getElementById('copy-id-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const logoutBtn = document.getElementById('logout-btn');

if (copyIdBtn) {
    copyIdBtn.addEventListener('click', async () => {
        const id = currentUser?.id;
        if (!id) {
            showMessage('ID не найден', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(String(id));
            showMessage('ID скопирован!', 'success');
        } catch {
            showMessage('Не удалось скопировать ID', 'error');
        }
    });
}

if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
        if (!confirm('Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить.')) return;

        try {
            await loadAllUsers();
            const updatedUsers = allUsers.filter(u => u.id !== currentUser.id);

            const response = await fetch(DASHBOARD_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ users: updatedUsers })
            });

            if (!response.ok) throw new Error('Не удалось удалить аккаунт');

            localStorage.removeItem('currentUser');
            showMessage('Аккаунт удалён. Перенаправление...', 'success');
            setTimeout(() => window.location.href = 'account.html', 2000);
        } catch (error) {
            showMessage('Не удалось удалить аккаунт', 'error');
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
}

// -------------------------------
// Friends Tab
// -------------------------------

const renderFriends = () => {
    const friendsList = document.getElementById('friends-list');
    if (!friendsList || !currentUser) return;

    friendsList.innerHTML = '';

    if (!currentUser.friends || currentUser.friends.length === 0) {
        friendsList.innerHTML = '<div class="friend-item empty"><p>У вас пока нет друзей. Добавьте первого!</p></div>';
        return;
    }

    currentUser.friends.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';

        const friendInfo = document.createElement('div');
        friendInfo.className = 'friend-info';
        friendInfo.innerHTML = `
            <div class="friend-avatar">${getInitials(friend.nickname)}</div>
            <div class="friend-details">
                <div class="friend-name">${friend.nickname}</div>
                <div class="friend-status">${friend.status || 'Друг'}</div>
            </div>
        `;

        const friendActions = document.createElement('div');
        friendActions.className = 'friend-actions';
        friendActions.innerHTML = `
            <button class="btn btn-small btn-danger remove-friend-btn" data-nickname="${friend.nickname}">Удалить</button>
        `;

        friendItem.appendChild(friendInfo);
        friendItem.appendChild(friendActions);
        friendsList.appendChild(friendItem);
    });

    // Add event listeners for remove buttons
    document.querySelectorAll('.remove-friend-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const nickname = e.target.getAttribute('data-nickname');
            if (!confirm(`Удалить ${nickname} из друзей?`)) return;

            try {
                const updatedFriends = currentUser.friends.filter(f => f.nickname !== nickname);
                const updatedUser = { ...currentUser, friends: updatedFriends };

                await saveUserData(updatedUser);
                renderFriends();
                showMessage(`${nickname} удалён из друзей`, 'success');
            } catch (error) {
                showMessage('Не удалось удалить друга', 'error');
            }
        });
    });
};

// Add Friend
const addFriendBtn = document.getElementById('add-friend-btn');
const addFriendForm = document.getElementById('add-friend-form');
const friendNickname = document.getElementById('friend-nickname');
const sendFriendRequestBtn = document.getElementById('send-friend-request-btn');
const cancelFriendRequestBtn = document.getElementById('cancel-friend-request-btn');

if (addFriendBtn && addFriendForm) {
    addFriendBtn.addEventListener('click', () => {
        addFriendForm.style.display = '';
        addFriendBtn.style.display = 'none';
    });
}

if (cancelFriendRequestBtn) {
    cancelFriendRequestBtn.addEventListener('click', () => {
        addFriendForm.style.display = 'none';
        addFriendBtn.style.display = '';
        if (friendNickname) friendNickname.value = '';
    });
}

if (sendFriendRequestBtn) {
    sendFriendRequestBtn.addEventListener('click', async () => {
        const nickname = friendNickname?.value?.trim();
        if (!nickname) {
            showMessage('Введите никнейм друга', 'error');
            return;
        }

        if (nickname === currentUser.nickname) {
            showMessage('Нельзя добавить себя в друзья', 'error');
            return;
        }

        // Check if user exists
        await loadAllUsers();
        const friendExists = allUsers.some(u => u.nickname === nickname);
        if (!friendExists) {
            showMessage('Пользователь с таким никнеймом не найден', 'error');
            return;
        }

        // Check if already friends
        const alreadyFriends = currentUser.friends?.some(f => f.nickname === nickname);
        if (alreadyFriends) {
            showMessage('Этот пользователь уже в друзьях', 'error');
            return;
        }

        try {
            const newFriend = {
                nickname: nickname,
                status: 'Ожидает подтверждения',
                addedAt: new Date().toISOString()
            };

            const updatedFriends = [...(currentUser.friends || []), newFriend];
            const updatedUser = { ...currentUser, friends: updatedFriends };

            await saveUserData(updatedUser);
            renderFriends();

            addFriendForm.style.display = 'none';
            addFriendBtn.style.display = '';
            if (friendNickname) friendNickname.value = '';
            showMessage(`Запрос дружбы отправлен ${nickname}!`, 'success');
        } catch (error) {
            showMessage('Не удалось добавить друга', 'error');
        }
    });
}

// -------------------------------
// Stats Tab
// -------------------------------

const renderStats = () => {
    if (!currentUser || !currentUser.stats) return;

    const stats = currentUser.stats;

    const gamesPlayed = document.getElementById('games-played');
    const wins = document.getElementById('wins');
    const losses = document.getElementById('losses');
    const draws = document.getElementById('draws');
    const winRate = document.getElementById('win-rate');

    if (gamesPlayed) gamesPlayed.textContent = stats.gamesPlayed || 0;
    if (wins) wins.textContent = stats.wins || 0;
    if (losses) losses.textContent = stats.losses || 0;
    if (draws) draws.textContent = stats.draws || 0;
    if (winRate) {
        const rate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
        winRate.textContent = `${rate}%`;
    }
};

// -------------------------------
// Initialize Dashboard
// -------------------------------

const initDashboard = async () => {
    if (!loadCurrentUser()) return;

    renderProfile();
    renderFriends();
    renderStats();
};

// Start the dashboard
initDashboard();