import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

const PUBLIC = "./public";
const RENDERS = "./renders";

await mkdir(RENDERS, { recursive: true });

const port = 9999;

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/upload") {
      const name = url.searchParams.get("name") ?? "project";
      const frame = Number(url.searchParams.get("frame") ?? 0);

      const dir = join(RENDERS, name);
      await mkdir(dir, { recursive: true });

      const file = join(
        dir,
        `${String(frame).padStart(12, "0")}.png`
      );

      await writeFile(file, Buffer.from(await req.arrayBuffer()));

      return new Response("ok");
    }

    if (req.method === "POST" && url.pathname === "/audio") {
      const name = url.searchParams.get("name") ?? "project";

      const file = join(RENDERS, `${name}.wav`);

      await writeFile(file, Buffer.from(await req.arrayBuffer()));

      return new Response("ok");
    }

    let path = url.pathname;

    if (path === "/")
      path = "/index.html";

    const file = Bun.file(join(PUBLIC, path));

    if (await file.exists())
      return new Response(file);

    return new Response("Not found", {
      status: 404,
    });
  },
});

console.log(`server running on http://localhost:${port}/`);