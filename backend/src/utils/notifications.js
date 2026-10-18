const { prisma } = require("../lib/prisma");

async function sendPush(userId, title, body, data = {}) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.pushToken) return;

  try {
    await fetch(process.env.EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: user.pushToken,
        sound: "default",
        title,
        body,
        data,
      }),
    });
  } catch (e) {
    console.error("Push notification error:", e);
  }
}

module.exports = { sendPush };