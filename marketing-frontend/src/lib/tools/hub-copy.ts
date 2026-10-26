import type { Locale } from "@/lib/i18n/routing";
import { OUT_OF_OFFICE_PATH, SECRET_SANTA_PATH, STANDUP_PATH, TEAM_BUILDING_PATH, TWO_TRUTHS_PATH, WOULD_YOU_RATHER_PATH } from "@/lib/tools/catalog";

/**
 * The free tools' index (/tools), in every language: its own words, and the
 * short names of the newer tools (the first three are named by the footer's
 * words, home.footer).
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
    body: "Kleine Helfer für den Alltag eines Remote-Teams: eine Agenda fürs Daily Standup, Fragen für den Start eines Meetings, eine Uhrzeit, die über Zeitzonen hinweg passt. Kostenlos, ohne Anmeldung, direkt im Browser.",
    meta: { title: "Kostenlose Tools für Remote-Teams", description: "Kostenlose Tools für Leitende von Remote-Teams: Daily-Standup-Vorlage, Icebreaker- und „Würdest du eher“-Fragen, Zeitzonen-Meetingplaner, Abwesenheitsnotiz-Generator und mehr." },
  },
  fr: {
    label: "Outils gratuits",
    title: "Des outils gratuits pour <em>les équipes à distance.</em>",
    body: "De petits outils qui simplifient le quotidien d'une équipe à distance : l'ordre du jour du daily, des questions pour lancer une réunion, un horaire qui convient à tous les fuseaux. Gratuits, sans inscription, dans votre navigateur.",
    meta: { title: "Outils gratuits pour les équipes à distance", description: "Des outils gratuits pour les responsables d'équipes à distance : modèle de daily meeting, questions brise-glace et « Tu préfères », planificateur de fuseaux horaires, message d'absence et plus." },
  },
  it: {
    label: "Strumenti gratuiti",
    title: "Strumenti gratuiti per <em>team da remoto.</em>",
    body: "Piccoli strumenti che semplificano la giornata di un team da remoto: l'agenda dello standup, domande per iniziare una riunione, un orario che va bene in fusi diversi. Gratuiti, senza registrazione, nel tuo browser.",
    meta: { title: "Strumenti gratuiti per team da remoto", description: "Strumenti gratuiti per chi guida team da remoto: template per il daily standup, domande rompighiaccio e \"Preferiresti\", pianificatore di fusi orari, messaggi fuori sede e altro." },
  },
  nl: {
    label: "Gratis tools",
    title: "Gratis tools voor <em>remote teams.</em>",
    body: "Kleine hulpmiddelen die de dag van een remote team makkelijker maken: een standup-agenda, vragen om een meeting mee te beginnen, een tijd die over tijdzones heen werkt. Gratis, zonder account, in je browser.",
    meta: { title: "Gratis tools voor remote teams", description: "Gratis tools voor wie een remote team leidt: daily standup template, ijsbreker- en zou je liever-vragen, tijdzone-meetingplanner, afwezigheidsbericht generator en meer." },
  },
  pl: {
    label: "Darmowe narzędzia",
    title: "Darmowe narzędzia dla <em>zespołów zdalnych.</em>",
    body: "Drobne narzędzia, które ułatwiają dzień zespołu zdalnego: agenda daily, pytania na początek spotkania, godzina pasująca w różnych strefach czasowych. Za darmo, bez rejestracji, w przeglądarce.",
    meta: { title: "Darmowe narzędzia dla zespołów zdalnych", description: "Darmowe narzędzia dla liderów zespołów zdalnych: szablon daily stand-upu, pytania na przełamanie lodów i „Co wolisz?”, planer stref czasowych, wiadomość o nieobecności i więcej." },
  },
  sv: {
    label: "Gratis verktyg",
    title: "Gratis verktyg för <em>distansteam.</em>",
    body: "Små verktyg som gör ett distansteams dag enklare: en agenda för standupen, frågor att börja ett möte med, en tid som funkar över tidszoner. Gratis, utan konto, direkt i webbläsaren.",
    meta: { title: "Gratis verktyg för distansteam", description: "Gratis verktyg för dig som leder ett distansteam: mall för daily standup, isbrytar- och skulle du hellre-frågor, mötesplanerare för tidszoner, frånvaromeddelanden och mer." },
  },
  da: {
    label: "Gratis værktøjer",
    title: "Gratis værktøjer til <em>fjernteams.</em>",
    body: "Små værktøjer, der gør et fjernteams dag lettere: en dagsorden til standuppen, spørgsmål til at starte et møde, et tidspunkt der passer på tværs af tidszoner. Gratis, uden login, i din browser.",
    meta: { title: "Gratis værktøjer til fjernteams", description: "Gratis værktøjer til dig, der leder et fjernteam: skabelon til daily standup, isbryder- og vil du hellere-spørgsmål, mødeplanlægger på tværs af tidszoner, fraværsbeskeder og mere." },
  },
  no: {
    label: "Gratis verktøy",
    title: "Gratis verktøy for <em>fjernteam.</em>",
    body: "Små verktøy som gjør dagen enklere for et fjernteam: en agenda for standupen, spørsmål å starte et møte med, et tidspunkt som passer på tvers av tidssoner. Gratis, uten konto, i nettleseren.",
    meta: { title: "Gratis verktøy for fjernteam", description: "Gratis verktøy for deg som leder et fjernteam: mal for daily standup, isbryter- og vil du heller-spørsmål, møteplanlegger på tvers av tidssoner, fraværsmeldinger og mer." },
  },
  fi: {
    label: "Ilmaiset työkalut",
    title: "Ilmaisia työkaluja <em>etätiimeille.</em>",
    body: "Pieniä työkaluja, jotka helpottavat etätiimin päivää: dailyn asialista, kysymyksiä palaverin aluksi ja aika, joka sopii eri aikavyöhykkeille. Ilmaisia, ilman rekisteröitymistä, selaimessa.",
    meta: { title: "Ilmaiset työkalut etätiimeille", description: "Ilmaisia työkaluja etätiimien vetäjille: daily-palaverin pohja, jäänmurtaja- ja kumpi mieluummin -kysymyksiä, aikavyöhykkeiden palaverisuunnittelija, poissaoloviestit ja muuta." },
  },
  ru: {
    label: "Бесплатные инструменты",
    title: "Бесплатные инструменты для <em>удалённых команд.</em>",
    body: "Небольшие инструменты, которые упрощают день удалённой команды: повестка стендапа, вопросы для начала встречи, время, удобное в разных часовых поясах. Бесплатно, без регистрации, прямо в браузере.",
    meta: { title: "Бесплатные инструменты для удалённых команд", description: "Бесплатные инструменты для руководителей удалённых команд: шаблон стендапа, вопросы для знакомства и «Что бы вы выбрали», планировщик встреч по часовым поясам, автоответ и другое." },
  },
  ja: {
    label: "無料ツール",
    title: "リモートチームのための<em>無料ツール。</em>",
    body: "リモートチームの毎日を少し楽にする小さなツールです。朝会のアジェンダ、会議の始めのアイスブレイク、タイムゾーンをまたいで合う時間。無料、登録不要で、ブラウザで動きます。",
    meta: { title: "リモートチームのための無料ツール", description: "リモートチームのリーダー向けの無料ツール。朝会テンプレート、アイスブレイクや究極の選択の質問、タイムゾーン会議プランナー、不在通知の例文ジェネレーターなど。" },
  },
  ko: {
    label: "무료 도구",
    title: "원격 팀을 위한 <em>무료 도구.</em>",
    body: "원격 팀의 하루를 조금 편하게 해 주는 작은 도구들입니다. 스탠드업 아젠다, 회의를 시작할 때 쓸 질문, 시간대가 달라도 맞는 시간까지. 무료이고, 가입 없이 브라우저에서 바로 쓸 수 있어요.",
    meta: { title: "원격 팀을 위한 무료 도구", description: "원격 팀 리더를 위한 무료 도구: 데일리 스탠드업 템플릿, 아이스브레이킹·밸런스 게임 질문, 시간대별 회의 플래너, 부재중 자동 회신 생성기 등." },
  },
  zh: {
    label: "免费工具",
    title: "为远程团队准备的<em>免费工具。</em>",
    body: "让远程团队的日常更轻松的小工具：站会议程、会议开场的破冰问题、跨时区都合适的时间。免费、无需注册，在浏览器中即可使用。",
    meta: { title: "远程团队免费工具", description: "为远程团队负责人准备的免费工具：每日站会模板、破冰和二选一问题、跨时区会议规划器、休假自动回复生成器等。" },
  },
  he: {
    label: "כלים חינמיים",
    title: "כלים חינמיים <em>לצוותים מרוחקים.</em>",
    body: "כלים קטנים שמקלים על היום של צוות מרוחק: סדר יום לסטנדאפ, שאלות לפתיחת פגישה ושעה שמתאימה לכמה אזורי זמן. בחינם, בלי הרשמה, ישר בדפדפן.",
    meta: { title: "כלים חינמיים לצוותים מרוחקים", description: "כלים חינמיים למנהלי צוותים מרוחקים: תבנית לסטנדאפ יומי, שאלות שוברות קרח ו\"מה הייתם מעדיפים\", מתכנן פגישות לפי אזורי זמן, מחולל הודעת היעדרות ועוד." },
  },
  ar: {
    label: "أدوات مجانية",
    title: "أدوات مجانية <em>للفرق عن بُعد.</em>",
    body: "أدوات صغيرة تسهّل يوم الفريق الذي يعمل عن بُعد: جدول أعمال الاجتماع اليومي، وأسئلة لبدء الاجتماع، ووقت يناسب مناطق زمنية مختلفة. مجانية، بلا تسجيل، وتعمل في المتصفح.",
    meta: { title: "أدوات مجانية للفرق عن بُعد", description: "أدوات مجانية لقادة الفرق عن بُعد: نموذج الاجتماع اليومي، وأسئلة كسر الجليد و\"لو خيروك\"، ومخطط اجتماعات عبر المناطق الزمنية، ومولّد رسالة خارج المكتب، والمزيد." },
  },
};

/** Short names for the newer tools, which the footer doesn't name. */
export const FEW_TOOL_NAMES: Record<Locale, Record<string, string>> = {
  en: {
    [STANDUP_PATH]: "Daily standup template",
    [WOULD_YOU_RATHER_PATH]: "Would you rather questions for work",
    [TWO_TRUTHS_PATH]: "Two truths and a lie ideas",
    [TEAM_BUILDING_PATH]: "Team building questions",
    [OUT_OF_OFFICE_PATH]: "Out of office message generator",
    [SECRET_SANTA_PATH]: "Secret Santa generator",
  },
  pt: {
    [STANDUP_PATH]: "Modelo de daily",
    [WOULD_YOU_RATHER_PATH]: "Perguntas \"você prefere\" para o trabalho",
    [TWO_TRUTHS_PATH]: "Ideias de duas verdades e uma mentira",
    [TEAM_BUILDING_PATH]: "Perguntas de team building",
    [OUT_OF_OFFICE_PATH]: "Gerador de mensagem de ausência",
    [SECRET_SANTA_PATH]: "Sorteio de amigo secreto online",
  },
  es: {
    [STANDUP_PATH]: "Plantilla de daily",
    [WOULD_YOU_RATHER_PATH]: "Preguntas de \"¿qué prefieres?\" para el trabajo",
    [TWO_TRUTHS_PATH]: "Ideas de dos verdades y una mentira",
    [TEAM_BUILDING_PATH]: "Preguntas de team building",
    [OUT_OF_OFFICE_PATH]: "Generador de mensaje de fuera de la oficina",
    [SECRET_SANTA_PATH]: "Sorteo de amigo invisible online",
  },
  de: {
    [STANDUP_PATH]: "Daily Standup Vorlage",
    [WOULD_YOU_RATHER_PATH]: "„Würdest du eher“-Fragen für die Arbeit",
    [TWO_TRUTHS_PATH]: "Ideen für Zwei Wahrheiten und eine Lüge",
    [TEAM_BUILDING_PATH]: "Teambuilding-Fragen",
    [OUT_OF_OFFICE_PATH]: "Abwesenheitsnotiz-Generator",
    [SECRET_SANTA_PATH]: "Wichteln online",
  },
  fr: {
    [STANDUP_PATH]: "Modèle de daily meeting",
    [WOULD_YOU_RATHER_PATH]: "Questions « Tu préfères » pour le travail",
    [TWO_TRUTHS_PATH]: "Idées pour deux vérités et un mensonge",
    [TEAM_BUILDING_PATH]: "Questions de team building",
    [OUT_OF_OFFICE_PATH]: "Générateur de message d'absence",
    [SECRET_SANTA_PATH]: "Tirage au sort Secret Santa",
  },
  it: {
    [STANDUP_PATH]: "Template per il daily standup",
    [WOULD_YOU_RATHER_PATH]: "Domande \"Preferiresti\" per il lavoro",
    [TWO_TRUTHS_PATH]: "Idee per due verità e una bugia",
    [TEAM_BUILDING_PATH]: "Domande di team building",
    [OUT_OF_OFFICE_PATH]: "Generatore di messaggi fuori sede",
    [SECRET_SANTA_PATH]: "Estrazione Secret Santa online",
  },
  nl: {
    [STANDUP_PATH]: "Daily standup template",
    [WOULD_YOU_RATHER_PATH]: "Zou je liever-vragen voor op het werk",
    [TWO_TRUTHS_PATH]: "Ideeën voor twee waarheden en een leugen",
    [TEAM_BUILDING_PATH]: "Teambuildingvragen",
    [OUT_OF_OFFICE_PATH]: "Afwezigheidsbericht generator",
    [SECRET_SANTA_PATH]: "Lootjes trekken online",
  },
  pl: {
    [STANDUP_PATH]: "Szablon daily stand-upu",
    [WOULD_YOU_RATHER_PATH]: "Pytania „Co wolisz?” do pracy",
    [TWO_TRUTHS_PATH]: "Pomysły na dwie prawdy i jedno kłamstwo",
    [TEAM_BUILDING_PATH]: "Pytania integracyjne",
    [OUT_OF_OFFICE_PATH]: "Generator wiadomości o nieobecności",
    [SECRET_SANTA_PATH]: "Losowanie Secret Santa",
  },
  sv: {
    [STANDUP_PATH]: "Mall för daily standup",
    [WOULD_YOU_RATHER_PATH]: "Skulle du hellre-frågor för jobbet",
    [TWO_TRUTHS_PATH]: "Idéer till två sanningar och en lögn",
    [TEAM_BUILDING_PATH]: "Teambuildingfrågor",
    [OUT_OF_OFFICE_PATH]: "Generator för frånvaromeddelanden",
    [SECRET_SANTA_PATH]: "Secret Santa-lottning",
  },
  da: {
    [STANDUP_PATH]: "Skabelon til daily standup",
    [WOULD_YOU_RATHER_PATH]: "Vil du hellere-spørgsmål til arbejdet",
    [TWO_TRUTHS_PATH]: "Idéer til to sandheder og en løgn",
    [TEAM_BUILDING_PATH]: "Teambuilding-spørgsmål",
    [OUT_OF_OFFICE_PATH]: "Generator til fraværsbeskeder",
    [SECRET_SANTA_PATH]: "Secret Santa-generator",
  },
  no: {
    [STANDUP_PATH]: "Mal for daily standup",
    [WOULD_YOU_RATHER_PATH]: "Vil du heller-spørsmål til jobben",
    [TWO_TRUTHS_PATH]: "Idéer til to sannheter og en løgn",
    [TEAM_BUILDING_PATH]: "Teambuilding-spørsmål",
    [OUT_OF_OFFICE_PATH]: "Generator for fraværsmeldinger",
    [SECRET_SANTA_PATH]: "Secret Santa-generator",
  },
  fi: {
    [STANDUP_PATH]: "Daily-palaverin pohja",
    [WOULD_YOU_RATHER_PATH]: "Kumpi mieluummin -kysymyksiä töihin",
    [TWO_TRUTHS_PATH]: "Ideoita kaksi totuutta ja yksi valhe -peliin",
    [TEAM_BUILDING_PATH]: "Tiimiytymiskysymyksiä",
    [OUT_OF_OFFICE_PATH]: "Poissaoloviestin generaattori",
    [SECRET_SANTA_PATH]: "Secret Santa -arvonta",
  },
  ru: {
    [STANDUP_PATH]: "Шаблон ежедневного стендапа",
    [WOULD_YOU_RATHER_PATH]: "Вопросы «Что бы вы выбрали» для работы",
    [TWO_TRUTHS_PATH]: "Идеи для «Двух правд и одной лжи»",
    [TEAM_BUILDING_PATH]: "Вопросы для тимбилдинга",
    [OUT_OF_OFFICE_PATH]: "Генератор автоответа об отсутствии",
    [SECRET_SANTA_PATH]: "Тайный Санта онлайн",
  },
  ja: {
    [STANDUP_PATH]: "朝会テンプレート",
    [WOULD_YOU_RATHER_PATH]: "仕事で使える究極の選択",
    [TWO_TRUTHS_PATH]: "2つの真実と1つの嘘のネタ",
    [TEAM_BUILDING_PATH]: "チームビルディングの質問",
    [OUT_OF_OFFICE_PATH]: "不在通知の例文ジェネレーター",
    [SECRET_SANTA_PATH]: "プレゼント交換の抽選（シークレットサンタ）",
  },
  ko: {
    [STANDUP_PATH]: "데일리 스탠드업 템플릿",
    [WOULD_YOU_RATHER_PATH]: "회사용 밸런스 게임 질문",
    [TWO_TRUTHS_PATH]: "진진가 게임 아이디어",
    [TEAM_BUILDING_PATH]: "팀빌딩 질문",
    [OUT_OF_OFFICE_PATH]: "부재중 자동 회신 생성기",
    [SECRET_SANTA_PATH]: "마니또 뽑기",
  },
  zh: {
    [STANDUP_PATH]: "每日站会模板",
    [WOULD_YOU_RATHER_PATH]: "适合工作的二选一问题",
    [TWO_TRUTHS_PATH]: "两真一假点子",
    [TEAM_BUILDING_PATH]: "团建问题",
    [OUT_OF_OFFICE_PATH]: "休假自动回复生成器",
    [SECRET_SANTA_PATH]: "交换礼物抽签（神秘圣诞老人）",
  },
  he: {
    [STANDUP_PATH]: "תבנית לסטנדאפ יומי",
    [WOULD_YOU_RATHER_PATH]: "שאלות \"מה הייתם מעדיפים\" לעבודה",
    [TWO_TRUTHS_PATH]: "רעיונות לשתי אמיתות ושקר",
    [TEAM_BUILDING_PATH]: "שאלות לגיבוש צוות",
    [OUT_OF_OFFICE_PATH]: "מחולל הודעת היעדרות",
    [SECRET_SANTA_PATH]: "הגרלת גמד וענק",
  },
  ar: {
    [STANDUP_PATH]: "نموذج الاجتماع اليومي",
    [WOULD_YOU_RATHER_PATH]: "أسئلة \"لو خيروك\" للعمل",
    [TWO_TRUTHS_PATH]: "أفكار لعبة حقيقتان وكذبة",
    [TEAM_BUILDING_PATH]: "أسئلة بناء الفريق",
    [OUT_OF_OFFICE_PATH]: "مولّد رسالة خارج المكتب",
    [SECRET_SANTA_PATH]: "قرعة سيكرت سانتا",
  },
};
