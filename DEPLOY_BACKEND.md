# Deploy Backend - Render.com

## Variáveis de Ambiente Necessárias

Configure estas variáveis no Render.com:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://admin_portal:mUEaBpIvbZKso2sN@portal-finance-cluster.dtxbtap.mongodb.net/portal-finance?retryWrites=true&w=majority&appName=portal-finance-cluster
JWT_SECRET=instasolutions_jwt_secret_2025_super_seguro
JWT_EXPIRE=30d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-senha-de-app
EMAIL_FROM=InstaSolutions <noreply@instasolutions.com>
FRONTEND_URL=https://seu-frontend.vercel.app
```

## Comandos de Build

- **Build Command:** `npm install`
- **Start Command:** `npm start`
