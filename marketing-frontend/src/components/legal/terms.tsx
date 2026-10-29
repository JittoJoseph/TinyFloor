import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { Mail, type LegalSection } from "./LegalPage";

export const TERMS_UPDATED = "30 October 2026";

export const termsIntro = (
  <p>
    These terms are the agreement between you and TinyFloor when you use our website and app. Please read them: by using TinyFloor you
    agree to them. How we handle your information is in our <Link href="/privacy">Privacy Policy</Link>.
  </p>
);

/** The terms of service, section by section. */
export const termsSections: LegalSection[] = [
  {
    id: "agreement",
    title: "Using TinyFloor",
    body: (
      <>
        <p>
          TinyFloor is a virtual office for remote teams, operated by Jitto Joseph (“TinyFloor”, “we”, “us”).
          These Terms apply whenever you use tinyfloor.com or the TinyFloor app, with an account or as a guest.
        </p>
        <p>
          You must be at least 13 years old to use TinyFloor, and if you are under the age of majority where you live, you need the permission
          of a parent or guardian. If you use TinyFloor for an organization, you agree to these Terms on its behalf and confirm that you are
          allowed to.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <>
        <p>
          Use a real email address that only you can read: anyone who can read it can sign in as you. You are responsible for what happens on
          your account, so if you think someone else has used it, secure your email and write to <Mail />. Don&apos;t pretend to be someone
          else.
        </p>
        <p>
          In the demo office you can visit as a guest without an account. Guests are removed after a week without a visit; to keep your name
          and join offices, make an account.
        </p>
      </>
    ),
  },
  {
    id: "offices",
    title: "Offices and members",
    body: (
      <p>
        Whoever makes an office owns it and decides, with its admins, who belongs to it. Anyone with an office&apos;s invite link can join it
        while there is room, so share the link with care; an admin can reset it at any time. The owner can delete the office, which deletes
        everything in it and can&apos;t be undone.
      </p>
    ),
  },
  {
    id: "billing",
    title: "Plans, billing and cancellation",
    body: (
      <>
        <p>
          <strong>Our reseller.</strong> Paid plans are sold by Creem (Armitage Labs OÜ), our merchant of record, which takes payments, charges
          any tax and handles refunds. When you buy a plan you also agree to Creem&apos;s{" "}
          <a href="https://www.creem.io/buyer-terms" target="_blank" rel="noopener noreferrer">
            Buyer Terms
          </a>
          .
        </p>
        <p>
          <strong>Plans and trial.</strong> Each office has a plan that sets how many people it can hold. Plans and prices are on our{" "}
          <Link href="/pricing">pricing page</Link> and are shown again before you pay. New offices start with a 14-day trial of Pro, with no
          card needed, and move to the free plan when it ends unless a plan is chosen.
        </p>
        <p>
          <strong>Renewal and cancellation.</strong> Plans are billed monthly in advance and renew automatically until you cancel. An office&apos;s
          admins can cancel at any time; the plan then runs until the end of the period already paid for, and the office moves to the free plan.
          Nothing is deleted.
        </p>
        <p>
          <strong>Refunds.</strong> Ask within 14 days of any payment and we refund it in full. The details are in our{" "}
          <Link href="/refunds">Refund Policy</Link>.
        </p>
        <p>
          <strong>Price changes.</strong> We will tell an office&apos;s admins at least 30 days before a new price applies, so there is time to
          cancel. Offices that subscribe to Pro before 1 March 2027 keep their price for as long as their subscription continues without a
          break.
        </p>
        <p>
          <strong>Fair use.</strong> Calls and meetings aren&apos;t metered, but an office whose meetings run far beyond a normal working month
          (more than 80 hours on Pro, or 40 on Free) continues with voice only in meetings until the next month. Calls between two people are
          never limited.
        </p>
      </>
    ),
  },
  {
    id: "rules",
    title: "Acceptable use",
    body: (
      <>
        <p>When you use TinyFloor, don&apos;t:</p>
        <ul>
          <li>break the law, or help anyone else to;</li>
          <li>harass, threaten or abuse anyone, or post hateful, violent or sexually explicit material;</li>
          <li>post anything that exploits children. We report it to the authorities;</li>
          <li>share other people&apos;s personal information, or content you don&apos;t have the right to share;</li>
          <li>record calls without the consent the law requires from the people in them;</li>
          <li>send spam, scams or malware;</li>
          <li>try to break into, disrupt or overload TinyFloor, get around its limits, or access what you aren&apos;t allowed to;</li>
          <li>scrape TinyFloor or use bots on it, except as we allow.</li>
        </ul>
        <p>
          If you find a security problem, please tell us at <Mail /> and give us a chance to fix it before telling anyone else.
        </p>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content",
    body: (
      <>
        <p>
          You own what you post in TinyFloor: your messages, voice messages, files, drawings and the like. You give us permission to store,
          copy and show your content only as needed to run TinyFloor for you and the people you share it with. That permission ends when your
          content is deleted.
        </p>
        <p>
          You are responsible for what you post, and you confirm that you have the right to post it. We don&apos;t review what people post, but
          we may remove content that we believe breaks these Terms or the law.
        </p>
      </>
    ),
  },
  {
    id: "lobby",
    title: "The demo office",
    body: (
      <p>
        The demo office is a public place to try TinyFloor, and anyone can walk in. What you say and post there can be seen by whoever is
        there, so don&apos;t share anything private. We may remove messages or people from it to keep it pleasant.
      </p>
    ),
  },
  {
    id: "ours",
    title: "Our service and brand",
    body: (
      <p>
        TinyFloor&apos;s source code is published under the{" "}
        <a href="https://github.com/JittoJoseph/TinyFloor" target="_blank" rel="noopener noreferrer">
          GNU Affero General Public License v3.0
        </a>
        , and nothing in these Terms limits what that licence lets you do with the code. The TinyFloor name, logo and service remain ours, and
        some of the artwork is licensed from others, as listed in our <a href="/credits.txt">credits</a>. If you send us feedback or ideas, we
        may use them freely.
      </p>
    ),
  },
  {
    id: "third-parties",
    title: "Other services",
    body: (
      <p>
        Some parts of TinyFloor rely on other companies&apos; services, such as signing in with Google, playing music from Spotify, and paying
        through Creem. When you use them, their own terms apply, and we aren&apos;t responsible for them.
      </p>
    ),
  },
  {
    id: "changes-service",
    title: "Changes to the service",
    body: (
      <p>
        We keep improving TinyFloor, so features may change, be added or be removed. We work to keep it available, but we can&apos;t promise it
        will never be down or free of errors. If we ever decide to shut TinyFloor down, we will give people with accounts reasonable notice and
        a chance to get their data.
      </p>
    ),
  },
  {
    id: "ending",
    title: "Suspension and termination",
    body: (
      <p>
        You can stop using TinyFloor at any time, and ask us to delete your account by writing to <Mail />. We may suspend or close an account,
        or remove someone from an office or the demo office, if they break these Terms, put others or TinyFloor at risk, or if the law requires
        it. Where it&apos;s reasonable, we will tell you why first and give you a chance to respond.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p>
        TinyFloor is provided “as is” and “as available”. To the extent the law allows, we make no promises beyond those in
        these Terms, including that TinyFloor will suit a particular purpose or be uninterrupted, secure or free of errors.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p>
          To the extent the law allows, we aren&apos;t liable for indirect or consequential losses, or for lost profits, data or goodwill.
          Our total liability for any claim about TinyFloor is limited to the greater of what you paid us in the 12 months before the claim
          and 10 US dollars.
        </p>
        <p>
          Nothing in these Terms limits liability that the law doesn&apos;t allow to be limited, or takes away your rights as a consumer where
          you live.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <p>
        If someone brings a claim against us because of your content or because you broke these Terms or the law, you agree to cover the
        reasonable costs that result, to the extent the law allows.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law and disputes",
    body: (
      <p>
        These Terms are governed by the laws of the place where TinyFloor&apos;s operator is based, and disputes will be decided by its courts.
        If you are a consumer, you may also bring proceedings where you live, and you keep the protection of its mandatory laws. Before going to
        court, please write to us so we can try to resolve it together.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <p>
        We may update these Terms. We will change the date at the top of this page and tell people with accounts about significant changes
        before they take effect. If you keep using TinyFloor after that, the new Terms apply.
      </p>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <p>
        These Terms, with our Privacy Policy and Refund Policy, are the whole agreement between us about TinyFloor. If a part of them can&apos;t
        be enforced, the rest still applies, and if we don&apos;t enforce a part straight away, we haven&apos;t given up the right to. You
        can&apos;t transfer these Terms without our agreement; we may transfer them if TinyFloor changes hands, and will tell you if we do.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        Questions about these Terms? Write to <Mail />.
      </p>
    ),
  },
];
