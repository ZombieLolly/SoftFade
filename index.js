const { Client, GatewayIntentBits } = require('discord.js');

// ────────── 1️⃣ Création du client (FIX intents) ──────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ────────── 2️⃣ Variables d'environnement ──────────
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const TEXT_CHANNEL_ID = process.env.TEXT_CHANNEL_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

let fadeTimeout = null;

// ────────── 3️⃣ Bot prêt ──────────
client.once('ready', () => {
  console.log(`SoftFade connecté en tant que ${client.user.tag}`);
});

// ────────── 4️⃣ Commande /fade ──────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'fade') return;

  // Admin only
  if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({ content: "🚫 Vous n'êtes pas autorisé.", ephemeral: true });
  }

  const option = interaction.options.getString('option');

  // Récupération serveur et salons
  const guild = await client.guilds.fetch(GUILD_ID);
  const textChannel = await guild.channels.fetch(TEXT_CHANNEL_ID);
  const voiceChannel = await guild.channels.fetch(VOICE_CHANNEL_ID);

  if (!textChannel || !voiceChannel) {
    return interaction.reply({ content: "🚫 Salon introuvable.", ephemeral: true });
  }

  // Cancel
  if (option === 'cancel') {
    if (fadeTimeout) clearTimeout(fadeTimeout);
    fadeTimeout = null;
    return textChannel.send('⟡ Fade cancelled. ⟡');
  }

  const duration = parseInt(option);

  if (isNaN(duration) || duration <= 0) {
    return interaction.reply({ content: '🚫 Nombre de minutes invalide.', ephemeral: true });
  }

  // Message start
  await textChannel.send(`⟡ signal fading... ${duration} minute${duration>1?'s':''}, then we drift ⟡`);

  // Message 1 minute avant
  if (duration > 1) {
    setTimeout(() => {
      textChannel.send(`⟡ we're reaching the quiet part of the night. 1 minute, then we'll ease into it ⟡`);
    }, (duration - 1) * 60 * 1000);
  }

  // Déconnexion
  fadeTimeout = setTimeout(() => {
    voiceChannel.members.forEach(member => member.voice.disconnect());
    textChannel.send('⟡ and just like that... the night takes over ⟡');
    fadeTimeout = null;
  }, duration * 60 * 1000);

  await interaction.reply({
    content: `⟡ Fade programmé pour ${duration} minute${duration>1?'s':''} ⟡`,
    ephemeral: true
  });
});

// ────────── 5️⃣ Login ──────────
client.login(TOKEN);
