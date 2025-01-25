import dotenv from "dotenv";
dotenv.config();
import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  OmitPartialGroupDMChannel,
} from "discord.js";

import generateResponse from "./lib/fetch/internal";
import cleanAIResponse from "./lib/utils/cleanResponse";
import generateAPIResponse from "./lib/fetch/external";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.MessageContent,
  ],
});

client.on(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});

async function localFetch(
  thinkingMessage: Message<boolean>,
  message: OmitPartialGroupDMChannel<Message<boolean>>
) {
  if (message.author.bot) return;

  await message.channel.sendTyping();

  try {
    const result = await generateResponse(
      process.env.DEEPSEEK_MODEL,
      message.content
    );

    if (result) {
      thinkingMessage.delete();
      await message.reply(cleanAIResponse(result?.response));
    }
  } catch (err) {
    thinkingMessage.delete();
    await message.reply(
      `An error occurred while processing your request. Error: ${err.message}`
    );
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const thinkingMessage = await message.reply({
    content: "Let me thinking and write the answers for you...",
    options: {
      ephemeral: true,
    },
  });

  await message.channel.sendTyping();

  try {
    const result = await generateAPIResponse("deepseek-chat", message.content);

    if (result) {
      // @ts-expect-error - `result` is a string
      await message.reply(cleanAIResponse(result?.response));
    }
  } catch (err) {
    await localFetch(thinkingMessage, message);
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Failed to fetch the reaction:", error);
      return;
    }
  }

  if (user.bot) return;

  if (reaction.emoji.name === "👍🏻") {
    await reaction.message.reply(`Glad you liked my answer!`);
  } else if (reaction.emoji.name === "👎🏻") {
    await reaction.message.reply(`Oh no! you disliked my answer!`);
  }
});

client.login(process.env.DISCORD_TOKEN);
