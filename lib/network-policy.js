import dns from "node:dns/promises";
import net from "node:net";
import http from "node:http";
import https from "node:https";

export function normalizeAddress(address) {
  if (!address) return address;
  const lower = String(address).toLowerCase();
  const mapped = lower.match(/^::ffff:(?:0*:)?([0-9a-f:.]+)$/);
  if (mapped) {
    const tail = mapped[1];
    if (/^\d+(?:\.\d+){3}$/.test(tail)) return tail;
    const hex = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const a = parseInt(hex[1], 16);
      const b = parseInt(hex[2], 16);
      return `${(a >> 8) & 255}.${a & 255}.${(b >> 8) & 255}.${b & 255}`;
    }
  }
  return lower;
}

export function resolveLoopbackUrl(value) {
  let u;
  try { u = new URL(value); } catch { throw new Error("invalid target URL"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("target URL must use http or https");
  if (u.username || u.password) throw new Error("target URL credentials are not allowed");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    throw new Error("only local target URLs are allowed");
  }
  return u;
}

export function isPrivateAddress(address) {
  const normalized = normalizeAddress(address);
  if (!normalized) return false;
  if (net.isIPv4(normalized)) {
    const n = normalized.split(".").map(Number);
    const [a, b, c] = n;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (n[0] === 169 && n[1] === 254) ||
      (n[0] === 172 && n[1] >= 16 && n[1] <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 2 && c === 0) || (b === 88 && c === 99))) ||
      (n[0] === 100 && n[1] >= 64 && n[1] <= 127) ||
      (a === 198 && (b === 18 || b === 19 || b === 51 && c === 100)) ||
      (a === 203 && b === 0 && c === 113);
  }
  if (!net.isIPv6(normalized)) return true;
  const words = ipv6Words(normalized);
  if (!words) return true;
  if (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff) {
    const mapped = `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`;
    return isPrivateAddress(mapped);
  }
  const first = words[0];
  const second = words[1];
  if (first < 0x2000 || first > 0x3fff) return true;
  if (first === 0x2001 && (second === 0 || second === 0x0db8 || second === 0x0010)) return true;
  return first === 0x2002;
}

function ipv6Words(address) {
  const dotted = address.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  let normalized = address;
  if (dotted) {
    const bytes = dotted[1].split(".").map(Number);
    const pair = `${((bytes[0] << 8) | bytes[1]).toString(16)}:${((bytes[2] << 8) | bytes[3]).toString(16)}`;
    normalized = address.replace(dotted[1], pair);
  }
  const halves = normalized.split("::");
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const zeros = halves.length === 2 ? 8 - left.length - right.length : 0;
  const parts = halves.length === 2
    ? [...left, ...Array(zeros).fill("0"), ...right]
    : left;
  if (parts.length !== 8) return null;
  return parts.map((part) => Number.parseInt(part, 16));
}

async function resolvePublicEndpoint(value) {
  let u;
  try { u = new URL(value); } catch { throw new Error("invalid target URL"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("target URL must use http or https");
  if (u.username || u.password) throw new Error("target URL credentials are not allowed");
  if (!u.hostname) throw new Error("invalid target URL");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isPrivateAddress(host)) throw new Error("private target URLs are not allowed");
  const addresses = await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((x) => isPrivateAddress(normalizeAddress(x.address)))) {
    throw new Error("private target URLs are not allowed");
  }
  return { url: u, addresses };
}

export async function resolvePublicUrl(value) {
  return (await resolvePublicEndpoint(value)).url;
}

export async function validateRedirectChain(value, maxRedirects = 5) {
  let endpoint = await resolvePublicEndpoint(value);
  for (let i = 0; i <= maxRedirects; i++) {
    const response = await new Promise((resolve, reject) => {
      const client = endpoint.url.protocol === "https:" ? https : http;
      const req = client.request(endpoint.url, {
        method: "HEAD",
        timeout: 5000,
        headers: { "User-Agent": "Kane-Court-URL-Validator/1.0" },
        lookup: (_hostname, options, callback) => {
          const records = options && options.family
            ? endpoint.addresses.filter((record) => record.family === options.family)
            : endpoint.addresses;
          if (!records.length) {
            callback(new Error("no validated target address matches the requested family"));
          } else if (options && options.all) {
            callback(null, records);
          } else {
            callback(null, records[0].address, records[0].family);
          }
        }
      }, resolve);
      req.end();
      req.on("timeout", () => req.destroy(new Error("target validation timed out")));
      req.on("error", reject);
    });
    response.resume();
    const status = response.statusCode || 0;
    if (status < 300 || status >= 400) return;
    const location = response.headers.location;
    if (!location) return;
    if (i === maxRedirects) throw new Error("too many target redirects");
    endpoint = await resolvePublicEndpoint(new URL(location, endpoint.url).toString());
  }
}
