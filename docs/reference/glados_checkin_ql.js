/**
 * GLaDOS Checkin
 *
 * - 默认走脚本内 HTTP 代理：http://10.0.0.238:17890
 * - 代理、兑换开关、兑换套餐均在脚本内配置，不读取环境变量
 * - 多账号优先使用 ;; 分隔，兼容旧版 @ 分隔
 * - 首个账号前及账号之间随机延迟、失败重试
 * - 已签到自动识别、Cookie 失效检测
 * - 每账号详情统计
 * - 通知失败不影响主流程
 *
 * 青龙环境变量：
 *   GLADOS_COOKIE=cookie1;;cookie2
 */

const axios = require("axios");

let notify;
try {
  notify = require("/ql/data/scripts/sendNotify.js");
} catch {
  notify = require("/ql/scripts/sendNotify.js");
}

const GLADOS_BASE_URL = "https://glados.one";
const CHECKIN_URL = `${GLADOS_BASE_URL}/api/user/checkin`;
const POINTS_URL = `${GLADOS_BASE_URL}/api/user/points`;
const EXCHANGE_URL = `${GLADOS_BASE_URL}/api/user/exchange`;

// ===== 脚本内配置区 =====
// 如需直连，将 PROXY_URL 改为空字符串：""。
const PROXY_URL = "http://10.0.0.238:17890";

// 兑换配置固定写在脚本中，不从环境变量读取。
const GLADOS_EXCHANGE = false;
const GLADOS_PLAN = "plan500";

const REQUEST_RETRIES = Number(process.env.GLADOS_RETRIES || 3);
const SIGN_DELAY_MIN_MS = 100;
const SIGN_DELAY_MAX_MS = 20000;

const HEADERS_TEMPLATE = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
};

function buildAxiosProxy(proxyUrl) {
  if (!proxyUrl) return false;

  try {
    const u = new URL(proxyUrl);
    return {
      protocol: u.protocol.replace(":", ""),
      host: u.hostname,
      port: Number(u.port || (u.protocol === "https:" ? 443 : 80))
    };
  } catch {
    console.log(`⚠️ 代理地址无效，已尝试直连：${proxyUrl}`);
    return false;
  }
}

const AXIOS_PROXY = buildAxiosProxy(PROXY_URL);

