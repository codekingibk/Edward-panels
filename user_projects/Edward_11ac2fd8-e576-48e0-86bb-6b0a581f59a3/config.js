module.exports = {
    // Telegram Bot Token (Get from @BotFather)
    TELEGRAM_BOT_TOKEN: '8276018677:AAFeWnpddoLSMZ5lxsqKtsGnGG6WDFv_FVE',
    
    // Authorized Telegram User IDs (can be array of IDs)
    AUTHORIZED_USERS: ['7793926320'],
    
    // WhatsApp session settings
    SESSION_NAME: 'edward-session',
    
    // Bot prefix for commands
    PREFIX: '/',
    
    // Maximum attack iterations
    MAX_ATTACK_ITERATIONS: 30,
    
    // Anti-abuse settings
    ANTI_ABUSE: {
        ENABLED: true,
        MAX_TARGETS_PER_DAY: 5,
        COOLDOWN_MINUTES: 60
    }
};