import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"
import { MAX_FILE_SIZE, MAX_FILE_TTL_SECONDS, MAX_TEXT_TTL_SECONDS, MB } from "@/lib/config"

export const metadata: Metadata = { title: "Privacy" }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 2026">
      <p>
        PasteHere is a no-account sharing tool. This page explains, in plain language, what happens to what you share.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>The text or files you share, so the people you give the link or code to can open them.</li>
        <li>A 6-digit code that points to your share, and the time it was created and expires.</li>
      </ul>
      <p>We don&apos;t have accounts, so nothing is tied to a name or email address.</p>

      <h2>How long we keep it</h2>
      <p>
        You choose when a share expires. Text can last up to {MAX_TEXT_TTL_SECONDS / 86400} days and files up to{" "}
        {MAX_FILE_TTL_SECONDS / 3600} hours (each file up to {MAX_FILE_SIZE / MB} MB). An expired share stops opening
        immediately, and a cleanup job removes the data from storage shortly after. There is currently no button to delete a
        share early, so choose a short expiry for anything sensitive.
      </p>

      <h2>Who can see your share</h2>
      <p>
        <strong>Anyone who has the link or the code.</strong> Links are long and random. Codes are only 6 digits, so treat
        them like a short-lived meeting number rather than a password, and don&apos;t share secrets such as passwords or
        private keys here.
      </p>
      <p>
        Shares are sent over HTTPS and stored encrypted at rest by our storage provider, but they are not end-to-end
        encrypted: the site operator could technically read stored content.
      </p>

      <h2>Logs, IP addresses and cookies</h2>
      <ul>
        <li>
          Our hosting providers (Vercel and Cloudflare) process standard request data such as IP address and browser type
          to deliver the service.
        </li>
        <li>We temporarily use your IP address, for up to an hour, to limit abuse (for example guessing codes).</li>
        <li>No advertising, no analytics and no tracking cookies.</li>
        <li>
          Your browser keeps a list of your recent shares, plus your theme and paste preferences, in local storage. That
          data never leaves your device and you can clear it from the Recent page.
        </li>
      </ul>

      <h2>Reporting a problem</h2>
      <p>If you find content that shouldn&apos;t be here, use the contact link in the footer and include the share code.</p>
    </LegalPage>
  )
}
