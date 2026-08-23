import "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(process.env.PORT, () => {
  console.log(`API server listening on port ${process.env.PORT} (${process.env.NODE_ENV})`);
});
