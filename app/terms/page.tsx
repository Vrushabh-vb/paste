import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = { title: "Terms" }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="October 2026">
      <p>By using PlainText you agree to these terms. They are short on purpose.</p>

      <h2>The service</h2>
      <p>
        PlainText is free and provided as is, without guarantees. It may be slow, limited or unavailable at times, and it
        may change or stop at any point. Don&apos;t rely on it as the only copy of anything important: shares are deleted
        automatically.
      </p>

      <h2>What you may share</h2>
      <p>You are responsible for what you share. Don&apos;t upload or share:</p>
      <ul>
        <li>anything illegal, or content that sexually exploits or endangers children;</li>
        <li>malware, phishing pages or anything designed to harm devices or people;</li>
        <li>content you don&apos;t have the right to share, including other people&apos;s private data;</li>
        <li>harassment, threats or hate.</li>
      </ul>

      <h2>Fair use</h2>
      <p>
        The service is free because it is small. Don&apos;t use scripts or many connections to get around the size and rate
        limits, scan for other people&apos;s codes, or use it as permanent file hosting.
      </p>

      <h2>Removal and blocking</h2>
      <p>
        We may remove any share and block any user at any time, with or without notice, especially to deal with abuse
        reports or to keep the service within its limits.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, we are not liable for lost or exposed data, or for anything that happens because you
        or someone else opened a share.
      </p>
    </LegalPage>
  )
}
