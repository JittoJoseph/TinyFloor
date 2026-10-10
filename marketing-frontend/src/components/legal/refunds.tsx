import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { Mail, type LegalSection } from "./LegalPage";

export const REFUNDS_UPDATED = "10 October 2026";

export const refundsSummary = (
  <p>
    In short: cancel whenever you like and keep your plan until the end of what you paid for. If TinyFloor isn&apos;t right for you, ask
    within 14 days of a payment and you get all of it back. Payments are handled by Creem, our reseller, and so are refunds.
  </p>
);

/** The refund policy, section by section. */
export const refundsSections: LegalSection[] = [
  {
    id: "who",
    title: "Who handles payments",
    body: (
      <p>
        Payments are processed by Creem (Armitage Labs OÜ) as the merchant of record for all our orders. Creem sells the plan to you, charges
        any tax, and sends the receipt and invoice. Refunds are paid by Creem to the card or account you paid with.
      </p>
    ),
  },
  {
    id: "cancelling",
    title: "Cancelling",
    body: (
      <ul>
        <li>Paid plans renew automatically every month until you cancel.</li>
        <li>
          An office&apos;s admins can cancel at any time from the office&apos;s billing settings. Whoever paid can also cancel from
          Creem&apos;s customer portal, linked from every receipt.
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
          <strong>Within 14 days of any payment</strong>, first or renewal: ask and we refund it in full, no reasons needed.
        </li>
        <li>
          <strong>After 14 days</strong>, payments aren&apos;t refunded for the time left in the period, and the plan simply runs until the
          period ends. If something went wrong, such as a charge you didn&apos;t expect or a service that didn&apos;t work for you, write to us
          anyway and we will look at it.
        </li>
        <li>
          <strong>Changing plans</strong> in the middle of a period: Creem charges or credits the difference for the time that is left.
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
          Write to <Mail /> from the email address you paid with. If we can&apos;t sort it out, you can also reach Creem through its
          customer portal or at{" "}
          <a href="mailto:support@creem.io">support@creem.io</a>.
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
