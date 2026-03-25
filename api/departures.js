export default async function handler(req, res) {
  try {
    const token = process.env.GOLEMIO_TOKEN;

    if (!token) {
      return res.status(500).json({ error: "Missing GOLEMIO_TOKEN" });
    }

    const url =
      "https://api.golemio.cz/v2/pid/departureboards/?names=Praha-Libeň&limit=10&minutesAfter=120";

    const response = await fetch(url, {
      headers: {
        "X-Access-Token": token,
        Accept: "application/json",
      },
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).send(text);
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(text);
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}