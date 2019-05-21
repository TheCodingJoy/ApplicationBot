const Discord = require('discord.js');
const bot = new Discord.Client();
bot.commands = new Discord.Collection();
const config = require('./config.json');

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on('messageReactionAdd', (reaction, user) => {
  if (!reaction.message.embeds) return;
  if (!reaction.message.embeds[0]) return;
  if (!reaction.message.embeds[0].title) return;
  if (!reaction.message.embeds[0].title === 'Review') return;

  if (reaction.emoji.name === '✅' && user.id === config.owner) {
    reaction.message.guild.members.find('id', reaction.message.embeds[0].footer.text).addRole(reaction.message.guild.roles.find('name', 'Helper'));
    reaction.message.clearReactions();
    const embed = {};
    const prev = reaction.message.embeds[0];
    embed.title = 'Accepted!';
    embed.descrption = 'This app has been accepted';
    embed.color = 0x2ECC71;
    embed.message = null;
    embed.author = {name: prev.author.name, iconURL: prev.author.iconURL};
    embed.fields = [];
    embed.footer = {text: prev.footer.text};
    prev.fields.forEach((element) => embed.fields.push({name: element.name, value: element.value,inline: true}));
    reaction.message.edit({embed});
  }
  if (reaction.emoji.name === '❎' && user.id === config.owner) {
    reaction.message.clearReactions();
    const embed = {};
    const prev = reaction.message.embeds[0];
    embed.title = 'Denied';
    embed.descrption = 'This app has been denied';
    embed.color = 0xE74C3C;
    embed.message = null;
    embed.author = {name: prev.author.name, iconURL: prev.author.iconURL};
    embed.fields = [];
    embed.footer = {text: prev.footer.text};
    prev.fields.forEach((element) => embed.fields.push({name: element.name, value: element.value,inline: true}));
    reaction.message.edit({embed});
  }
});

bot.on('message', msg => {
  parseCommand(msg);
});

bot.commands.set('apply',
  { 'run': (bot, msg) => {
    runApplyProcess(bot, msg);
  },
  'conf': { 'guildOnly': true}
  });

function parseCommand(msg) {
  const prefix = config.prefix;
  if (msg.author.bot) return;

  if (!msg.content.startsWith(prefix)) return;
  const args = msg.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift();
  let cmd;

  if (bot.commands.get(command)) {
    cmd = bot.commands.get(command);
  }
  if (cmd) {
    if (cmd.conf.guildOnly == true) {
      if (!msg.channel.guild) {
        return msg.reply('This command can only be ran in a guild.');
      }
    }
    try {
      cmd.run(bot, msg, args);
    }
    catch (e) {
      console.error(e.stack);
      msg.channel.send('There was an error trying to process your command. Don\'t worry because this issue is being looked into');
    }
  }
}


async function runApplyProcess(bot, msg) {
  try {
    await msg.channel.send('Let\'s take this into DMs shall we. ->');
    await msg.author.send('**What position would you like to apply for?** (helper)');
    const dmchannel = await msg.author.createDM();
    const collected = await dmchannel.awaitMessages(response => response.content.toLowerCase() === 'helper', { max: 1, time: 30000, errors: ['time'] });

    switch (collected.first().content.toLowerCase()) {
      case 'helper':
        await handleHelperApplication(bot, msg, dmchannel);
        break;
      //case 'event staff':
        //handleEventStaffApplication(bot, msg);
        //break;
    }
  }
  catch (ex) {
    msg.channel.send('**The command has been canceled because of the 30 second time limit reached.**');
  }
}

