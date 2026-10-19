/** Which email domains say where someone works, for finding their team (see team.ts). */

/** Addresses anyone can get: they say nothing about where someone works. */
const PERSONAL = new Set(
  `gmail.com googlemail.com outlook.com hotmail.com live.com msn.com yahoo.com ymail.com rocketmail.com icloud.com me.com mac.com
  aol.com proton.me protonmail.com pm.me tutanota.com tuta.io gmx.com gmx.net gmx.de web.de mail.com email.com zoho.com zohomail.com
  yandex.com yandex.ru ya.ru mail.ru bk.ru inbox.ru list.ru rambler.ru qq.com foxmail.com 163.com 126.com yeah.net sina.com sohu.com
  aliyun.com naver.com daum.net hanmail.net kakao.com nate.com uol.com.br bol.com.br terra.com.br ig.com.br globo.com
  libero.it virgilio.it tiscali.it orange.fr free.fr laposte.net wanadoo.fr sfr.fr t-online.de freenet.de btinternet.com
  sky.com rediffmail.com seznam.cz wp.pl o2.pl interia.pl onet.pl hey.com fastmail.com duck.com yahoo.co.jp docomo.ne.jp
  ezweb.ne.jp softbank.ne.jp outlook.jp hotmail.co.uk hotmail.fr hotmail.it hotmail.es live.co.uk outlook.es yahoo.co.uk
  yahoo.fr yahoo.es yahoo.it yahoo.de yahoo.com.br yahoo.co.in yahoo.com.mx hotmail.com.br outlook.com.br`.split(/\s+/),
);

/** A university's domain: thousands of strangers share it, so its offices aren't open to it unless an admin says so. */
const ACADEMIC = /(^|\.)(edu|ac)(\.[a-z]{2})?$/;

/** The company domain of an address, or null for a personal or unusable one. */
export function workDomain(email: string | null | undefined): string | null {
  const domain = email?.toLowerCase().split("@")[1]?.trim();
  if (!domain || !domain.includes(".") || PERSONAL.has(domain)) return null;
  return domain;
}

/** How colleagues at the owner's domain get in: ask an admin, walk straight in, or not find the office at all. */
export type DomainAccess = "ask" | "open" | "off";
export const DOMAIN_ACCESS: readonly DomainAccess[] = ["ask", "open", "off"];

/** What an office's setting means at its owner's domain: asking by default, except at a university. */
export function domainAccess(setting: string | number | null, domain: string | null): DomainAccess {
  if (!domain) return "off";
  if (setting === "ask" || setting === "open" || setting === "off") return setting;
  return ACADEMIC.test(domain) ? "off" : "ask";
}
