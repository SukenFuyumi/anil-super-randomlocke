# 🖥️ Alojar el servidor online 24/7 (Oracle Cloud – gratis)

Guía para montar el servidor del **modo online (Cable Club)** en una máquina **gratis para siempre** de Oracle Cloud, corriendo 24/7 (no depende de que nadie tenga el PC encendido).

> Funciona igual en cualquier VPS Ubuntu (Hetzner, DigitalOcean…); solo cambia la parte de crear la máquina.

---

## Parte A — Crear la máquina (Oracle Cloud)
1. Entra a **https://www.oracle.com/cloud/free/** → **Start for free** y crea tu cuenta (pide una tarjeta para verificar, pero **Always Free no cobra**). Elige una **región (Home Region) cercana** a tus jugadores.
2. En el panel: **☰ → Compute → Instances → Create instance**.
3. Configura:
   - **Image**: *Canonical Ubuntu* (la versión LTS más nueva).
   - **Shape**: pulsa *Change shape* → **Ampere (A1.Flex)** si hay disponibilidad, o **VM.Standard.E2.1.Micro** (AMD). Ambos son **Always Free**; el E2.1.Micro casi siempre está disponible y sobra para esto.
   - **Networking**: deja que cree una VCN nueva y **asigna una IP pública** (*Assign a public IPv4 address*).
   - **SSH keys**: elige *Generate a key pair* y **descarga la clave privada** (la usarás para conectarte).
4. **Create**. En 1–2 min tendrás una **IP pública** (apúntala; es la que darás a tus jugadores).

## Parte B — Abrir el puerto 25565 (¡el paso que todos olvidan!)
Hay que abrirlo en **DOS** sitios:

**1) En la red de Oracle (Security List):**
- **☰ → Networking → Virtual Cloud Networks →** tu VCN **→ Security Lists →** *Default Security List* **→ Add Ingress Rules**.
- Source CIDR: `0.0.0.0/0` · IP Protocol: **TCP** · Destination Port Range: **25565** → **Add**.

**2) En el firewall de la propia máquina** (más abajo, ya conectado por SSH).

## Parte C — Instalar y dejar el servidor corriendo 24/7
Conéctate por SSH (usuario **ubuntu**):
```bash
ssh -i tu-clave.key ubuntu@TU-IP-PUBLICA
```
*(En Windows puedes usar PuTTY o el `ssh` de PowerShell. Convierte la clave a .ppk si usas PuTTY.)*

Ya dentro, pega esto:
```bash
# Abrir el puerto en el firewall de la máquina (Oracle Ubuntu lo trae cerrado)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 25565 -j ACCEPT
sudo netfilter-persistent save

# Dependencias + descargar el servidor
sudo apt update && sudo apt install -y python3 unzip
mkdir -p ~/cable-club-server && cd ~/cable-club-server
wget -O server.zip https://github.com/SukenFuyumi/anil-super-randomlocke/releases/download/cable-club-server/cable-club-server.zip
unzip -o server.zip

# Prueba rápida (Ctrl+C para parar)
python3 cable_club_v20_21.py --host 0.0.0.0 --port 25565
```
Si arranca sin errores, ¡vas bien! Párala con **Ctrl+C** y déjala como **servicio** (se reinicia sola y arranca al encender la máquina):
```bash
sudo tee /etc/systemd/system/cableclub.service > /dev/null <<'EOF'
[Unit]
Description=Cable Club Server (Pokemon Anil online)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/cable-club-server
ExecStart=/usr/bin/python3 cable_club_v20_21.py --host 0.0.0.0 --port 25565
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now cableclub
sudo systemctl status cableclub    # debe decir "active (running)"
```

## Parte D — Conectar a los jugadores
Cada jugador pone en su `Data/serverinfo.ini`:
```
HOST = TU-IP-PUBLICA
PORT = 25565
```
¡Y a combatir! El servidor queda encendido siempre.

---

## 🔧 Comandos útiles (en la máquina)
```bash
sudo systemctl status cableclub      # ¿está corriendo?
sudo systemctl restart cableclub     # reiniciar
sudo systemctl stop cableclub        # apagar
journalctl -u cableclub -f           # ver la actividad en vivo
tail -f ~/cable-club-server/server.log   # log del servidor
```

## 🛠️ Si no conecta
- **Casi siempre es el puerto**: revisa que hiciste **los dos** pasos de la Parte B (Security List de Oracle **y** el `iptables` de la máquina).
- Comprueba desde tu PC que el puerto responde: en la web https://www.yougetsignal.com/tools/open-ports/ pon tu IP y el puerto 25565.
- La IP pública de Oracle es "efímera" por defecto (suele mantenerse). Si quieres que no cambie nunca, resérvala: *Networking → IP Management → Reserved Public IPs*.
