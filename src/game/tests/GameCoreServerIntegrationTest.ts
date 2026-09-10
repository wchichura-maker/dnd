import { spawn, type ChildProcess } from "node:child_process";

const PORT = 8878;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function waitForServer(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Game Core não iniciou a tempo.")), 10000);
    const onExit = (code: number | null) => {
      clearTimeout(timeout);
      reject(new Error(`Game Core encerrou antes de ficar disponível (code=${code}).`));
    };
    child.once("exit", onExit);

    const poll = async () => {
      try {
        const response = await fetch(`${BASE_URL}/health`);
        if (response.ok) {
          clearTimeout(timeout);
          child.off("exit", onExit);
          resolve();
          return;
        }
      } catch {
        // O processo pode levar alguns ciclos para iniciar.
      }
      setTimeout(poll, 100);
    };

    void poll();
  });
}

export async function runGameCoreServerIntegrationTests(): Promise<void> {
  console.log("INICIANDO TESTES DE INTEGRAÇÃO DO GAME CORE SERVER");

  const child = spawn("npx", ["tsx", "src/game/transport/GameCoreServer.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, GAME_CORE_PORT: String(PORT) },
    stdio: "ignore",
    shell: true
  });

  try {
    await waitForServer(child);

    const firstResponse = await fetch(`${BASE_URL}/state`);
    if (!firstResponse.ok) throw new Error(`GET /state falhou: ${firstResponse.status}`);
    const firstSnapshot = await firstResponse.json();

    const secondResponse = await fetch(`${BASE_URL}/state`);
    if (!secondResponse.ok) throw new Error(`Segundo GET /state falhou: ${secondResponse.status}`);
    const secondSnapshot = await secondResponse.json();

    if (JSON.stringify(firstSnapshot) !== JSON.stringify(secondSnapshot)) {
      throw new Error("GET /state alterou o snapshot entre duas leituras consecutivas.");
    }

    const actionLog = (secondSnapshot as { actionLog?: unknown[] }).actionLog;
    if (!Array.isArray(actionLog) || actionLog.length !== 0) {
      throw new Error("GET /state gerou efeitos colaterais no actionLog.");
    }

    console.log("✓ GET /state é somente leitura e não inicia combate nem executa IA");
    console.log("✓ TESTES DE INTEGRAÇÃO DO GAME CORE SERVER PASSARAM");
  } finally {
    child.kill();
  }
}
