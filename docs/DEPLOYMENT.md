# Deployment (Hostinger VPS)

> Not deployed yet — this is the plan for Phase 6. The VPS plan has not been purchased; check Hostinger's
> current VPS plans (KVM 2 or higher recommended: 2 vCPU, 8 GB RAM) before buying.
> Shared web hosting cannot run this app.

## 1. Server setup (Ubuntu 24.04)
```bash
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo npm install -g pm2
```

## 2. Get the code
```bash
git clone https://github.com/<owner>/gaia-learning-premium.git /var/www/gaia
cd /var/www/gaia
cp .env.example .env.local   # fill in real values on the server only
npm ci
npm run build
pm2 start npm --name gaia -- start
pm2 save && pm2 startup
```

## 3. Nginx reverse proxy + HTTPS
```nginx
server {
  server_name learning.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d learning.example.com
```

## 4. Updating
```bash
cd /var/www/gaia && git pull && npm ci && npm run build && pm2 reload gaia
```

## Notes
- Videos are **not** stored on the VPS; they stream from Cloudflare Stream.
- The database lives on Supabase (managed PostgreSQL); back-ups are handled there.
- Stripe webhook URL (Phase 4): `https://<domain>/api/webhooks/stripe`.
