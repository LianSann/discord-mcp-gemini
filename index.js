import express from 'express';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { z } from 'zod';

const app = express();
const port = process.env.PORT || 8080;

// Inicializar cliente Discord
const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

discord.login(process.env.DISCORD_BOT_TOKEN).then(() => {
  console.log(`Discord bot conectado como ${discord.user.tag}`);
}).catch(err => {
  console.error('Error al conectar Discord:', err);
});

// Inicializar Servidor MCP
const server = new McpServer({
  name: 'discord-bot-admin',
  version: '1.0.0'
});

// Herramienta 1: Listar canales
server.tool(
  'listar_canales',
  'Lista todos los canales del servidor de Discord',
  {},
  async () => {
    const guilds = discord.guilds.cache;
    let resultado = [];
    for (const [_, guild] of guilds) {
      resultado.push(`Servidor: ${guild.name}`);
      guild.channels.cache.forEach(ch => {
        resultado.push(`- #${ch.name} (Tipo: ${ch.type}, ID: ${ch.id})`);
      });
    }
    return {
      content: [{ type: 'text', text: resultado.join('\n') || 'No se encontraron canales' }]
    };
  }
);

// Herramienta 2: Enviar mensaje
server.tool(
  'enviar_mensaje',
  'Envía un mensaje a un canal de Discord específico',
  {
    canal_nombre: z.string().describe('Nombre del canal sin el #'),
    mensaje: z.string().describe('Texto a enviar')
  },
  async ({ canal_nombre, mensaje }) => {
    const channel = discord.channels.cache.find(c => c.name === canal_nombre && c.isTextBased());
    if (!channel) {
      return { content: [{ type: 'text', text: `Canal #${canal_nombre} no encontrado.` }] };
    }
    await channel.send(mensaje);
    return { content: [{ type: 'text', text: `Mensaje enviado a #${canal_nombre}: ${mensaje}` }] };
  }
);

// Herramienta 3: Crear canal de texto
server.tool(
  'crear_canal_texto',
  'Crea un nuevo canal de texto en el servidor',
  {
    nombre: z.string().describe('Nombre del nuevo canal')
  },
  async ({ nombre }) => {
    const guild = discord.guilds.cache.first();
    if (!guild) {
      return { content: [{ type: 'text', text: 'No se encontró ningún servidor vinculado.' }] };
    }
    const nuevoCanal = await guild.channels.create({
      name: nombre,
      type: ChannelType.GuildText
    });
    return { content: [{ type: 'text', text: `Canal #${nuevoCanal.name} creado con éxito.` }] };
  }
);

// Montar transporte Streamable HTTP (ruta /mcp)
createMcpExpressApp(server, { app });

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor MCP Streamable HTTP activo en puerto ${port} (ruta /mcp)`);
});
