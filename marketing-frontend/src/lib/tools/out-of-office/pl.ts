import type { OooContent } from "@/lib/tools/out-of-office";

/** Generator wiadomości o nieobecności po polsku, napisany na podstawie strony angielskiej. */
const pl: OooContent = {
  meta: {
    title: "Wiadomość o nieobecności: generator autoodpowiedzi i przykłady",
    description:
      "Napisz wiadomość o nieobecności w kilka sekund: autoodpowiedź na maila i status na Slacka lub Teams, na urlop, chorobę czy delegację. Z przykładami.",
  },
  eyebrow: "Darmowe narzędzie",
  updated: "Zaktualizowano",
  title: "Generator <em>wiadomości o nieobecności.</em>",
  intro:
    "Podaj, dlaczego cię nie ma, kiedy wracasz i kto może pomóc w międzyczasie, a dostaniesz autoodpowiedź na maila i krótki status na czat zespołu, gotowe do wklejenia. Poniżej: przykładowe wiadomości na każdą okazję i jak włączyć je w Outlooku, Gmailu, Slacku i Teams.",
  writer: {
    reason: "Powód nieobecności",
    reasons: { vacation: "Urlop", sick: "Choroba", travel: "Delegacja", parental: "Urlop rodzicielski", holiday: "Święto" },
    back: "Powrót",
    unknown: "Zostaw puste, jeśli jeszcze nie wiesz.",
    name: "Twoje imię i nazwisko",
    contact: "Z kim się kontaktować",
    email: "E-mail tej osoby",
    optional: "(opcjonalnie)",
    tone: "Ton",
    tones: { professional: "Oficjalny", friendly: "Przyjazny", short: "Krótki" },
    emailTitle: "Autoodpowiedź na maila",
    statusTitle: "Status na Slacka, Teams lub TinyFloor",
    statusNote: "Maksymalnie 100 znaków, żeby zmieścił się w statusie na Slacku.",
    copy: "Kopiuj",
    copied: "Skopiowano",
  },
  sections: [
    {
      title: "Przykłady wiadomości o nieobecności",
      body: [
        "Każda dobra wiadomość o nieobecności mówi trzy rzeczy: że cię nie ma, kiedy wracasz i z kim się kontaktować, jeśli sprawa nie może czekać. Tak to brzmi w najczęstszych sytuacjach; generator powyżej pisze to samo z twoimi datami i nazwiskami.",
      ],
      items: [
        {
          title: "Urlop",
          detail: "Urlop wypoczynkowy",
          body: "„Dziękuję za wiadomość. Przebywam na urlopie i wracam do pracy w poniedziałek 2 listopada. Odpowiem po powrocie. W pilnych sprawach proszę o kontakt z Aną Limą (ana@example.com).”",
        },
        {
          title: "Choroba",
          detail: "Krótko i dyskretnie",
          body: "„Dziękuję za wiadomość. Dziś jestem poza biurem i odpowiem zaraz po powrocie. W pilnych sprawach proszę o kontakt z Aną Limą.” Informowanie, że chorujesz, nie jest konieczne; nikomu nie jesteś winien szczegółów.",
        },
        {
          title: "Delegacja lub konferencja",
          detail: "Wolniej, ale jestem",
          body: "„Dzięki za wiadomość! Do czwartku 5 listopada jestem w podróży służbowej i rzadziej niż zwykle sprawdzam pocztę. Odezwę się po powrocie. Jeśli sprawa nie może czekać, pomoże Ana Lima.”",
        },
        {
          title: "Urlop rodzicielski",
          detail: "Długa nieobecność",
          body: "„Dziękuję za wiadomość. Do 2 lutego przebywam na urlopie rodzicielskim i nie sprawdzam poczty. W sprawach moich projektów proszę o kontakt z Aną Limą (ana@example.com), która mnie zastępuje.” Przy długiej nieobecności podaj osobę, nie tylko datę.",
        },
        {
          title: "Święto",
          detail: "Dla całego zespołu",
          body: "„Dziękujemy za wiadomość. Z powodu święta nasze biuro jest nieczynne, wracamy we wtorek 3 listopada. Odpowiemy po powrocie.”",
        },
        {
          title: "Krótka wersja",
          detail: "Dla współpracowników",
          body: "„Jestem na urlopie do 3 listopada. Pilne? Pisz do Any Limy.” W obrębie własnej firmy krócej zwykle znaczy lepiej.",
        },
      ],
    },
    {
      title: "Jak ustawić autoodpowiedź w Outlooku",
      body: [
        "W nowym Outlooku i Outlooku w przeglądarce otwórz Ustawienia (ikona koła zębatego), przejdź do Konta, a potem do Odpowiedzi automatycznych. Włącz odpowiedzi automatyczne, zaznacz opcję wysyłania ich tylko w określonym czasie, ustaw datę początku i końca i wklej wiadomość. Możesz napisać osobną wiadomość dla osób spoza organizacji i to dobry pomysł: współpracownicy potrzebują mniej wyjaśnień niż klienci.",
        "W klasycznym Outlooku dla Windows wybierz Plik, a potem Odpowiedzi automatyczne, i wpisz te same dane. Jeśli ustawisz datę końcową, Outlook sam wyłączy odpowiedzi, więc nie musisz o tym pamiętać.",
      ],
    },
    {
      title: "Jak ustawić autoodpowiedź w Gmailu",
      body: [
        "W Gmailu kliknij ikonę koła zębatego, a potem Zobacz wszystkie ustawienia. Na karcie Ogólne przewiń do sekcji Autoodpowiedź, włącz ją, ustaw pierwszy i ostatni dzień, dodaj temat, na przykład „Nieobecność do 3 listopada”, wklej wiadomość i kliknij Zapisz zmiany na dole strony.",
        "Gmail wysyła autoodpowiedź do każdej osoby raz na cztery dni, a nie na każdą wiadomość, więc ktoś, kto napisze dwa razy, nie dostanie jej podwójnie. Możesz też wysyłać ją tylko do swoich kontaktów albo, na koncie służbowym, tylko do osób z twojej organizacji.",
      ],
    },
    {
      title: "Nieobecność na Slacku i w Microsoft Teams",
      body: [
        "Czaty zespołowe nie wysyłają autoodpowiedzi, więc tę rolę pełni status: widać go obok twojego nazwiska wszędzie, gdzie ktoś próbuje do ciebie napisać. Na Slacku kliknij swoje zdjęcie profilowe, wybierz Update your status (zmień status), dodaj emoji i krótki tekst, na przykład „🌴 Na urlopie do 3 lis”, i ustaw, żeby zniknął, gdy wrócisz. Wstrzymanie powiadomień na te same dni wyciszy też telefon.",
        "W Microsoft Teams kliknij swoje zdjęcie profilowe i wybierz Ustaw komunikat o stanie. Wpisz wiadomość i ustaw, kiedy ma zniknąć. W tym samym oknie jest link do zaplanowania nieobecności, który włącza jednocześnie autoodpowiedź w Outlooku i status w Teams. Status z generatora powyżej jest wystarczająco krótki do obu.",
      ],
    },
    {
      title: "Co powinna zawierać dobra wiadomość o nieobecności",
      items: [
        { title: "Kiedy wracasz", body: "Data, a nie „w przyszłym tygodniu”. Jeśli jeszcze nie wiesz, napisz, że odpowiesz zaraz po powrocie." },
        { title: "Kto może pomóc", body: "Imię i nazwisko oraz e-mail, jeśli to ktoś spoza rozmowy. Najpierw zapytaj tę osobę; nikt nie lubi dowiadywać się od klienta, że kogoś zastępuje." },
        { title: "Bez zbędnych szczegółów", body: "„Poza biurem” wystarczy. Gdzie jesteś i dlaczego, to nikogo nie dotyczy, a cel wakacji w autoodpowiedzi mówi obcym ludziom, że twoje mieszkanie stoi puste." },
        { title: "Bez obietnic bez pokrycia", body: "„Odpowiem po powrocie” jest w porządku. „Odpowiem na każdego maila” po dwóch tygodniach nieobecności zwykle nie jest prawdą." },
        { title: "Wyłącz ją", body: "Ustaw datę końcową w Outlooku lub Gmailu i godzinę wygaśnięcia statusu na czacie, żeby nikt w dniu twojego powrotu nie przeczytał, że cię nie ma." },
      ],
    },
  ],
  fit: {
    title: "Nieobecności wbudowane w biuro",
    body: "W TinyFloor, wirtualnym biurze dla małych zespołów, notatka statusu w stylu „🌴 Na urlopie do poniedziałku” widnieje przy twoim imieniu, więc zespół wie o tym, zanim spróbuje się z tobą skontaktować, a w dniu powrotu znika sama. Działa w karcie przeglądarki, za darmo do 3 osób i za 29 $ miesięcznie dla całego zespołu.",
    cta: "Wypróbuj biuro demo",
  },
  faqTitle: "Częste <em>pytania.</em>",
  faq: [
    {
      q: "Co powinna zawierać wiadomość o nieobecności?",
      a: "Że cię nie ma, kiedy wracasz i z kim się kontaktować w pilnej sprawie. Na przykład: „Jestem poza biurem do poniedziałku 2 listopada. W pilnych sprawach proszę o kontakt z Aną Limą.”",
    },
    {
      q: "Jak ustawić autoodpowiedź w Outlooku?",
      a: "W nowym Outlooku lub Outlooku w przeglądarce: Ustawienia, Konta, Odpowiedzi automatyczne. W klasycznym Outlooku dla Windows: Plik, Odpowiedzi automatyczne. Włącz je, ustaw daty i wklej wiadomość.",
    },
    {
      q: "Jak ustawić autoodpowiedź w Gmailu?",
      a: "Kliknij koło zębate, Zobacz wszystkie ustawienia, i na karcie Ogólne włącz Autoodpowiedź. Ustaw daty, temat i treść, a potem kliknij Zapisz zmiany.",
    },
    {
      q: "Czy trzeba pisać, dlaczego jestem nieobecny?",
      a: "Nie. „Poza biurem” wystarczy. Informacja o urlopie jest popularna i w porządku, ale nigdy nie musisz podawać szczegółów, zwłaszcza o chorobie.",
    },
    {
      q: "Jak wygląda oficjalna wiadomość o nieobecności?",
      a: "„Dziękuję za wiadomość. Jestem poza biurem do poniedziałku 2 listopada i odpowiem po powrocie. W pilnych sprawach proszę o kontakt z Aną Limą (ana@example.com).”",
    },
    {
      q: "Czy ten generator wiadomości o nieobecności jest darmowy?",
      a: "Tak, i działa w całości w twojej przeglądarce: imiona, daty i adresy e-mail, które wpisujesz, nigdzie nie są wysyłane. Skopiuj wiadomość do Outlooka, Gmaila, Slacka lub Teams.",
    },
  ],
};

export default pl;
