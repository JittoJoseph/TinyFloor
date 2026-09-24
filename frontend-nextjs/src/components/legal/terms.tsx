import { Link } from "@/lib/i18n/navigation";
import { Mail, type LegalSection } from "./LegalPage";

export const TERMS_UPDATED = "24 September 2026";

export const termsSummary = (
  <p>
    These terms are the agreement between you and TinyFloor. In short: use TinyFloor lawfully and kindly, you keep what you create, we
    keep the service running as well as we can but can&apos;t promise it never goes down, and either of us can end things at any time.
    How we handle your data is in our <Link href="/privacy">Privacy Policy</Link>.
  </p>
);

/** The terms of service, section by section. */
export const termsSections: LegalSection[] = [
  {
    id: "agreement",
    title: "The agreement",
    body: (
      <>
        <p>
          TinyFloor (&quot;TinyFloor&quot;, &quot;we&quot;, &quot;us&quot;) is run by Jitto Joseph, an individual. These Terms of
          Service (&quot;Terms&quot;) apply when you use tinyfloor.com and the TinyFloor service, whether with an account or as a guest. By
          using TinyFloor you agree to them. If you don&apos;t agree, please don&apos;t use it.
        </p>
        <p>
          If you use TinyFloor for an organization, you agree to these Terms for it, and you confirm that you are allowed to do so.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Who can use TinyFloor",
    body: (
      <p>
        You must be at least 13 years old. If you are under 18, or under the age of majority where you live, you may use TinyFloor only with the
        permission of a parent or guardian, who agrees to these Terms for you.
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and guests",
    body: (
      <ul>
        <li>Give a real email address when you make an account, and keep your password to yourself. You are responsible for what happens on your account.</li>
        <li>If you think someone else has used your account, change your password and write to <Mail />.</li>
        <li>
          Guests choose a name and a character and don&apos;t need an account. A guest is kept for a week after their last visit; to keep
          your name and your offices, make an account.
        </li>
        <li>Don&apos;t pretend to be someone else, and don&apos;t pick a name meant to mislead people.</li>
      </ul>
    ),
  },
  {
    id: "offices",
    title: "Offices, members and guests",
    body: (
      <ul>
        <li>
          Whoever makes an office owns it. Its admins decide who is a member, can invite people and can hand out guest links. Anyone with a
          guest link can visit that office&apos;s floor until the link expires or is revoked, so share links with care.
        </li>
        <li>The owner can delete the office. Deleting it removes its members, chat, whiteboard and everything else in it, and can&apos;t be undone.</li>
        <li>
          The free plan is for up to 3 people per office. We may introduce paid plans with more; if we do, they will come with their own terms
          and prices, shown before you pay, and nothing you use for free will start costing money without your agreement.
        </li>
      </ul>
    ),
  },
  {
    id: "lobby",
    title: "The public lobby",
    body: (
      <p>
        The lobby is open to anyone. What you say and do there is seen by whoever else is there, so don&apos;t share anything private. Lobby
        chat is deleted after a week. We may remove messages or people from the lobby to keep it pleasant.
      </p>
    ),
  },
  {
    id: "rules",
    title: "Acceptable use",
    body: (
      <>
        <p>When you use TinyFloor, don&apos;t:</p>
        <ul>
          <li>break the law, or help anyone else break it;</li>
          <li>harass, threaten, bully or discriminate against anyone, or post hateful, violent or sexually explicit material;</li>
          <li>post or share anything involving the sexual exploitation of children. We report it to the authorities;</li>
          <li>share other people&apos;s personal information, or anything you don&apos;t have the right to share;</li>
          <li>record calls, or share recordings of them, without the consent the law requires from the people in them;</li>
          <li>send spam, scams, phishing or malware;</li>
          <li>
            try to break into, disrupt or overload TinyFloor, probe it for weaknesses without our permission, get around its limits, or reach
            parts of it you aren&apos;t allowed into;
          </li>
          <li>scrape it, or use bots and automated scripts on it, except as we allow;</li>
          <li>use the TinyFloor name or logo in a way that suggests something is ours, or made with us, when it isn&apos;t.</li>
        </ul>
        <p>
          Found a security problem? Please tell us at <Mail /> and give us a chance to fix it before telling anyone else.
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
          You keep ownership of what you post in TinyFloor: messages, whiteboard drawings, office names and the like (&quot;your
          content&quot;). You give us a worldwide, non-exclusive, royalty-free permission to store, copy, transmit and display your content only
          as needed to run TinyFloor for you and the people you share it with. That permission ends when your content is deleted, apart from the
          short time deleted data stays in backups.
        </p>
        <p>
          You are responsible for your content, and you confirm that you have the right to post it. We don&apos;t check what people post, but
          we may remove content, or limit access to it, if we believe it breaks these Terms or the law.
        </p>
      </>
    ),
  },
  {
    id: "calls",
    title: "Calls",
    body: (
      <p>
        A call starts when you call someone and they answer, or when you sit down at a meeting table. Calls are live only; we don&apos;t
        record them. Your microphone and camera are used only during calls, and you can turn either off at any time. Be mindful of who can
        hear you, as you would in a real office.
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
        , and nothing in these Terms limits what that licence lets you do with the code. The TinyFloor name and logo, and this service at
        tinyfloor.com, remain ours. Some of the pixel art is made by others and used under their licences, which are listed in the{" "}
        <a href="/credits.txt">credits</a>; it can&apos;t be reused outside TinyFloor except as those licences allow. If you send us ideas or
        feedback, we may use them without owing you anything.
      </p>
    ),
  },
  {
    id: "changes-service",
    title: "Changes and availability",
    body: (
      <p>
        We work to keep TinyFloor running and improving, which means features may change, be added or be removed. We can&apos;t promise that it
        will always be available, fast or free of errors, and it may be down for maintenance or for reasons outside our control. If we ever
        decide to shut TinyFloor down, we will give people with accounts reasonable notice first.
      </p>
    ),
  },
  {
    id: "ending",
    title: "Ending",
    body: (
      <>
        <p>
          You can stop using TinyFloor whenever you like, and ask us to delete your account by writing to <Mail />.
        </p>
        <p>
          We may suspend or close an account, remove someone from an office or the lobby, or block access, if someone breaks these Terms, puts
          other people or TinyFloor at risk, or if the law requires it. Where it&apos;s reasonable, we will tell you why and give you a chance to
          respond.
        </p>
        <p>The sections on your content, disclaimers, liability and the law that applies continue after these Terms end.</p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p>
        TinyFloor is provided &quot;as is&quot; and &quot;as available&quot;. To the extent the law allows, we make no warranties, express or
        implied, including that it will be fit for a particular purpose, uninterrupted, secure or error free. Some laws don&apos;t allow these
        exclusions, so parts of this section may not apply to you.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p>
          To the extent the law allows, we are not liable for any indirect, incidental, special or consequential loss, or for lost profits, data
          or goodwill, arising from your use of TinyFloor. Our total liability to you for any claim about TinyFloor is limited to the greater of
          the amount you paid us in the 12 months before the claim and 10 US dollars.
        </p>
        <p>
          Nothing in these Terms limits liability that the law does not allow to be limited, such as for fraud, or for death or personal injury
          caused by negligence, and nothing takes away rights you have as a consumer under the law where you live.
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
        reasonable costs and losses that result, to the extent the law allows.
      </p>
    ),
  },
  {
    id: "law",
    title: "The law that applies",
    body: (
      <p>
        These Terms are governed by the laws of the place where TinyFloor&apos;s operator is based, and any dispute about them or about TinyFloor
        will be decided by the courts there, except that, if you are a consumer, you may also bring proceedings in the courts where you live
        and keep the protection of that country&apos;s mandatory laws. Before going to court, please write to us, and we will try to sort it out together.
      </p>
    ),
  },
  {
    id: "general",
    title: "The rest",
    body: (
      <>
        <p>
          We may update these Terms. We will change the date at the top of this page, and tell people with accounts about significant changes
          before they take effect. Using TinyFloor after that means you accept the new Terms.
        </p>
        <p>
          If a part of these Terms can&apos;t be enforced, the rest still applies. If we don&apos;t enforce a part straight away, we haven&apos;t
          given up the right to. You can&apos;t transfer these Terms to anyone else without our agreement; we may transfer them if TinyFloor
          changes hands, and will tell you if we do. These Terms and the Privacy Policy are the whole agreement between us about TinyFloor.
        </p>
        <p>
          Questions? Write to <Mail />.
        </p>
      </>
    ),
  },
];
