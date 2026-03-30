const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = "1487880894151921694"; // Mets ton vrai ID ici
const GUILD_ID = "1487642446203457747";
const TEXT_CHANNEL_ID = "1487848372609089706";
const VOICE_CHANNEL_ID = "1487806130938839230";

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ] 
});

let fadeTimer = null;
let preMessageTimer = null;

// ────────── Commande /fade ──────────
const commands = [
  new SlashCommandBuilder()
    .setName('fade')
    .setDescription('Déconnecte tout le monde du VC après X minutes (Admin only)')
    .addStringOption(option =>
      option.setName('time')
            .setDescription('Nombre de minutes ou "cancel"')
            .setRequired(true))
].map(cmd => cmd.toJSON());

// Enregistrement des commandes
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('Enregistrement des commandes...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Commandes enregistrées ✅');
  } catch (err) {
    console.error(err);
  }
})();

// ────────── Ready ──────────
client.once('ready', () => {
  console.log(`SoftFade connecté en tant que ${client.user.tag}`);
});

// ────────── Interaction ──────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'fade') return;

  // Vérifier admin
  if (!interaction.member.permissions.has("Administrator")) {
    return interaction.reply({ content: '❌ Seuls les admins peuvent utiliser cette commande', ephemeral: true });
  }

  const timeArg = interaction.options.getString('time').toLowerCase();

  // ────────── Annuler le timer ──────────
  if (timeArg === 'cancel') {
    if (!fadeTimer) return interaction.reply({ content: '❌ Aucun timer en cours', ephemeral: true });
    clearTimeout(fadeTimer);
    clearTimeout(preMessageTimer);
    fadeTimer = null;
    preMessageTimer = null;
    return interaction.reply('✅ Timer annulé');
  }

  const minutes = parseInt(timeArg);
  if (isNaN(minutes) || minutes <= 0) {
    return interaction.reply({ content: '❌ Indique un nombre de minutes valide ou "cancel"', ephemeral: true });
  }

  // ────────── Fetch channels fiables ──────────
  const guild = await client.guilds.fetch(GUILD_ID);
  const voiceChannel = await guild.channels.fetch(VOICE_CHANNEL_ID);
  const textChannel = await guild.channels.fetch(TEXT_CHANNEL_ID);

  if (!voiceChannel || !textChannel) {
    return interaction.reply({ content: '❌ Channels introuvables', ephemeral: true });
  }

  if (fadeTimer) return interaction.reply({ content: '❌ Un timer est déjà en cours', ephemeral: true });

  // ────────── Réponse immédiate ──────────
  await interaction.reply({ content: `⟡ signal fading... ${minutes} minute${minutes > 1 ? 's' : ''}, then we drift ⟡`, ephemeral: false });

  // ────────── Message 1 min avant ──────────
  if (minutes > 1) {
    preMessageTimer = setTimeout(() => {
      textChannel.send('⟡ we\'re reaching the quiet part of the night. 1 minute, then we\'ll ease into it ⟡').catch(console.error);
    }, (minutes - 1) * 60000);
  }

  // ────────── Timer final pour déconnecter ──────────
  fadeTimer = setTimeout(() => {
    voiceChannel.members.forEach(member => {
      if (member.voice.channel) member.voice.setChannel(null).catch(console.error);
    });
    textChannel.send('⟡ and just like that... the night takes over ⟡').catch(console.error);
    fadeTimer = null;
    preMessageTimer = null;
  }, minutes * 60000);
});

// ────────── Login ──────────
client.login(TOKEN);