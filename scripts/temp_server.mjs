import { serve } from "./lib/server.mjs";
serve(process.cwd()).then(s => {
  console.log("PORT:", s.port);
  process.on("exit", () => s.close());
});
