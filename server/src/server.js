import app from './app.js';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In standalone production (e.g. Docker), serve built Vite client
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`GFlow API Server running on http://localhost:${PORT}`);
  console.log(`Accepting client requests from ${CLIENT_URL}`);
});
