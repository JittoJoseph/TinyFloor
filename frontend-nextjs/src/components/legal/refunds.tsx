import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { Mail, type LegalSection } from "./LegalPage";

export const REFUNDS_UPDATED = "28 September 2026";

export const refundsSummary = (
  <p>
    In short: cancel whenever you like and keep your plan until the end of what you paid for. If TinyFloor isn&apos;t right for you, ask
    within 14 days of a payment and you get all of it back. Payments are handled by Paddle, our reseller, and so are refunds.
  </p>
);

/** The refund policy, section by section. */
export const refundsSections: LegalSection[] = [
  {
    id: "who",
    title: "Who handles payments",
    body: (
      <p>
        Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle
        provides all customer service inquiries and handles returns. Your receipt comes from Paddle, and refunds are paid by Paddle to the card
        or account you paid with.
      </p>
    ),
  },
  {
    id: "cancelling",
    title: "Cancelling",
    body: (
      <ul>
        <li>Paid plans renew automatically, monthly or yearly, until you cancel.</li>
        <li>
          An office&apos;s admins can cancel at any time from the office&apos;s billing settings, or through the link in any Paddle receipt.
        </li>
        <li>
          Cancelling stops the next renewal. The office keeps its plan until the end of the period already paid for, then goes back to the free
          plan. Nothing is deleted.
        </li>
      </ul>
    ),
  },
  {
    id: "refunds",
    title: "Refunds",
    body: (
      <ul>
        <li>
          <strong>Within 14 days of any payment</strong>, monthly or yearly, first or renewal: ask and we refund it in full, no reasons needed.
        </li>
        <li>
          <strong>After 14 days</strong>, payments aren&apos;t refunded for the time left in the period, and the plan simply runs until the
          period ends. If something went wrong, such as a charge you didn&apos;t expect or a service that didn&apos;t work for you, write to us
          anyway and we will look at it.
        </li>
        <li>
          <strong>Changing plans</strong> in the middle of a period: Paddle charges or credits the difference for the time that is left.
        </li>
        <li>Any tax charged is refunded with the payment.</li>
      </ul>
    ),
  },
  {
    id: "asking",
    title: "How to ask",
    body: (
      <>
        <p>
          Write to <Mail /> from the email address you paid with, or reply to your Paddle receipt. You can also reach Paddle directly at{" "}
          <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">
            paddle.net
          </a>
          .
        </p>
        <p>
          Refunds usually reach you within 5 to 10 business days, depending on your bank. If you have a problem with a charge, please write to us
          before disputing it with your bank; it is almost always quicker.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <p>
        Nothing in this policy takes away rights you have as a consumer under the law where you live. These refunds are part of our{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    ),
  },
];
