const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

// ────────── 1️⃣ Créer le client ──────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ]
});

// ────────── 2️⃣ Variables d'environnement ──────────
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const TEXT_CHANNEL_ID = process.env.TEXT_CHANNEL_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

let fadeTimeout = null;

// ────────── 3️⃣ Enregistrer la commande slash /fade ──────────
const commands = [
  new SlashCommandBuilder()
    .setName('fade')
    .setDescription('Programmez le fade dans le voice channel')
    .addStringOption(option =>
      option.setName('option')
        .setDescription('Nombre de minutes ou "cancel" pour annuler')
        .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🔹 Registering commands...');
    await rest.put(
      Routes.applicationGuildCommands(client.user?.id || 'CLIENT_ID_PLACEHOLDER', GUILD_ID),
      { body: commands }
    );
    console.log('✅ Commands registered');
  } catch (error) {
    console.error(error);
  }
})();

// ────────── 4️⃣ Bot prêt ──────────
client.once('ready', () => {
  console.log(`SoftFade connecté en tant que ${client.user.tag}`);
});

// ────────── 5️⃣ Commande /fade ──────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'fade') return;

  // Admin only
  if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({ content: "🚫 Vous n'êtes pas autorisé.", ephemeral: true });
  }

  const option = interaction.options.getString('option');
  const guild = await client.guilds.fetch(GUILD_ID);
  const textChannel = await guild.channels.fetch(TEXT_CHANNEL_ID);
  const voiceChannel = await guild.channels.fetch(VOICE_CHANNEL_ID);

  if (!textChannel || !voiceChannel) return interaction.reply({ content: "🚫 Salon introuvable.", ephemeral: true });

  // Cancel
  if (option.toLowerCase() === 'cancel') {
    if (fadeTimeout) clearTimeout(fadeTimeout);
    fadeTimeout = null;
    return textChannel.send('⟡ Fade cancelled. ⟡');
  }

  const duration = parseInt(option);

  if (isNaN(duration) || duration <= 0) {
    return interaction.reply({ content: '🚫 Veuillez entrer un nombre de minutes valide.', ephemeral: true });
  }

  await textChannel.send(`⟡ Signal fading... ${duration} minute${duration > 1 ? 's' : ''}, then we drift ⟡`);

  if (duration > 1) {
    setTimeout(() => {
      textChannel.send(`⟡ We're reaching the quiet part of the night. 1 minute, then we'll ease into it ⟡`);
    }, (duration - 1) * 60 * 1000);
  }

  fadeTimeout = setTimeout(() => {
    voiceChannel.members.forEach(member => member.voice.disconnect());
    textChannel.send('⟡ And just like that... the night takes over ⟡');
    fadeTimeout = null;
  }, duration * 60 * 1000);

  await interaction.reply({ content: `⟡ Fade programmé pour ${duration} minute${duration > 1 ? 's' : ''} ⟡`, ephemeral: true });
});

// ────────── 6️⃣ Login ──────────
client.login(TOKEN);