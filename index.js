/**
 * TERMUX-MD - Bot WhatsApp basé sur Baileys
 * Créateur : Kasereka Mbafumoja
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore
} from "@whiskeysockets/baileys";
import fs from "fs";
import pino from "pino";
import { Boom } from "@hapi/boom";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Store messages (in-memory)
const store = makeInMemoryStore({
  logger: pino().child({ level: "silent", stream: "store" }),
});

// Charger config
const BOT_NAME = process.env.BOT_NAME || "TERMUX-ZWD";
const PREFIX = process.env.PREFIX || ".";
const OWNER_NUMBER = process.env.OWNER_NUMBER || "24397xxxxxxx";
let AUTO_STATUS_VIEW = process.env.AUTO_STATUS_VIEW === "true";

// Anti-link config (par groupe)
let antilinkGroups = {};

// Fonction principale
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(join(__dirname, "session"));
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: [BOT_NAME, "Chrome", "1.0.0"],
  });

  store.bind(sock.ev);

  // Pairing par code
  if (!sock.authState.creds.registered) {
    const phoneNumber = process.env.PHONE_NUMBER;
    if (!phoneNumber) {
      console.log("❌ Ajoute ton numéro dans .env (PHONE_NUMBER=24397xxxxxxx)");
      process.exit(1);
    }
    setTimeout(async () => {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log(`✅ Ton code de liaison est : ${code}`);
    }, 3000);
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("⚠️ Déconnexion :", lastDisconnect.error);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === "open") {
      console.log(`🤖 ${BOT_NAME} est connecté !`);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Anti-link et commandes
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    const msg = messages[0];
    if (!msg.message) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const from = msg.key.remoteJid;

    // Anti-link
    if (antilinkGroups[from]) {
      const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      if (body.includes("chat.whatsapp.com")) {
        await sock.sendMessage(from, { text: "🚫 Lien interdit détecté, message supprimé !" }, { quoted: msg });
        await sock.sendMessage(from, { delete: msg.key });
      }
    }

    // Vérifier si c'est une commande
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      "";
    if (!body.startsWith(PREFIX)) return;

    const args = body.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    switch (command) {
      case "ping":
        await sock.sendMessage(from, { text: "🏓 Pong!" }, { quoted: msg });
        break;
      case "menu":
        await sock.sendMessage(from, {
          text: `👋 Salut, je suis *${BOT_NAME}*\n\nCommandes dispo :\n${PREFIX}ping\n${PREFIX}menu\n${PREFIX}owner\n${PREFIX}antilink on/off\n${PREFIX}statusview on/off`
        }, { quoted: msg });
        break;
      case "owner":
        await sock.sendMessage(from, { text: `👑 Propriétaire : ${OWNER_NUMBER}` }, { quoted: msg });
        break;
      case "antilink":
        if (!msg.key.fromMe && !msg.key.participant?.includes(OWNER_NUMBER)) {
          await sock.sendMessage(from, { text: "❌ Seul l'owner peut exécuter cette commande." });
          break;
        }
        if (args[0] === "on") {
          antilinkGroups[from] = true;
          await sock.sendMessage(from, { text: "✅ Anti-link activé pour ce groupe." });
        } else if (args[0] === "off") {
          delete antilinkGroups[from];
          await sock.sendMessage(from, { text: "❌ Anti-link désactivé pour ce groupe." });
        }
        break;
      case "statusview":
        if (args[0] === "on") {
          AUTO_STATUS_VIEW = true;
          await sock.sendMessage(from, { text: "👀 Auto status view activé." });
        } else if (args[0] === "off") {
          AUTO_STATUS_VIEW = false;
          await sock.sendMessage(from, { text: "🚫 Auto status view désactivé." });
        }
        break;
    }
  });

  // Auto-view des statuts
  sock.ev.on("messages.upsert", async ({ messages }) => {
    if (!AUTO_STATUS_VIEW) return;
    for (const msg of messages) {
      if (msg.key && msg.key.remoteJid === "status@broadcast") {
        await sock.readMessages([msg.key]);
        console.log("👀 Statut vu automatiquement.");
      }
    }
  });
}

startBot();
