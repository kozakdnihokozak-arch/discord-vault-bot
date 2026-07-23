const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const http = require('http');
const url = require('url');

// ⚠️ TUTAJ WKLEJ SWÓJ TOKEN BOTA Z DISCORDA:
const TOKEN = 'MTUyOTU3NDk0MjU0OTQ3OTQ1Ng.GDeYRv.Nopw5oggw2y3Ygsvz-3lW_dTVeP8FfuysgsFC0';
const CLIENT_ID = '1529574942549479456';

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds
    ] 
});

// Rejestracja komend slash
const commands = [
    new SlashCommandBuilder()
        .setName('register')
        .setDescription('Utwórz konto w grze')
        .addStringOption(option => option.setName('username').setDescription('Twój nick w grze').setRequired(true))
        .addStringOption(option => option.setName('email').setDescription('Twój e-mail').setRequired(true))
        .addStringOption(option => option.setName('password').setDescription('Twoje hasło').setRequired(true)),
    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Wyświetl dane swojego konta w grze')
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Rejestrowanie komend slash...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Komendy zaktualizowane!');
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log(`✅ Bot jest zalogowany jako ${client.user.tag}!`);
    
    // --- SERWER HTTP DLA LAUNCHERA (Port dla Render.com) ---
    const PORT = process.env.PORT || 3000;
    
    http.createServer((req, res) => {
        const reqUrl = url.parse(req.url, true);
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        if (reqUrl.pathname === '/login') {
            const username = reqUrl.query.username;
            const usersFile = './users.json';
            let users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile)) : [];

            const user = users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());

            if (user) {
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, user: { username: user.username, email: user.email, createdAt: user.createdAt } }));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ success: false, message: 'Nie znaleziono takiego gracza!' }));
            }
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Nieznany endpoint' }));
        }
    }).listen(PORT, () => {
        console.log(`🌐 Serwer autoryzacji launchera działa na porcie ${PORT}!`);
    });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const usersFile = './users.json';
    let users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile)) : [];
    const discordId = interaction.user.id;

    if (interaction.commandName === 'register') {
        const username = interaction.options.getString('username');
        const email = interaction.options.getString('email');
        const password = interaction.options.getString('password');

        if (users.find(u => u.discordId === discordId)) {
            return interaction.reply({ content: '❌ Masz już przypisane konto do profilu Discord!', ephemeral: true });
        }

        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return interaction.reply({ content: '❌ Ten nick w grze jest już zajęty!', ephemeral: true });
        }

        users.push({
            discordId: discordId,
            username: username,
            email: email,
            password: password,
            createdAt: new Date().toLocaleDateString('pl-PL')
        });

        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎉 Konto zostało pomyślnie utworzone!')
            .addFields(
                { name: 'Nick w grze', value: username, inline: true },
                { name: 'E-mail', value: email, inline: true }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.commandName === 'profile') {
        const user = users.find(u => u.discordId === discordId);
        if (!user) return interaction.reply({ content: '❌ Brak konta! Użyj `/register`.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`👤 Profil gracza: ${user.username}`)
            .addFields(
                { name: 'Nick w grze', value: user.username, inline: true },
                { name: 'E-mail', value: user.email, inline: true }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

client.login(TOKEN);
