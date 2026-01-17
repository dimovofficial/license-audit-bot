const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { REST } = require("@discordjs/rest");

/* === НАСТРОЙКИ === */
const TOKEN = "process.env.BOT_TOKEN;";
const CLIENT_ID = "1462075896159535435";
const GUILD_ID = "1275037635944906752";
const ALLOWED_CHANNEL_ID = "1462061587996348436";

/* ================= */

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const temp = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName("отчет")
    .setDescription("Отчет по выданным лицензиям")
];

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

/* === УТИЛИТЫ === */
const num = v => Number(v.replace(/[^\d]/g, "")) || 0;
const tag = id => `<@${id}>`;

/* ================= */

client.on("interactionCreate", async interaction => {

  /* ===== КОМАНДА ===== */
  if (interaction.isChatInputCommand() && interaction.commandName === "отчет") {

    if (interaction.channelId !== ALLOWED_CHANNEL_ID) {
      return interaction.reply({
        content: "❌ Команда доступна только в канале для отчетов.",
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("step1")
      .setTitle("Отчет — Шаг 1/3 (Люди)");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("checkerName")
          .setLabel("Имя проверяющего")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("checkerId")
          .setLabel("Discord ID проверяющего")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("licName")
          .setLabel("Имя лицензиара")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("licId")
          .setLabel("Discord ID лицензиара")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  /* ===== ШАГ 1 ===== */
  if (interaction.isModalSubmit() && interaction.customId === "step1") {
    temp.set(interaction.user.id, {
      checkerName: interaction.fields.getTextInputValue("checkerName"),
      checkerId: interaction.fields.getTextInputValue("checkerId"),
      licName: interaction.fields.getTextInputValue("licName"),
      licId: interaction.fields.getTextInputValue("licId")
    });

    return interaction.reply({
      content: "➡️ Перейти к периоду и финансам",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("to_step2")
            .setLabel("Далее")
            .setStyle(ButtonStyle.Primary)
        )
      ],
      ephemeral: true
    });
  }

  /* ===== ШАГ 2 ===== */
  if (interaction.isButton() && interaction.customId === "to_step2") {
    const modal = new ModalBuilder()
      .setCustomId("step2")
      .setTitle("Отчет — Шаг 2/3 (Период и финансы)");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("period")
          .setLabel("Период проверки")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("paid")
          .setLabel("Фактически внесено в казну")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "step2") {
    const d = temp.get(interaction.user.id);
    d.period = interaction.fields.getTextInputValue("period");
    d.paid = num(interaction.fields.getTextInputValue("paid"));
    temp.set(interaction.user.id, d);

    return interaction.reply({
      content: "➡️ Перейти к лицензиям",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("to_step3")
            .setLabel("Далее")
            .setStyle(ButtonStyle.Primary)
        )
      ],
      ephemeral: true
    });
  }

  /* ===== ШАГ 3 ===== */
  if (interaction.isButton() && interaction.customId === "to_step3") {
    const modal = new ModalBuilder()
      .setCustomId("step3")
      .setTitle("Отчет — Шаг 3/3 (Лицензии)");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("weapon").setLabel("Оружие (5.000$)").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("hunt").setLabel("Охота (10.000$)").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("fish").setLabel("Рыбалка (5.000$)").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("biz").setLabel("Бизнес (15.000$)").setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  /* ===== ФИНАЛ ===== */
  if (interaction.isModalSubmit() && interaction.customId === "step3") {
    const d = temp.get(interaction.user.id);

    const weapon = num(interaction.fields.getTextInputValue("weapon"));
    const hunt = num(interaction.fields.getTextInputValue("hunt"));
    const fish = num(interaction.fields.getTextInputValue("fish"));
    const biz = num(interaction.fields.getTextInputValue("biz"));

    const sums = {
      weapon: weapon * 5000,
      hunt: hunt * 10000,
      fish: fish * 5000,
      biz: biz * 15000
    };

    const total = Object.values(sums).reduce((a,b)=>a+b,0);
    const debt = total - d.paid;

    temp.delete(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle("📋 Отчет по выданным лицензиям")
      .setColor(debt > 0 ? 0xED4245 : 0x57F287)
      .setDescription(`
👮 **Проверяющий:** ${d.checkerName} (${tag(d.checkerId)})
🧾 **Лицензиар:** ${d.licName} (${tag(d.licId)})
📅 **Период проверки:** ${d.period}

━━━━━━━━━━━━━━━━━━━━

🔫 **Лицензия на Оружие**
• Количество: ${weapon}
• Сумма: ${sums.weapon.toLocaleString()}$

🏹 **Лицензия на Охоту**
• Количество: ${hunt}
• Сумма: ${sums.hunt.toLocaleString()}$

🎣 **Лицензия на Рыбалку**
• Количество: ${fish}
• Сумма: ${sums.fish.toLocaleString()}$

🏢 **Лицензия на Бизнес**
• Количество: ${biz}
• Сумма: ${sums.biz.toLocaleString()}$

━━━━━━━━━━━━━━━━━━━━
📦 **Общая сумма к сдаче:** ${total.toLocaleString()}$
💳 **Фактически внесено:** ${d.paid.toLocaleString()}$

${debt > 0
? `⚠️ **ЗАДОЛЖЕННОСТЬ ОБНАРУЖЕНА**\n💰 Сумма задолженности: ${debt.toLocaleString()}$\n⏰ Закрыть в течение 24 часов`
: "✅ **Задолженности нет**"}
`);

    /* тихо закрываем interaction и шлем отчет в канал */
    await interaction.deferReply({ ephemeral: true });
    await interaction.channel.send({ embeds: [embed] });
    return interaction.deleteReply();
  }
});

client.login(TOKEN);
