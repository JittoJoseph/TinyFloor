import type { Locale } from "@/lib/i18n/routing";
import { OUT_OF_OFFICE_PATH, STANDUP_PATH, TWO_TRUTHS_PATH, WOULD_YOU_RATHER_PATH } from "@/lib/tools/catalog";

/**
 * The free tools' index (/tools), in every language: its own words, and the
 * short names of the tools written only in some languages (the others are
 * named by the footer's words, home.footer).
 */
export interface ToolsHubCopy {
  label: string;
  title: string;
  body: string;
  meta: { title: string; description: string };
}

export const TOOLS_HUB: Record<Locale, ToolsHubCopy> = {
  en: {
    label: "Free tools",
    title: "Free tools for <em>remote teams.</em>",
    body: "Small things that make a remote team's day easier: a standup agenda, questions for the start of a meeting, a time that works across time zones. Free, no sign-up, and they run in your browser.",
    meta: { title: "Free Tools for Remote Teams", description: "Free tools for remote team leads: a daily standup template, icebreaker and would you rather questions, a time zone meeting planner, an out of office message generator and more." },
  },
  pt: {
    label: "Ferramentas grátis",
    title: "Ferramentas grátis para <em>equipes remotas.</em>",
    body: "Pequenas coisas que facilitam o dia de uma equipe remota: a pauta da daily, perguntas para começar a reunião, um horário que funciona em fusos diferentes. Grátis, sem cadastro, e funcionam no seu navegador.",
    meta: { title: "Ferramentas Grátis para Equipes Remotas", description: "Ferramentas grátis para quem lidera equipes remotas: modelo de daily, perguntas quebra-gelo e \"você prefere\", planejador de fusos horários, gerador de mensagem de ausência e mais." },
  },
  es: {
    label: "Herramientas gratis",
    title: "Herramientas gratis para <em>equipos remotos.</em>",
    body: "Pequeñas cosas que facilitan el día a un equipo remoto: la agenda de la daily, preguntas para empezar una reunión, una hora que sirve en distintas zonas horarias. Gratis, sin registro, y funcionan en tu navegador.",
    meta: { title: "Herramientas Gratis para Equipos Remotos", description: "Herramientas gratis para quien lidera equipos remotos: plantilla de daily, preguntas rompehielos y \"¿qué prefieres?\", planificador de zonas horarias, generador de mensajes de fuera de la oficina y más." },
  },
  de: {
    label: "Kostenlose Tools",
    title: "Kostenlose Tools für <em>Remote-Teams.</em>",
    body: "Kleine Helfer für den Alltag eines Remote-Teams: Fragen für den Start eines Meetings, eine Uhrzeit, die über Zeitzonen hinweg passt, und was ein virtuelles Büro kostet. Kostenlos, ohne Anmeldung, direkt im Browser.",
    meta: { title: "Kostenlose Tools für Remote-Teams", description: "Kostenlose Tools für Leitende von Remote-Teams: Eisbrecher-Fragen, ein Zeitzonen-Meetingplaner und ein Kostenrechner für virtuelle Büros." },
  },
  fr: {
    label: "Outils gratuits",
    title: "Des outils gratuits pour <em>les équipes à distance.</em>",
    body: "De petits outils qui simplifient le quotidien d'une équipe à distance : des questions pour lancer une réunion, un horaire qui convient à tous les fuseaux, le coût d'un bureau virtuel. Gratuits, sans inscription, dans votre navigateur.",
    meta: { title: "Outils gratuits pour les équipes à distance", description: "Des outils gratuits pour les responsables d'équipes à distance : questions brise-glace, planificateur de réunions par fuseau horaire et calculateur du coût d'un bureau virtuel." },
  },
  it: {
    label: "Strumenti gratuiti",
    title: "Strumenti gratuiti per <em>team da remoto.</em>",
    body: "Piccoli strumenti che semplificano la giornata di un team da remoto: domande per iniziare una riunione, un orario che va bene in fusi diversi, quanto costa un ufficio virtuale. Gratuiti, senza registrazione, nel tuo browser.",
    meta: { title: "Strumenti gratuiti per team da remoto", description: "Strumenti gratuiti per chi guida team da remoto: domande rompighiaccio, pianificatore di riunioni tra fusi orari e calcolatore del costo di un ufficio virtuale." },
  },
  nl: {
    label: "Gratis tools",
    title: "Gratis tools voor <em>remote teams.</em>",
    body: "Kleine hulpmiddelen die de dag van een remote team makkelijker maken: vragen om een meeting mee te beginnen, een tijd die over tijdzones heen werkt, wat een virtueel kantoor kost. Gratis, zonder account, in je browser.",
    meta: { title: "Gratis tools voor remote teams", description: "Gratis tools voor wie een remote team leidt: ijsbrekervragen, een tijdzone-meetingplanner en een kostencalculator voor virtuele kantoren." },
  },
  pl: {
    label: "Darmowe narzędzia",
    title: "Darmowe narzędzia dla <em>zespołów zdalnych.</em>",
    body: "Drobne narzędzia, które ułatwiają dzień zespołu zdalnego: pytania na początek spotkania, godzina pasująca w różnych strefach czasowych, koszt wirtualnego biura. Za darmo, bez rejestracji, w przeglądarce.",
    meta: { title: "Darmowe narzędzia dla zespołów zdalnych", description: "Darmowe narzędzia dla liderów zespołów zdalnych: pytania na przełamanie lodów, planer spotkań w strefach czasowych i kalkulator kosztów wirtualnego biura." },
  },
  sv: {
    label: "Gratis verktyg",
    title: "Gratis verktyg för <em>distansteam.</em>",
    body: "Små verktyg som gör ett distansteams dag enklare: frågor att börja ett möte med, en tid som funkar över tidszoner, vad ett virtuellt kontor kostar. Gratis, utan konto, direkt i webbläsaren.",
    meta: { title: "Gratis verktyg för distansteam", description: "Gratis verktyg för dig som leder ett distansteam: isbrytarfrågor, en mötesplanerare för tidszoner och en kostnadskalkylator för virtuella kontor." },
  },
  da: {
    label: "Gratis værktøjer",
    title: "Gratis værktøjer til <em>fjernteams.</em>",
    body: "Små værktøjer, der gør et fjernteams dag lettere: spørgsmål til at starte et møde, et tidspunkt der passer på tværs af tidszoner, hvad et virtuelt kontor koster. Gratis, uden login, i din browser.",
    meta: { title: "Gratis værktøjer til fjernteams", description: "Gratis værktøjer til dig, der leder et fjernteam: isbryderspørgsmål, en mødeplanlægger på tværs af tidszoner og en prisberegner for virtuelle kontorer." },
  },
  no: {
    label: "Gratis verktøy",
    title: "Gratis verktøy for <em>fjernteam.</em>",
    body: "Små verktøy som gjør dagen enklere for et fjernteam: spørsmål å starte et møte med, et tidspunkt som passer på tvers av tidssoner, hva et virtuelt kontor koster. Gratis, uten konto, i nettleseren.",
    meta: { title: "Gratis verktøy for fjernteam", description: "Gratis verktøy for deg som leder et fjernteam: isbryterspørsmål, en møteplanlegger på tvers av tidssoner og en priskalkulator for virtuelle kontorer." },
  },
  fi: {
    label: "Ilmaiset työkalut",
    title: "Ilmaisia työkaluja <em>etätiimeille.</em>",
    body: "Pieniä työkaluja, jotka helpottavat etätiimin päivää: kysymyksiä palaverin aluksi, aika joka sopii eri aikavyöhykkeille ja mitä virtuaalitoimisto maksaa. Ilmaisia, ilman rekisteröitymistä, selaimessa.",
    meta: { title: "Ilmaiset työkalut etätiimeille", description: "Ilmaisia työkaluja etätiimien vetäjille: jäänmurtajakysymyksiä, aikavyöhykkeiden palaverisuunnittelija ja virtuaalitoimiston hintalaskuri." },
  },
  ru: {
    label: "Бесплатные инструменты",
    title: "Бесплатные инструменты для <em>удалённых команд.</em>",
    body: "Небольшие инструменты, которые упрощают день удалённой команды: вопросы для начала встречи, время, удобное в разных часовых поясах, стоимость виртуального офиса. Бесплатно, без регистрации, прямо в браузере.",
    meta: { title: "Бесплатные инструменты для удалённых команд", description: "Бесплатные инструменты для руководителей удалённых команд: вопросы для знакомства, планировщик встреч по часовым поясам и калькулятор стоимости виртуального офиса." },
  },
  ja: {
    label: "無料ツール",
    title: "リモートチームのための<em>無料ツール。</em>",
    body: "リモートチームの毎日を少し楽にする小さなツールです。会議の始めのアイスブレイク、タイムゾーンをまたいで合う時間、バーチャルオフィスの費用。無料、登録不要で、ブラウザで動きます。",
    meta: { title: "リモートチームのための無料ツール", description: "リモートチームのリーダー向けの無料ツール。アイスブレイクの質問、タイムゾーン会議プランナー、バーチャルオフィスの費用計算。" },
  },
  ko: {
    label: "무료 도구",
    title: "원격 팀을 위한 <em>무료 도구.</em>",
    body: "원격 팀의 하루를 조금 편하게 해 주는 작은 도구들입니다. 회의를 시작할 때 쓸 질문, 시간대가 달라도 맞는 시간, 가상 오피스 비용까지. 무료이고, 가입 없이 브라우저에서 바로 쓸 수 있어요.",
    meta: { title: "원격 팀을 위한 무료 도구", description: "원격 팀 리더를 위한 무료 도구: 아이스브레이킹 질문, 시간대별 회의 플래너, 가상 오피스 비용 계산기." },
  },
  zh: {
    label: "免费工具",
    title: "为远程团队准备的<em>免费工具。</em>",
    body: "让远程团队的日常更轻松的小工具：会议开场的破冰问题、跨时区都合适的时间、虚拟办公室的费用。免费、无需注册，在浏览器中即可使用。",
    meta: { title: "远程团队免费工具", description: "为远程团队负责人准备的免费工具：破冰问题、跨时区会议规划器和虚拟办公室费用计算器。" },
  },
  he: {
    label: "כלים חינמיים",
    title: "כלים חינמיים <em>לצוותים מרוחקים.</em>",
    body: "כלים קטנים שמקלים על היום של צוות מרוחק: שאלות לפתיחת פגישה, שעה שמתאימה לכמה אזורי זמן, וכמה עולה משרד וירטואלי. בחינם, בלי הרשמה, ישר בדפדפן.",
    meta: { title: "כלים חינמיים לצוותים מרוחקים", description: "כלים חינמיים למנהלי צוותים מרוחקים: שאלות שוברות קרח, מתכנן פגישות לפי אזורי זמן ומחשבון עלות למשרד וירטואלי." },
  },
  ar: {
    label: "أدوات مجانية",
    title: "أدوات مجانية <em>للفرق عن بُعد.</em>",
    body: "أدوات صغيرة تسهّل يوم الفريق الذي يعمل عن بُعد: أسئلة لبدء الاجتماع، ووقت يناسب مناطق زمنية مختلفة، وتكلفة المكتب الافتراضي. مجانية، بلا تسجيل، وتعمل في المتصفح.",
    meta: { title: "أدوات مجانية للفرق عن بُعد", description: "أدوات مجانية لقادة الفرق عن بُعد: أسئلة لكسر الجليد، ومخطط اجتماعات عبر المناطق الزمنية، وحاسبة تكلفة المكتب الافتراضي." },
  },
};

/** Short names for the tools written in only some languages. */
export const FEW_TOOL_NAMES: Partial<Record<Locale, Record<string, string>>> = {
  en: {
    [STANDUP_PATH]: "Daily standup template",
    [WOULD_YOU_RATHER_PATH]: "Would you rather questions for work",
    [TWO_TRUTHS_PATH]: "Two truths and a lie ideas",
    [OUT_OF_OFFICE_PATH]: "Out of office message generator",
  },
  pt: {
    [STANDUP_PATH]: "Modelo de daily",
    [WOULD_YOU_RATHER_PATH]: "Perguntas \"você prefere\" para o trabalho",
    [TWO_TRUTHS_PATH]: "Ideias de duas verdades e uma mentira",
    [OUT_OF_OFFICE_PATH]: "Gerador de mensagem de ausência",
  },
  es: {
    [STANDUP_PATH]: "Plantilla de daily",
    [WOULD_YOU_RATHER_PATH]: "Preguntas de \"¿qué prefieres?\" para el trabajo",
    [TWO_TRUTHS_PATH]: "Ideas de dos verdades y una mentira",
    [OUT_OF_OFFICE_PATH]: "Generador de mensaje de fuera de la oficina",
  },
};
