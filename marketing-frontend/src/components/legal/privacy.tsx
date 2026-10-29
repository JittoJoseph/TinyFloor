import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { Mail, type LegalSection } from "./LegalPage";

export const PRIVACY_UPDATED = "30 October 2026";

export const privacyIntro = (
  <p>
    This policy explains what information TinyFloor collects, why we collect it, and the choices you have. We collect only what we need to
    run the service, we don&apos;t sell it, and we don&apos;t show ads.
  </p>
);

/** The privacy policy, section by section. Every claim here matches how the service is built. */
export const privacySections: LegalSection[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <p>
        TinyFloor is a virtual office for remote teams that you use in your browser, operated by Jitto Joseph (“TinyFloor”,
        “we”, “us”), who is responsible for the personal information described here. This policy applies to our website
        at tinyfloor.com and to the TinyFloor app. It does not cover other services we link to, each of which has its own policy.
      </p>
    ),
  },
  {
    id: "collect",
    title: "Information we collect",
    body: (
      <>
        <p>
          <strong>Account information.</strong> When you make an account, we receive your name and email address. If you sign in with Google,
          Google shares only your name and email address; we never see your Google password or anything else in your Google account. We also keep the character you choose for the floor.
        </p>
        <p>
          <strong>Guests.</strong> In the demo office you can walk in as a guest with just a name and a character, without an email address.
        </p>
        <p>
          <strong>What you share in TinyFloor.</strong> The messages, voice messages, reactions and files you post, what you draw on a
          whiteboard, your status and note, the offices you make or join, and the people you invite. If you show what you&apos;re listening to,
          we keep the track&apos;s name, artist and cover so your teammates can see it.
        </p>
        <p>
          <strong>Billing information.</strong> Paid plans are sold by our reseller, Creem, which takes the payment. We receive the name, email
          address and country of whoever pays and the details of the plan. We never see card or bank details.
        </p>
        <p>
          <strong>Information you provide.</strong> If you write to us for help or with feedback, we receive what you choose to share, such as
          your name, your email address and your message.
        </p>
        <p>
          <strong>Information collected automatically.</strong> When you use our website or app, we collect standard technical information such
          as your browser and device type, the pages and features you use, your time zone, the country you connect from, and diagnostic logs.
          This helps us keep TinyFloor secure and working well.
        </p>
      </>
    ),
  },
  {
    id: "calls",
    title: "Calls and meetings",
    body: (
      <p>
        Voice, video and screen sharing are sent live between the people in a call. We don&apos;t record, store or listen to calls. Your
        microphone and camera are used only while you are in a call, and you can turn either off at any time. We count how long an office
        spends in meetings, to apply its plan, but not what was said.
      </p>
    ),
  },
  {
    id: "use",
    title: "How we use information",
    body: (
      <>
        <p>We use the information we collect to:</p>
        <ul>
          <li>run TinyFloor: sign you in, show you on the floor, connect your calls, and keep your office&apos;s chat and whiteboard;</li>
          <li>keep it safe: prevent spam, abuse and attacks, and enforce our <Link href="/terms">Terms</Link>;</li>
          <li>understand how TinyFloor is used, so we can fix problems and make it better;</li>
          <li>send the emails the service needs, such as sign-in codes, and tell you about important changes;</li>
          <li>reply when you write to us, and meet our legal obligations.</li>
        </ul>
        <p>We don&apos;t sell personal information, use it for advertising, or use your messages or calls to train AI models.</p>
      </>
    ),
  },
  {
    id: "bases",
    title: "Legal bases for processing",
    body: (
      <p>
        If you are in the European Economic Area or the United Kingdom, we process personal information where we have a legal basis to do so:
        to provide the service you asked for (contract), to keep TinyFloor secure and to understand and improve it (legitimate interests), to
        comply with the law (legal obligation), and with your consent where it is required, which you can withdraw at any time.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "How we share information",
    body: (
      <>
        <p>
          <strong>With the people you work with.</strong> The people in your offices see your name, character, status and what you post there.
          An office&apos;s members can see who else belongs to it. In the demo office, anyone there can see your name and what you post.
        </p>
        <p>
          <strong>With companies that help us run TinyFloor.</strong> We use a small number of service providers for hosting, email, analytics
          and payments. They process information only to provide their service to us, under their own terms and privacy commitments.
        </p>
        <p>
          <strong>For legal reasons.</strong> We may disclose information if the law requires it, to protect someone&apos;s safety, or to
          defend against legal claims.
        </p>
        <p>
          <strong>If TinyFloor changes hands.</strong> If TinyFloor is ever transferred to someone else, your information would go with it,
          still protected by this policy, and we would tell you first.
        </p>
      </>
    ),
  },
  {
    id: "providers",
    title: "Other companies we use",
    body: (
      <ul>
        <li>
          <strong>Cloudflare</strong> hosts the website, the app and its data, carries calls, and checks that sign-ins come from people, not
          bots.
        </li>
        <li>
          <strong>Google</strong> signs you in if you choose Google, and provides Google Analytics.
        </li>
        <li>
          <strong>PostHog</strong> helps us understand how TinyFloor is used and spot errors. Inside the app it never records names, messages
          or anything you type.
        </li>
        <li>
          <strong>Resend</strong> delivers our emails, such as sign-in codes.
        </li>
        <li>
          <strong>Creem</strong> sells our paid plans as the merchant of record, under its own{" "}
          <a href="https://www.creem.io/privacy" target="_blank" rel="noopener noreferrer">
            privacy notice
          </a>
          .
        </li>
        <li>
          <strong>Spotify</strong> plays music you choose to share, under its own{" "}
          <a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer">
            privacy policy
          </a>
          .
        </li>
        <li>
          <strong>Discord</strong> carries short internal notes to our team when a new office is made or someone visits the demo office.
        </li>
      </ul>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and analytics",
    body: (
      <>
        <p>
          We use one essential cookie to keep you signed in; TinyFloor doesn&apos;t work without it. Google Analytics and PostHog use cookies
          or browser storage to count visits and understand how the site is used. TinyFloor also keeps a few preferences on your own device,
          such as your theme and your microphone and camera choices.
        </p>
        <p>You can clear or block cookies in your browser&apos;s settings. Blocking the sign-in cookie signs you out.</p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Data retention",
    body: (
      <>
        <p>
          We keep your account and what you share in TinyFloor for as long as your account exists. When an office is deleted, its chat,
          whiteboard and members are deleted with it. Guests, and the demo office&apos;s chat, are deleted after a week. Billing records are
          kept for as long as tax and accounting law requires.
        </p>
        <p>Deleted information can remain in our backups for up to 30 days before it is gone for good.</p>
      </>
    ),
  },
  {
    id: "security",
    title: "Data security",
    body: (
      <p>
        Everything travels over encrypted connections. There are no passwords to leak: you sign in with Google or a one-time code we email
        you. Access to our systems is limited to the people who run TinyFloor. No system is perfectly secure, but if a breach ever affects
        your information, we will tell you and the authorities as the law requires.
      </p>
    ),
  },
  {
    id: "transfers",
    title: "International data transfers",
    body: (
      <p>
        TinyFloor and the companies we use operate around the world, so your information may be processed in countries other than your own,
        including the United States. Where the law requires it, these transfers are protected by safeguards such as standard contractual
        clauses.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your rights and choices",
    body: (
      <>
        <p>
          Depending on where you live, you may have the right to access the personal information we hold about you, correct it, delete it,
          receive a copy of it, or object to or restrict how we use it.
        </p>
        <p>
          You can change your name and character in TinyFloor at any time. For anything else, including deleting your account, write to{" "}
          <Mail /> from the email address on your account. We reply within 30 days. If you are unhappy with how we handle your information,
          please tell us first so we can put it right; you can also complain to your local data protection authority.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children’s privacy",
    body: (
      <p>
        TinyFloor is not meant for children under 13, and we don&apos;t knowingly collect their personal information. If you believe a child
        has given us personal information, write to <Mail /> and we will delete it.
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
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        Questions about this policy or your information? Write to <Mail />.
      </p>
    ),
  },
];
