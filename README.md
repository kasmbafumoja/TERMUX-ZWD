# TERMUX-MD — WhatsApp Bot (Baileys, Pairing Code)

**Creator:** kasereka mbafumoja

## Login
- No QR. On first run, the bot shows an **8‑digit pairing code** in the terminal.
- On your phone: WhatsApp → Linked devices → Link a device → Enter code.

## Features
- Group **anti‑link** (auto delete if bot is admin)
- **Auto‑status view**
- Commands: `.menu`, `.ping`, `.owner`, `.antilink on|off`, `.statusview on|off`

## Setup
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/TERMUX-MD.git
cd TERMUX-MD
npm install
cp .env.example .env
# edit .env values
node index.js
