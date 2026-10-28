import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Health check endpoint for Cloud Run
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Controle de Estoque Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// App configuration info
app.get('/api/info', (req, res) => {
  res.json({
    appName: 'Controle de Estoque',
    domain: 'Doces, Pães, Biscoitos, Chocolates, Balas e Descartáveis',
    features: [
      'Controle físico estrito de mercadorias sem valores monetários',
      'Rastreamento de Lotes e Validades (FEFO)',
      'Gestão de Trocas e Avarias / Mofo com fornecedores',
      'Controle de Reposições parciais e totais',
      'Histórico imutável de movimentações de estoque'
    ]
  });
});

// Serve Vite frontend build in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback for Single Page App client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
