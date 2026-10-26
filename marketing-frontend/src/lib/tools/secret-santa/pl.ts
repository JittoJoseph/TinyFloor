import type { SantaContent } from "@/lib/tools/secret-santa";

/** The Secret Santa generator in Polish, written from the English page. */
const pl: SantaContent = {
  meta: {
    title: "Secret Santa: losowanie online za darmo, bez e-maila i rejestracji",
    description: "Wylosuj imiona w Secret Santa w kilka sekund i wyślij każdemu prywatny link z informacją, dla kogo kupuje prezent. Za darmo, bez podawania e-maili i zakładania kont, stworzone z myślą o zespołach pracujących zdalnie.",
  },
  eyebrow: "Darmowe narzędzie",
  updated: "Zaktualizowano",
  title: "Losowanie <em>Secret Santa.</em>",
  intro: "Wpisz imiona, zrób losowanie i wyślij każdemu jego prywatny link: zobaczy na nim, dla kogo kupuje prezent, bez ujawniania pozostałych par. Bez e-maili, bez kont i idealne dla zespołu rozsianego po świecie. Poniżej: jak zorganizować Mikołajki online, zasady gry i pomysły na prezenty dla współpracowników.",
  drawer: {
    names: "Imiona",
    namesHint: "Jedno w każdym wierszu, co najmniej trzy. Dodaj siebie, jeśli bierzesz udział.",
    budget: "Budżet",
    date: "Data wręczenia prezentów",
    optional: "(opcjonalnie)",
    draw: "Losuj imiona",
    redraw: "Losuj ponownie",
    redrawNote: "Ponowne losowanie tworzy nowe linki. Wyślij tylko te najnowsze.",
    tooFew: "Dodaj co najmniej trzy imiona.",
    duplicate: "Dwie osoby mają tak samo na imię. Dodaj inicjał, żeby każdy mógł znaleźć swój link.",
    linksTitle: "Prywatne linki",
    linksNote: "Wyślij każdej osobie jej własny link w wiadomości tylko do niej. Po jego otwarciu zobaczy, komu robi prezent.",
    copy: "Kopiuj link",
    copied: "Skopiowano",
    copyAll: "Kopiuj wszystkie linki",
    allIntro: "Secret Santa: otwórz tylko link ze swoim imieniem.",
    revealTitle: "Cześć {name}, przygotowujesz prezent dla…",
    show: "Pokaż imię",
    lookAway: "Upewnij się, że nikt nie patrzy na twój ekran.",
    budgetLabel: "Budżet",
    dateLabel: "Wymiana prezentów",
    keepSecret: "Zachowaj to w tajemnicy aż do wręczenia prezentów.",
    own: "Zrób losowanie dla swojej grupy",
  },
  sections: [
    {
      title: "Jak zorganizować Secret Santa online na mikołajki",
      items: [
        {
          title: "Zbierz imiona",
          body: "Zapytaj, kto chce wziąć udział. W pracy uczestnictwo powinno być dobrowolne – Secret Santa, do którego ludzie są zmuszani, nie sprawia nikomu radości.",
        },
        {
          title: "Ustal budżet i datę",
          body: "Jedna kwota, podana z góry, żeby nikt nie wydał trzy razy więcej niż osoba, która kupuje dla niego. Data to dzień, w którym otwieracie prezenty.",
        },
        { title: "Przeprowadź losowanie", body: "Wpisz imiona powyżej i zrób losowanie. Każdy kogoś wylosuje i nikt nie trafi na samego siebie." },
        {
          title: "Wyślij linki",
          body: "Wyślij każdej osobie jej własny link w wiadomości prywatnej lub e-mailu. Organizator też może wziąć udział: widzisz linki, ale nie to, kto kogo wylosował.",
        },
        { title: "Wspólnie otwórzcie prezenty", body: "Na wideorozmowie lub na imprezie, po kolei, gdy wszyscy zgadują, kto był ich tajemniczym Mikołajem." },
      ],
    },
    {
      title: "Secret Santa w zespole zdalnym",
      body: [
        "Gdy zespół pracuje z różnych miast lub krajów, prezenty muszą przebyć drogę. Najprostszym rozwiązaniem są prezenty cyfrowe: karta podarunkowa, e-book, miesiąc subskrypcji serwisu streamingowego lub darowizna na cel charytatywny w imieniu danej osoby. Jeśli wolicie wysłać coś fizycznego, organizator może prywatnie zebrać adresy domowe i przekazać każdy z nich tylko tej osobie, która go potrzebuje. Alternatywnie każdy może zamówić prezent w sklepie, który oferuje dostawę do danego kraju.",
        "Otwórzcie prezenty wspólnie podczas rozmowy, najlepiej w ramach imprezy podsumowującej rok. Nasze [pomysły na wirtualną imprezę świąteczną](/guides/virtual-holiday-party-ideas) zawierają plan spotkania i towarzyszące mu gry.",
      ],
    },
    {
      title: "Zasady Secret Santa",
      items: [
        {
          title: "Trzymaj się budżetu",
          body: "Mniej jest w porządku, więcej bywa kłopotliwe. O to właśnie chodzi w budżecie: drobny prezent, wybrany z myślą o drugiej osobie.",
        },
        { title: "Zachowaj tajemnicę", body: "Nie mów nikomu, kogo wylosowałeś, dopóki prezenty nie zostaną otwarte, i nie pytaj innych, kogo wylosowali." },
        {
          title: "Zadbaj o to, by prezenty były odpowiednie do pracy",
          body: "Nic zbyt osobistego ani niczego, co mogłoby wprawić kogoś w zakłopotanie przed współpracownikami.",
        },
        {
          title: "Podziel się życzeniem",
          body: "Jeśli każdy doda krótkie życzenie na czacie zespołu, na przykład „Chętnie dostanę dobrą książkę”, nikt nie będzie musiał zgadywać.",
        },
        {
          title: "Niech udział będzie dobrowolny",
          body: "Niektórzy nie obchodzą świąt lub po prostu nie chcą brać udziału. Nadal są mile widziani na wspólnej imprezie.",
        },
      ],
    },
    {
      title: "Pomysły na prezenty na Secret Santa dla współpracowników",
      body: [
        "Pomysły, które łatwo wysłać i które pasują do większości budżetów:",
      ],
      items: [
        { title: "Kawa lub herbata", detail: "Do 50 zł", body: "Paczka kawy z dobrej lokalnej palarni lub zestaw herbat." },
        { title: "Książka", detail: "Do 50 zł", body: "Coś, co spodobało ci się w tym roku, z liścikiem wyjaśniającym dlaczego." },
        { title: "Roślina na biurko", detail: "Do 100 zł", body: "Mała, trudna do uśmiercenia i miła dla oka podczas rozmów." },
        { title: "Karta podarunkowa", detail: "Dowolny budżet", body: "Do księgarni, sieci kawiarni lub dostawy jedzenia w miejscu ich zamieszkania." },
        { title: "Ładny notes", detail: "Do 50 zł", body: "Przydatny dla każdego, kto wciąż zapisuje rzeczy na papierze." },
        {
          title: "Miesięczna subskrypcja czegoś",
          detail: "Do 50 zł",
          body: "Subskrypcja muzyczna, audiobooków lub serwisu streamingowego, wysłana jako kod podarunkowy.",
        },
        { title: "Puzzle lub gra", detail: "Do 100 zł", body: "Coś na wieczory lub dla całej rodziny." },
        {
          title: "Coś z twojego miasta",
          detail: "Do 80 zł",
          body: "Lokalne słodycze lub drobiazg, który można kupić tylko w twojej okolicy. Zespoły zdalne to uwielbiają.",
        },
      ],
    },
  ],
  fit: {
    title: "Wspólne otwieranie prezentów",
    body: "TinyFloor to wirtualne biuro dla małych zespołów. Otwórzcie prezenty na Mikołajki w pokoju spotkań z wideo i udostępnianiem ekranu, a potem zostańcie i porozmawiajcie przy swoich biurkach, tak jak na prawdziwej imprezie. Jest za darmo do 3 osób i za 29 $ miesięcznie dla całego zespołu.",
    cta: "Wypróbuj biuro demo",
  },
  faqTitle: "Częste <em>pytania.</em>",
  faq: [
    {
      q: "Jak działa ten generator Secret Santa?",
      a: "Wpisz imiona, zrób losowanie na Mikołajki i wyślij każdej osobie link z jej imieniem. Po otwarciu linku widać, dla kogo kupuje się prezent, a także budżet i termin, jeśli zostały ustawione.",
    },
    {
      q: "Czy uczestnicy potrzebują adresu e-mail lub konta?",
      a: "Nie. Nie ma rejestracji i nic nie jest wysyłane e-mailem: samodzielnie przesyłasz linki na czacie, w mailu lub SMS-em.",
    },
    {
      q: "Czy organizator może wziąć udział?",
      a: "Tak. Organizator widzi linki, ale nie widzi, kto kogo wylosował. Dodaj więc swoje imię i otwórz tylko własny link.",
    },
    { q: "Czy można wylosować samego siebie?", a: "Nie. Każda osoba losuje kogoś innego i każdy zostaje przypisany do dokładnie jednego Secret Santa." },
    {
      q: "Jak zorganizować Secret Santa w zespole zdalnym?",
      a: "Wylosujcie imiona online, wyślijcie każdemu prywatny link, ustalcie budżet i wybierzcie prezenty cyfrowe lub zbierzcie adresy prywatnie. Potem otwórzcie prezenty wspólnie podczas rozmowy wideo.",
    },
    {
      q: "Jaki budżet na Secret Santa sprawdzi się w pracy?",
      a: "Taki, na który każdy może sobie pozwolić bez wahania, zazwyczaj od 50 do 100 zł. Podaj jedną kwotę w zaproszeniu, aby prezenty były równej wartości.",
    },
    {
      q: "Czy ten generator Secret Santa jest darmowy?",
      a: "Tak, bez limitu liczby osób. Działa w przeglądarce, a imiona są przesyłane tylko w linkach, które wysyłasz.",
    },
  ],
};

export default pl;