async function handleHelperApplication(bot, msg, dm) {
  let answers = new Discord.Collection();
  try {

    answers = await handleJoinTime(bot, msg, answers, dm);

    answers = await handleServerQuestion(bot, msg, answers, dm);

    answers = await handleAge(bot, msg, answers, dm);

    answers = await handleStaffing(bot, msg, answers, dm);

    answers = await handleSituation(bot, msg, answers, dm);

    const embed = new Discord.RichEmbed()
      .setTitle('Review')
      .setDescription('Please review this form')
      .setColor(0x007aff);
    answers.forEach((key, value) => {
      embed.addField('Q' + value, key, true);
    });
    await msg.author.send({embed});
    await msg.author.send('Would you like to edit a question?');
    let done = false;
    while (done == false) {
      const q2 = await dm.awaitMessages(response => response.author.bot == false && ['yes','no'].includes(response.content.toLowerCase()), { max: 1, time: 30000, errors: ['time'] });
      if (q2.first().content == 'yes') {
        answers = await handleRedoQuestion(bot, msg, answers, dm);
      }
      else {
        done = true;
      }
    }
    msg.author.send('**Great, your app has been submitted.**');
    const doneEmbed = new Discord.RichEmbed()
      .setTitle('A new helper app has been submitted!')
      .setAuthor(msg.author.tag, msg.author.avatarURL)
      .setFooter(msg.author.id);
    answers.forEach((key, value) => {
      doneEmbed.addField('Q' + value, key, true);
    });
    msg.guild.channels.find('name', 'helper-apps').send({embed: doneEmbed}).then(async msg => {
      await msg.react('✅');
      await msg.react('❎');
      await msg.react('⬆');
      await msg.react('⬇');
    });

  }
  catch (ex) {
    console.log(ex);
    msg.author.send('**The command has been canceled because of the time limit reached. Type ^apply again!**');
  }
}
async function handleRedoQuestion(bot, msg, answerss, dm) {
  const answers = answerss;
  await dm.send('**Which question would you like to review? (1-5)**');
  const question = await dm.awaitMessages(response => response.author.bot == false, { max: 1, time: 30000, errors: ['time'] });
  console.log(answers);
  if (answers.get(question.first().content)) {
    await dm.send('**What is the answer to this question?**');
    const answer = await dm.awaitMessages(response => response.author.bot == false, { max: 1, time: 30000, errors: ['time'] });
    answers.set(question.first().content, answer.first().content);
  }
  else {
    await dm.send('**There wasn\'t a question under that name.**');
  }
  const embed = new Discord.RichEmbed()
    .setTitle('Review')
    .setDescription('Please review this form')
    .setColor(0x007aff);
  answers.forEach((key, value) => {
    embed.addField('Q' + value, key, true);
  });
  msg.author.send({embed});
  await dm.send('**Would you like to edit a different question?**');
  return answers;
}
async function handleJoinTime(bot, msg, answer, dm) {
  const answers = answer;
  await msg.author.send('**Q1. When did you join the server? `?whois`**');
  const q1 = await dm.awaitMessages(response => response.author.bot == false ,{ max: 1, time: 30000, errors: ['time'] });
  answers.set('1', q1.first().content);
  return answers;
}

async function handleServerQuestion(bot, msg, answer, dm) {
  let answers = answer;
  await msg.author.send('**Q2. Have you ever been staff on another server? (yes or no)**');
  const q2 = await dm.awaitMessages(response => response.author.bot == false && ['yes','no'].includes(response.content.toLowerCase()), { max: 1, time: 30000, errors: ['time'] });
  switch (q2.first().content.toLowerCase()) {
    case 'yes':
      answers = await handleServer(bot, msg, answers, dm);
      break;
    case 'no':
      answers.set('2', 'no');
      break;
  }
  return answers;
}

async function handleAge(bot, msg, answer, dm) {
  const answers = answer;
  await msg.author.send('**Q3. How old are you?**');
  const q3 = await dm.awaitMessages(response => response.author.bot == false && parseInt(response.content), { max: 1, time: 30000, errors: ['time'] });
  answers.set('3', q3.first().content);
  return answers;
}

async function handleStaffing(bot, msg, answer, dm) {
  const answers = answer;
  await msg.author.send('**Q4. In regards to your staffing, are you more heavy-handed or laid back?**');
  const q4 = await dm.awaitMessages(response => response.author.bot == false, { max: 1, time: 30000, errors: ['time'] });
  answers.set('4', q4.first().content);
  return answers;
}

async function handleSituation(bot, msg, answer, dm) {
  const answers = answer;
  await msg.author.send('**Q5. Someone joins the server and immediately starts spamming racist slurs. What do you do? Your powers include `mute`, `kick`, and `warn`**');
  const q5 = await dm.awaitMessages(response => response.author.bot == false , { max: 1, time: 120000, errors: ['time'] });
  answers.set('5', q5.first().content);
  return answers;
}
async function handleServer(bot, msg, answer, dm) {
  const answers = answer;
  let done = false;
  let time = 1;
  while (done == false) {
    await msg.author.send('**Q2. Part a - What is the name of this server**');
    const q2a = await dm.awaitMessages(response => response.author.bot == false, { max: 1, time: 30000, errors: ['time'] });

    await msg.author.send('**Q2. Part b - How many members**');
    const q2b = await dm.awaitMessages(response => response.author.bot == false, { max: 1, time: 60000, errors: ['time'] });
    answers.set(`2 Server #${time}`, q2a.first().content + ' - ' + q2b.first().content + ' members');
    await msg.author.send('**Q2. Part c - Is that it?**');
    const q2c = await dm.awaitMessages(response => response.author.bot == false && ['yes','no'].includes(response.content.toLowerCase()), { max: 1, time: 30000, errors: ['time'] });
    switch (q2c.first().content.toLowerCase()) {
      case 'no':
        time++;
        break;
      case 'yes':
        done = true;
    }
  }
  return answers;
}
//async function handleEventStaffApplication(bot, msg) {

//}
bot.login(config.token);
