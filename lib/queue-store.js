import fs from "node:fs";
import path from "node:path";

export function withQueueLock(queuePath, operation) {
  const lockPath = `${queuePath}.lock`;
  const deadline = Date.now() + 5000;
  let locked = false;
  while (!locked) {
    try {
      fs.mkdirSync(lockPath);
      locked = true;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > 30000) fs.rmdirSync(lockPath);
      } catch {}
      if (Date.now() >= deadline) throw new Error("queue lock timeout");
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  try {
    return operation();
  } finally {
    try { fs.rmdirSync(lockPath); } catch {}
  }
}

export function readQueue(queuePath) {
  let text;
  try { text = fs.readFileSync(queuePath, "utf8"); }
  catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("queue JSON must contain an array");
  return parsed;
}

export function writeQueueAtomic(queuePath, queue) {
  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  const temp = `${queuePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(queue, null, 2));
  fs.renameSync(temp, queuePath);
}
