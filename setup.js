#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Настройка Fartovka Web OAuth\n');

const envExamplePath = path.join(__dirname, 'env.example');
const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
    console.log('📄 Создание файла .env...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Файл .env создан из env.example');
    console.log('⚠️  Пожалуйста, заполните .env реальными OAuth ключами!\n');
} else {
    console.log('ℹ️  Файл .env уже существует\n');
}

console.log('🔗 Ссылки для настройки OAuth:');
console.log('   GitHub:  https://github.com/settings/developers');
console.log('   Discord: https://discord.com/developers/applications');
console.log('   Google:  https://console.cloud.google.com/\n');

console.log('📖 Подробные инструкции в README.md\n');

console.log('🎮 Для запуска сервера выполните:');
console.log('   npm install');
console.log('   npm run dev\n');