// ============================================
// HalfRolePlay - Discord Manager
// ============================================

const axios = require('axios');

class DiscordManager {
    constructor(botToken) {
        this.botToken = botToken;
        this.baseURL = 'https://discord.com/api/v10';
    }

    async getUserRoles(discordId) {
        if (!this.botToken) return [];
        try {
            const response = await axios.get(
                `${this.baseURL}/users/${discordId}`,
                { headers: { Authorization: `Bot ${this.botToken}` } }
            );
            return response.data;
        } catch (e) {
            return null;
        }
    }

    async checkUserHasRole(discordId, roleId) {
        try {
            const guildId = process.env.DISCORD_GUILD_ID;
            const response = await axios.get(
                `${this.baseURL}/guilds/${guildId}/members/${discordId}`,
                { headers: { Authorization: `Bot ${this.botToken}` } }
            );
            return response.data.roles.includes(roleId);
        } catch (e) {
            return false;
        }
    }

    async getUserGuildRoles(discordId) {
        try {
            const guildId = process.env.DISCORD_GUILD_ID;
            const response = await axios.get(
                `${this.baseURL}/guilds/${guildId}/members/${discordId}`,
                { headers: { Authorization: `Bot ${this.botToken}` } }
            );
            return response.data.roles || [];
        } catch (e) {
            return [];
        }
    }
}

module.exports = DiscordManager;