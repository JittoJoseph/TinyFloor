import { Link } from "@/lib/i18n/navigation";
import { Mail, type LegalSection } from "./LegalPage";

export const PRIVACY_UPDATED = "24 September 2026";

export const privacySummary = (
  <>
    <p>
      TinyFloor keeps what it needs to run your office and nothing more. We don&apos;t sell your data, we don&apos;t show ads, and calls
      aren&apos;t recorded. Passwords and session tokens are stored only as hashes. Our website uses Google Analytics and Microsoft Clarity
      to understand how it&apos;s used. Write to <Mail /> for a copy of your data or to have it deleted.
    </p>
  </>
);

/** The privacy policy, section by section. Every claim here matches how the service is built. */
export const privacySections: LegalSection[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <>
        <p>
          TinyFloor (&quot;TinyFloor&quot;, &quot;we&quot;, &quot;us&quot;) is a virtual office you use in your browser at tinyfloor.com. It is run
          by Jitto Joseph, an individual based in India, who is the controller of the personal data described here (the &quot;data
          fiduciary&quot; under India&apos;s Digital Personal Data Protection Act, 2023).
        </p>
        <p>
          For anything about this policy or your data, write to <Mail />.
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <h3>When you make an account</h3>
        <ul>
          <li>
            <strong>With an email and password:</strong> your name, your email address and your password. The password is stored only as a
            bcrypt hash; we never see or keep the password itself.
          </li>
          <li>
            <strong>With Google:</strong> your name, your email address, whether Google has verified that address, and the ID Google gives
            your account for TinyFloor. We ask Google only for your basic profile and email. We don&apos;t receive your Google password,
            contacts, files or anything else in your Google account.
          </li>
          <li>The character you pick, which is saved on your account.</li>
        </ul>

        <h3>When you visit as a guest</h3>
        <p>The name and character you choose. Guests don&apos;t give an email address.</p>

        <h3>While you use TinyFloor</h3>
        <ul>
          <li>
            <strong>Sessions:</strong> a random token in a cookie keeps you signed in. We store only a hash of it, with when it was made, when it
            expires, when it was last used, and the first 200 characters of your browser&apos;s user agent.
          </li>
          <li>
            <strong>Offices:</strong> each office&apos;s name, its members and their roles, invitations (including the email address an
            invitation was sent to) and guest links.
          </li>
          <li>
            <strong>Chat:</strong> the messages and reactions you post, and how far you have read in each channel. Messages are visible to the
            people in that office, or in the public lobby for lobby chat.
          </li>
          <li>
            <strong>The floor:</strong> what is drawn on an office&apos;s whiteboard and the music that is playing, so they are still there when
            people come back.
          </li>
          <li>
            <strong>Activity:</strong> when your account was made and when you were last active.
          </li>
          <li>
            <strong>Country:</strong> the country your connection comes from, as reported by our hosting provider, Cloudflare. We keep the
            country only, not your IP address or a more precise location.
          </li>
          <li>
            <strong>Usage totals:</strong> for each office and each day, how many people were on the floor at most and how many minutes were
            spent there and in calls. These are counts, not a record of who was where.
          </li>
        </ul>

        <h3>Calls</h3>
        <p>
          Voice and video are sent live between the people in a call, through Cloudflare&apos;s real-time network when a direct connection
          isn&apos;t possible or for group meetings. We don&apos;t record, store or listen to calls, and neither does anything we run.
        </p>

        <h3>Security</h3>
        <p>
          To stop abuse we process your IP address briefly: to limit how many sign-ups and sign-ins can come from one address, to lock out
          repeated wrong passwords for a short time, and for Cloudflare Turnstile, which checks that sign-ups and new guests aren&apos;t bots.
          These counters clear themselves within minutes.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <>
        <ul>
          <li>To run TinyFloor: to sign you in, show you on the floor with your name and character, connect calls and keep your office&apos;s chat.</li>
          <li>To keep it safe: to prevent spam, fake accounts and attacks, and to enforce our <Link href="/terms">Terms</Link>.</li>
          <li>
            To understand and improve it: to see how many people sign up and come back, where they come from by country, and how the website
            is used.
          </li>
          <li>To reply when you write to us, and to tell you about important changes to the service or these policies.</li>
        </ul>
        <p>
          When someone walks into the public lobby, or makes a new office, a short note goes to our team&apos;s private Discord channel: the
          person&apos;s name and character, or the office&apos;s name and who made it, with the approximate city, region and country of the
          connection. It lets us see the service being used as it happens. Lobby chat and what happens inside offices are not sent.
        </p>
        <p>We don&apos;t sell personal data, we don&apos;t use it for advertising, and we don&apos;t build profiles of you for anyone else.</p>
      </>
    ),
  },
  {
    id: "bases",
    title: "Legal bases",
    body: (
      <>
        <p>Where the law asks us to name one (for example the GDPR in the EU and UK), we rely on:</p>
        <ul>
          <li>
            <strong>Contract:</strong> to provide the service you signed up for or asked to use.
          </li>
          <li>
            <strong>Legitimate interests:</strong> to keep TinyFloor secure, to understand how it&apos;s used and to improve it, in ways you
            would reasonably expect.
          </li>
          <li>
            <strong>Consent:</strong> where it is required, for example for analytics cookies in some countries. You can withdraw it at any time.
          </li>
          <li>
            <strong>Legal obligation:</strong> where the law requires us to keep or disclose something.
          </li>
        </ul>
        <p>Under India&apos;s DPDP Act, we process your personal data for the purposes above, with your consent or for legitimate uses the Act allows.</p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <>
        <p>We share personal data only with the services that help us run TinyFloor, each for its own part and bound by its own terms:</p>
        <ul>
          <li>
            <strong>Cloudflare</strong> hosts the website, the database and the real-time servers, relays calls and runs Turnstile.
          </li>
          <li>
            <strong>Google</strong> signs you in, if you choose Google, and provides Google Analytics.
          </li>
          <li>
            <strong>Microsoft</strong> provides Clarity, which shows us how people use our pages.
          </li>
          <li>
            <strong>Discord</strong> carries the team notes described above.
          </li>
        </ul>
        <p>
          Other people in TinyFloor see what the service shows them: your name, character and status in the offices you are in and in the
          public lobby, and the messages you post there. An office&apos;s members can see its member list, including email addresses of
          members and of people invited.
        </p>
        <p>
          We may disclose information if the law requires it, to protect people&apos;s safety, or to defend against legal claims. If TinyFloor
          is ever transferred to someone else, your data would go with it under this policy, and we would tell you first.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and browser storage",
    body: (
      <>
        <ul>
          <li>
            <strong>Session cookie:</strong> keeps you signed in, for 30 days with an account or 7 days as a guest. It can&apos;t be read by
            scripts on the page. TinyFloor doesn&apos;t work without it.
          </li>
          <li>
            <strong>Analytics cookies:</strong> Google Analytics and Microsoft Clarity set their own cookies to count visits and to understand
            how our pages are used. Clarity records interactions such as clicks, scrolling and mouse movement, and masks what is typed into
            fields. Inside TinyFloor itself (your offices, the lobby, chat and your account) it is set to hide everything on the screen, so
            names and messages are never recorded.
          </li>
          <li>
            <strong>Turnstile:</strong> Cloudflare may use cookies or browser signals for its bot check.
          </li>
          <li>
            <strong>Your browser:</strong> TinyFloor keeps a few preferences on your own device, such as your theme, your microphone and camera
            choices, the name and character you last used and whether you&apos;ve seen the tour. They never leave your browser.
          </li>
        </ul>
        <p>You can clear or block cookies in your browser&apos;s settings. Blocking the session cookie signs you out.</p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <>
        <ul>
          <li>
            <strong>Accounts:</strong> until you ask us to delete yours.
          </li>
          <li>
            <strong>Guests:</strong> deleted after a week without a visit.
          </li>
          <li>
            <strong>Sessions:</strong> deleted once they expire.
          </li>
          <li>
            <strong>Office chat:</strong> each channel keeps its most recent 5,000 messages. <strong>Lobby chat</strong> is deleted after a week.
          </li>
          <li>
            <strong>Offices:</strong> when an office is deleted, its members, invitations, guest links, chat, whiteboard and music are deleted
            with it.
          </li>
          <li>
            <strong>Invitations and guest links:</strong> deleted 30 days after they expire, are used or are revoked.
          </li>
          <li>
            <strong>Usage totals:</strong> kept for 13 months.
          </li>
        </ul>
        <p>Our database provider keeps point-in-time backups, so deleted data can remain in them for up to 30 days before it is gone for good.</p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>
          Depending on where you live, you may have the right to access your personal data, correct it, delete it, receive a copy of it in a
          portable form, object to or restrict how we use it, withdraw consent, and nominate someone to exercise your rights if you can&apos;t.
        </p>
        <p>
          You can change your name, character and password in your account settings at any time. For everything else, including deleting
          your account, write to <Mail /> from the address on your account. We will reply within 30 days, and may need to confirm it&apos;s
          you first.
        </p>
        <p>
          If you are unhappy with how we handle your data, please tell us first so we can put it right. You can also complain to your local
          data protection authority, or in India to the Data Protection Board of India.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "Where your data is processed",
    body: (
      <p>
        TinyFloor runs on Cloudflare&apos;s global network, so your data may be processed in countries other than your own, including the United
        States and India. Where the law requires it, these transfers rely on appropriate safeguards, such as the standard contractual clauses
        our providers offer.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        Everything travels over encrypted connections. Passwords are hashed with bcrypt, session tokens and invitation links are stored only as
        hashes, and sign-ins are rate limited. Access to the service&apos;s data is limited to the people who run it. No system is perfectly
        secure, and if a breach ever affects your data we will tell you and the authorities as the law requires.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        TinyFloor is not meant for children under 13, and we don&apos;t knowingly collect their personal data. If you are under 18, use
        TinyFloor only with the permission of a parent or guardian. If you believe a child has given us personal data, write to <Mail /> and
        we will delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we change this policy, we will update the date at the top of this page. If a change is significant, we will tell people with
        accounts by email or in TinyFloor before it takes effect.
      </p>
    ),
  },
];