const request = axios.create({
  timeout: 25000,
  proxy: AXIOS_PROXY
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(minMs = SIGN_DELAY_MIN_MS, maxMs = SIGN_DELAY_MAX_MS) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

async function sleepBeforeAccount(index) {
  const delay = randomDelay();
  console.log(`⏳ 账号${index} 签到前随机延迟 ${(delay / 1000).toFixed(1)} 秒`);
  await sleep(delay);
}

function truncateText(text, maxLength = 80) {
  const value = String(text || "");
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function parseCookies(cookieEnv) {
  if (!cookieEnv) return [];

  // 推荐 ;;，避免 Cookie 中出现 @ 时被误切。保留 @ 是为了兼容旧配置。
  const separator = cookieEnv.includes(";;") ? ";;" : "@";
  return cookieEnv
    .split(separator)
    .map(cookie => cookie.trim())
    .filter(Boolean);
}

function isCookieInvalid(data, error) {
  const status = error?.response?.status;
  if ([401, 403].includes(status)) return true;

  const msg = String(data?.message || error?.response?.data?.message || "").toLowerCase();
  return msg.includes("login") || msg.includes("unauthorized");
}

function isSuccessOrAlreadyChecked(data) {
  const msg = String(data?.message || "");
  const lowerMsg = msg.toLowerCase();

  return (
    data?.code === 0 ||
    lowerMsg.includes("already") ||
    lowerMsg.includes("today") ||
    lowerMsg.includes("return tomorrow")
  );
}

async function getPoints(headers) {
  try {
    const res = await request.get(POINTS_URL, { headers });
    const points = res.data?.points;
    if (points === undefined || points === null) {
      return { points: "N/A", pointsNum: 0 };
    }

    const pointsNum = parseInt(parseFloat(points), 10);
    return {
      points: String(pointsNum),
      pointsNum: Number.isNaN(pointsNum) ? 0 : pointsNum
    };
  } catch (error) {
    const detail = truncateText(error.message || String(error));
    console.log(`⚠️ 积分查询失败：${detail}`);
    return { points: "N/A", pointsNum: 0 };
  }
}

async function exchangePlan(headers) {
  try {
    const res = await request.post(EXCHANGE_URL, { planType: GLADOS_PLAN }, { headers });
    const data = res.data || {};
    const msg = truncateText(data.message || "");

    if (data.code === 0) {
      return `兑换成功(${GLADOS_PLAN})`;
    }

    return msg ? `兑换失败：${msg}` : "兑换失败";
  } catch (error) {
    return `兑换异常：${truncateText(error.message || String(error))}`;
  }
}

async function maybeExchange(headers, index, points) {
  if (!GLADOS_EXCHANGE) return "跳过(未开启)";

  if (points.pointsNum < 500) {
    return `跳过(积分不足，当前 ${points.points})`;
  }

  const result = await exchangePlan(headers);
  console.log(`🎁 账号${index} ${result}`);
  return result;
}

async function checkin(cookie, index) {
  console.log(`🔄 账号${index} 开始签到`);

  const headers = {
    ...HEADERS_TEMPLATE,
    Cookie: cookie
  };

  let lastError = "";

  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt++) {
    try {
      const res = await request.post(CHECKIN_URL, {}, { headers });
      const data = res.data || {};
      const msg = data.message || "";

      if (isSuccessOrAlreadyChecked(data)) {
        const detail = truncateText(msg || "已签到");
        const points = await getPoints(headers);
        const exchange = await maybeExchange(headers, index, points);
        console.log(`✅ 账号${index} 签到成功 / 已签到  [${detail}]`);
        console.log(`💰 账号${index} 当前积分：${points.points}`);
        return {
          status: "success",
          index,
          msg: detail,
          points: points.points,
          exchange
        };
      }

      if (isCookieInvalid(data)) {
        const detail = truncateText(msg || "Cookie 失效");
        console.log(`❌ 账号${index} Cookie 失效（${detail}）`);
        return { status: "expired", index, msg: detail, points: "N/A", exchange: "跳过" };
      }

      const detail = truncateText(msg || "未知错误");
      console.log(`⚠️ 账号${index} 签到失败：${detail}`);
      return { status: "fail", index, msg: detail, points: "N/A", exchange: "跳过" };
    } catch (error) {
      if (isCookieInvalid(null, error)) {
        const status = error?.response?.status;
        const detail = status ? `Cookie 失效（HTTP ${status}）` : "Cookie 失效";
        console.log(`❌ 账号${index} ${detail}`);
        return { status: "expired", index, msg: detail, points: "N/A", exchange: "跳过" };
      }

      lastError = truncateText(error.message || String(error));

      if (attempt < REQUEST_RETRIES) {
        const waitSeconds = attempt * 2;
        console.log(
          `⚠️ 账号${index} 请求异常，第 ${attempt}/${REQUEST_RETRIES} 次：${lastError}，${waitSeconds}s 后重试`
        );
        await sleep(waitSeconds * 1000);
      }
    }
  }

  console.log(`⚠️ 账号${index} 请求异常：${lastError}`);
  return { status: "fail", index, msg: lastError || "请求异常", points: "N/A", exchange: "跳过" };
}

async function safeNotify(title, content) {
  try {
    await notify.sendNotify(title, content);
  } catch (error) {
    console.log(`⚠️ 通知发送失败（已忽略）：${error.message || error}`);
  }
}

function getProxyLabel() {
  return PROXY_URL && AXIOS_PROXY ? PROXY_URL : "直连";
}

function getExchangeLabel() {
  return GLADOS_EXCHANGE ? `开启（${GLADOS_PLAN}）` : `关闭（${GLADOS_PLAN}）`;
}

function buildNotifyContent(stats, detailLines) {
  return [
    "【执行结果】",
    `账号总数：${stats.total}`,
    `成功/已签到：${stats.success}`,
    `失败：${stats.fail}`,
    `Cookie 失效：${stats.expired}`,
    "",
    "【脚本配置】",
    `网络代理：${getProxyLabel()}`,
    `自动兑换：${getExchangeLabel()}`,
    "",
    "【账号明细】",
    ...detailLines
  ].join("\n");
}

(async () => {
  const cookieEnv = (process.env.GLADOS_COOKIE || "").trim();

  if (!cookieEnv) {
    console.log("❌ 未配置 GLADOS_COOKIE");
    await safeNotify("GLaDOS 签到失败", "未配置 GLADOS_COOKIE，请在青龙环境变量中添加账号 Cookie。");
    process.exit(1);
  }

  const cookies = parseCookies(cookieEnv);

  if (cookies.length === 0) {
    console.log("❌ GLADOS_COOKIE 为空，请检查环境变量");
    await safeNotify("GLaDOS 签到失败", "GLADOS_COOKIE 为空，请检查青龙环境变量配置。");
    process.exit(1);
  }

  console.log(`🌐 网络代理：${getProxyLabel()}`);
  console.log(`🎁 自动兑换：${getExchangeLabel()}`);
  console.log(`🔔 GLaDOS 签到开始，共 ${cookies.length} 个账号`);
  console.log(`⏰ 开始时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`);
  console.log("");

  const results = [];
  for (let index = 0; index < cookies.length; index += 1) {
    await sleepBeforeAccount(index + 1);
    results.push(await checkin(cookies[index], index + 1));
  }

  const success = results.filter(r => r.status === "success").length;
  const fail = results.filter(r => r.status === "fail").length;
  const expired = results.filter(r => r.status === "expired").length;
  const stats = { total: results.length, success, fail, expired };

  const detailLines = results.map(r => {
    const icon =
      r.status === "success" ? "✅" :
      r.status === "expired" ? "❌" :
      "⚠️";
    const pointsText = ` | 积分：${r.points || "N/A"}`;
    const exchangeText = GLADOS_EXCHANGE ? ` | ${r.exchange}` : "";
    return `账号${r.index}：${icon} ${r.msg}${pointsText}${exchangeText}`;
  });

  console.log("");
  console.log("===================================");
  console.log("📊 GLaDOS 签到结果");
  console.log(`✅ 成功 / 已签到：${success}`);
  console.log(`⚠️ 失败：${fail}`);
  console.log(`❌ Cookie 失效：${expired}`);
  console.log("-----------------------------------");
  detailLines.forEach(line => console.log(`  ${line}`));
  console.log("===================================");
  console.log("");

  const notifyTitle = `GLaDOS 签到：成功${success} 失败${fail} 失效${expired}`;
  await safeNotify(notifyTitle, buildNotifyContent(stats, detailLines));

  console.log("✅ 执行完成");
})();
