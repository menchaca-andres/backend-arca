import 'dotenv/config';
import { app } from './app';

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(`[ms-contratos] Running on port ${PORT}`);
});
