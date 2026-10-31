import 'dotenv/config';
import { app } from './app';

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`[gateway] Running on port ${PORT}`);
});
