# Deployment Notes

This site can live in a GitHub repository, but it should be deployed with Vercel if the contact form backend is needed.

GitHub Pages can host the static pages, but it cannot run `/api/contact`.

## Vercel Setup

1. Push this folder to GitHub.
2. Import the GitHub repository into Vercel.
3. Add the domain `luciddreamingamsterdam.nl` in Vercel.
4. Set these Vercel environment variables:

```text
RESEND_API_KEY=your_resend_api_key
CONTACT_TO_EMAIL=your_private_receiving_email
CONTACT_FROM_EMAIL=Lucid Dreaming Amsterdam <hello@luciddreamingamsterdam.nl>
```

The personal receiving email stays private because it is stored as an environment variable, not in the website files.

## Email Sending

The backend uses Resend to send:

- one email to the private receiving address with the submitted message
- one confirmation email to the visitor

Workshop confirmation:

```text
Thank you for joining the Lucid Dreaming Workshop waiting list.

I will let you know when the workshop date is available.

Karine
```

Coaching confirmation:

```text
Thank you for your interest in lucid dreaming coaching.

I will let you know when I am available for coaching.

Karine
```
