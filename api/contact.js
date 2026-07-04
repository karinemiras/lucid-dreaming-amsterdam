const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SITE_URL = "https://www.luciddreamingamsterdam.nl/";
const PROFILE_IMAGE_URL = `${SITE_URL}figures/karine-miras-lucid-dreaming-amsterdam-portrait.png`;

const replyCopy = {
  workshop_waiting_list: {
    subject: "Workshop waiting list confirmation",
    text: (name) =>
      `Dear ${name},\n\nThank you for joining the Lucid Dreaming Workshop waiting list.\n\nI will let you know when the workshop date is available.\n\nWarmly,\nKarine Miras\n\n${SITE_URL}`,
    html: (name) =>
      confirmationHtml(name, "Thank you for joining the Lucid Dreaming Workshop waiting list.", "I will let you know when the workshop date is available.")
  },
  coaching_availability: {
    subject: "Coaching request confirmation",
    text: (name) =>
      `Dear ${name},\n\nThank you for your interest in lucid dreaming coaching.\n\nI will let you know when I am available for coaching.\n\nWarmly,\nKarine Miras\n\n${SITE_URL}`,
    html: (name) =>
      confirmationHtml(name, "Thank you for your interest in lucid dreaming coaching.", "I will let you know when I am available for coaching.")
  },
  general_contact: {
    subject: "Message received",
    text: (name) =>
      `Dear ${name},\n\nThank you for your message.\n\nI will get back to you when I can.\n\nWarmly,\nKarine Miras\n\n${SITE_URL}`,
    html: (name) =>
      confirmationHtml(name, "Thank you for your message.", "I will get back to you when I can.")
  }
};

function parseBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return Object.fromEntries(new URLSearchParams(req.body));
  }

  return {};
}

function clean(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function confirmationHtml(name, firstLine, secondLine) {
  const safeName = escapeHtml(name);
  const safeFirstLine = escapeHtml(firstLine);
  const safeSecondLine = escapeHtml(secondLine);

  return `
    <div style="margin:0;padding:28px;background:#faf5ef;color:#2d2926;font-family:Arial,sans-serif;line-height:1.6;">
      <div style="max-width:560px;margin:0 auto;padding:28px;border-radius:18px;background:#fffaf5;border:1px solid rgba(74,57,42,0.12);">
        <p style="margin:0 0 16px;font-size:18px;">Dear ${safeName},</p>
        <p style="margin:0 0 12px;">${safeFirstLine}</p>
        <p style="margin:0 0 22px;">${safeSecondLine}</p>
        <p style="margin:0 0 22px;">Warmly,<br />Karine Miras</p>
        <img src="${PROFILE_IMAGE_URL}" alt="Karine Miras" style="display:block;width:140px;max-width:100%;border-radius:90px 90px 16px 16px;margin:0 0 18px;" />
        <p style="margin:0;"><a href="${SITE_URL}" style="color:#8e542f;text-decoration:underline;">${SITE_URL}</a></p>
      </div>
    </div>
  `;
}

async function sendEmail(apiKey, payload) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email provider rejected the message: ${detail}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).send("Method Not Allowed");
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !toEmail || !fromEmail) {
    res.status(500).send("Email delivery is not configured yet.");
    return;
  }

  const body = parseBody(req);
  const name = clean(body.name);
  const email = clean(body.email);
  const message = clean(body.message);
  const inquiryType = clean(body.inquiry_type) || "contact";
  const replyContext = clean(body.reply_context) || "general_contact";
  const trap = clean(body.website);

  if (trap) {
    res.status(303).setHeader("Location", `/thank-you.html?type=${encodeURIComponent(inquiryType)}`);
    res.end();
    return;
  }

  if (!name || !isEmail(email) || !message) {
    res.status(400).send("Please include your name, email, and message.");
    return;
  }

  const confirmation = replyCopy[replyContext] || replyCopy.general_contact;
  const safeType = escapeHtml(inquiryType);
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

  try {
    await sendEmail(apiKey, {
      from: fromEmail,
      to: toEmail,
      reply_to: email,
      subject: `New ${inquiryType} message from ${name}`,
      text: `Type: ${inquiryType}\nName: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<p><strong>Type:</strong> ${safeType}</p><p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p>${safeMessage}</p>`
    });

    await sendEmail(apiKey, {
      from: fromEmail,
      to: email,
      subject: confirmation.subject,
      text: confirmation.text(name),
      html: confirmation.html(name)
    });

    res.status(303).setHeader("Location", `/thank-you.html?type=${encodeURIComponent(inquiryType)}`);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).send("The message could not be sent right now.");
  }
};
