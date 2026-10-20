import type { StandupContent } from "@/lib/tools/standup";

/** Szablon daily stand-upu po polsku, napisany na podstawie strony angielskiej. */
const pl: StandupContent = {
  meta: {
    title: "Szablon daily stand-upu: darmowa agenda i wersja asynchroniczna",
    description:
      "Ułóż agendę daily dopasowaną do wielkości zespołu albo szablon asynchronicznego stand-upu do wrzucenia na Slacka lub Teams. Za darmo, z trzema zestawami pytań.",
  },
  eyebrow: "Darmowe narzędzie",
  updated: "Zaktualizowano",
  title: "Szablon <em>daily stand-upu.</em>",
  intro:
    "Dobre daily trwa mniej więcej minutę na osobę i kończy się tym, że wszyscy wiedzą, co się dzieje i kto utknął. Wybierz wielkość zespołu i formę spotkania, na callu, na piśmie albo przechodząc po tablicy, a dostaniesz agendę z rozpisanym czasem albo szablon do wrzucenia na czat zespołu.",
  builder: {
    team: "Wielkość zespołu",
    people: "Osoby: {count}",
    format: "Jak się spotykacie",
    formats: { live: "Na callu", async: "Na piśmie (asynchronicznie)", board: "Po tablicy" },
    questions: "Pytania",
    sets: [
      { key: "classic", label: "Klasyczne", questions: ["Co udało ci się zrobić wczoraj?", "Co planujesz na dziś?", "Czy coś cię blokuje?"] },
      { key: "focus", label: "Priorytet", questions: ["Jaki jest twój jeden priorytet na dziś?", "Co może go zablokować?", "Od kogo potrzebujesz pomocy?"] },
      { key: "progress", label: "Postęp", questions: ["Co poszło do przodu?", "Co dalej?", "Czy są ryzyka, o których powinniśmy wiedzieć?"] },
    ],
    icebreaker: "Zacznij od minutowego pytania na rozgrzewkę",
    minutes: "Czas: {count} min",
    agenda: "Agenda",
    template: "Szablon do wrzucenia",
    copy: "Kopiuj",
    copied: "Skopiowano",
    lines: {
      open: "Start: zacznijcie punktualnie, nawet jeśli ktoś się spóźnia",
      icebreaker: "Rozgrzewka: jedno szybkie pytanie, jedno zdanie na osobę",
      round: "Runda: każdy odpowiada, około minuty na osobę",
      column: "{column}: co utknęło, co dalej",
      blockers: "Blokery: ustalcie, kto pomoże, i pogadajcie po spotkaniu",
      close: "Zakończenie: co wszyscy powinni wiedzieć",
    },
    columns: ["Zablokowane", "Do review", "W toku", "Następne"],
    note: {
      live: "Około minuty na osobę, nieco mniej w większym zespole, plus minuta na otwarcie i zamknięcie. Najwyżej piętnaście minut: dłużej to już spotkanie, nie stand-up.",
      async: "Poproś, żeby każdy co rano publikował odpowiedzi do tej samej godziny w swojej strefie czasowej, czytał wpisy innych i odpowiadał w wątku na każdy bloker.",
      board: "Przechodźcie po tablicy od prawej: najpierw praca najbliższa ukończenia, żeby zespół kończył rzeczy, zanim zacznie nowe. Pięć minut plus mniej więcej jedna na osobę.",
    },
  },
  sections: [
    {
      title: "Po co jest daily stand-up",
      body: [
        "Daily stand-up to krótkie spotkanie, zwykle na początku dnia, na którym każda osoba w zespole mówi, nad czym pracuje i czy coś jej przeszkadza. Wywodzi się ze zwinnych zespołów programistycznych, gdzie nazywa się też daily scrum, ale sprawdza się w każdym małym zespole, w którym praca jednych zależy od pracy innych.",
        "To nie jest raport dla kierownika. Chodzi o to, żeby zespół razem zobaczył nadchodzący dzień: kto co robi, gdzie dwa zadania się stykają i kto potrzebuje pomocy. Jeśli daily kogoś odblokowało, było warto; jeśli to runda recytacji, których nikt nie słucha, nie było.",
      ],
    },
    {
      title: "Trzy sposoby prowadzenia",
      items: [
        {
          title: "Na callu",
          detail: "Klasyka",
          body: "Wszyscy dołączają o tej samej porze i po kolei odpowiadają na te same trzy pytania. Najlepsze dla zespołów w zbliżonych strefach czasowych, które lubią widzieć się raz dziennie. Około minuty na osobę.",
        },
        {
          title: "Na piśmie",
          detail: "Asynchroniczny stand-up",
          body: "Każdy wrzuca odpowiedzi na czat zespołu do ustalonej godziny i czyta odpowiedzi innych. Najlepsze dla zespołów w różnych strefach czasowych albo takich, które i tak mają dużo spotkań. Znika rozmowa, więc wyróbcie nawyk odpowiadania na każdy bloker.",
        },
        {
          title: "Po tablicy",
          detail: "Najpierw praca, potem ludzie",
          body: "Zamiast iść po kolei przez osoby, przejdźcie przez tablicę zadań kolumna po kolumnie, zaczynając od pracy najbliższej ukończenia. Najlepsze dla zespołów z pełną tablicą, gdzie pytanie brzmi, co utknęło, a nie, co kto zrobił.",
        },
      ],
    },
    {
      title: "Trzy pytania na daily",
      body: [
        "Klasyczne trzy to: co udało ci się zrobić wczoraj, co planujesz na dziś i czy coś cię blokuje. Działają, ale zachęcają do wyliczania wszystkiego, czego ktoś dotknął. Jeśli wasze daily się przeciąga, spróbujcie ostrzejszego zestawu:",
      ],
      items: [
        {
          title: "Klasyczne",
          body: "Co udało ci się zrobić wczoraj? Co planujesz na dziś? Czy coś cię blokuje? Znane wszystkim i dobre dla nowego zespołu.",
        },
        {
          title: "Priorytet",
          body: "Jaki jest twój jeden priorytet na dziś? Co może go zablokować? Od kogo potrzebujesz pomocy? Krótsze odpowiedzi, a ostatnie pytanie zamienia blokery w konkretne prośby.",
        },
        {
          title: "Postęp",
          body: "Co poszło do przodu? Co dalej? Jakieś ryzyka? O pracy, a nie o osobie, więc dobrze pasują do przechodzenia po tablicy.",
        },
      ],
    },
    {
      title: "Agenda daily stand-upu minuta po minucie",
      body: [
        "Dla sześcioosobowego zespołu na callu stand-up trwa około ośmiu minut. Zaczynajcie punktualnie, nawet jeśli ktoś się spóźnia: czekanie uczy wszystkich spóźniania się. Potem idźcie w stałej kolejności, według ekranu albo alfabetycznie, żeby nikt nie zastanawiał się, kiedy jego kolej.",
        "Gdy ktoś wspomni o problemie, nie rozwiązujcie go na daily. Zanotujcie, kto może pomóc, i umówcie się na rozmowę zaraz po spotkaniu, tylko z osobami, które są potrzebne. Ten jeden nawyk utrzymuje stand-up poniżej dziesięciu minut. Na koniec zapytajcie, czy jest coś, co wszyscy powinni wiedzieć, i zakończcie call.",
      ],
      table: {
        head: ["Wielkość zespołu", "Na callu", "Po tablicy"],
        rows: [
          ["3 osoby", "5 minut", "8 minut"],
          ["6 osób", "8 minut", "11 minut"],
          ["8 osób", "10 minut", "13 minut"],
          ["12 osób", "11 minut", "15 minut"],
          ["15 osób", "14 minut", "15 minut"],
        ],
        note: "Policzone tak jak w narzędziu powyżej: około minuty na osobę (trzy czwarte minuty powyżej ośmiu osób) plus dwie na otwarcie i zamknięcie, i nigdy więcej niż piętnaście.",
      },
    },
    {
      title: "Jak prowadzić asynchroniczny stand-up",
      body: [
        "Asynchroniczny stand-up to te same trzy pytania, ale z odpowiedziami na piśmie. Wybierzcie kanał i godzinę, na przykład 10:00 w strefie czasowej każdej osoby, i poproście wszystkich o wrzucenie odpowiedzi w jednej wiadomości, według szablonu powyżej, żeby dało się je szybko przejrzeć.",
        "Dwie rzeczy sprawiają, że to działa. Po pierwsze, czytajcie wpisy innych; asynchroniczny stand-up, którego nikt nie czyta, to pamiętnik. Po drugie, odpowiadajcie w wątku na każdy bloker jeszcze tego samego dnia. Niektóre zespoły dokładają do tego jeden krótki call w tygodniu, żeby nadal się widywać.",
      ],
    },
    {
      title: "Częste błędy na daily",
      items: [
        { title: "Zamienia się w rozwiązywanie problemów", body: "Ktoś zgłasza problem i trzy osoby zaczynają go naprawiać. Zanotujcie, ustalcie, kto porozmawia po spotkaniu, i idźcie dalej." },
        { title: "To raport dla kierownika", body: "Jeśli wszyscy mówiąc patrzą na lidera, daily jest dla niewłaściwej osoby. Mówcie do zespołu." },
        { title: "Za dużo osób", body: "Powyżej mniej więcej dwunastu osób nikt nie słucha wszystkich. Podzielcie się na mniejsze stand-upy według projektu albo strumienia pracy." },
        { title: "Spóźniony start", body: "Pięć minut czekania na ostatnią osobę kosztuje wszystkich pozostałych pięć minut, każdego dnia. Zaczynajcie punktualnie." },
        { title: "Codziennie „brak blokerów”", body: "Jeśli nikt nigdy nie jest zablokowany, zadajcie ostrzejsze pytanie: „Co może zablokować twój dzisiejszy priorytet?” zwykle coś znajduje." },
      ],
    },
  ],
  fit: {
    title: "Zróbcie stand-up na piętrze",
    body: "TinyFloor to wirtualne biuro dla małych zespołów: widzisz, kto siedzi przy biurku, a na stand-up idziecie do sali spotkań zamiast klikać kolejny link. Po wszystkim podchodzisz do osoby, która utknęła. Działa w karcie przeglądarki, za darmo do 3 osób i za 29 $ miesięcznie dla całego zespołu.",
    cta: "Wypróbuj biuro demo",
  },
  faqTitle: "Częste <em>pytania.</em>",
  faq: [
    {
      q: "Jakie są trzy pytania na daily stand-up?",
      a: "Co udało ci się zrobić wczoraj? Co planujesz na dziś? Czy coś cię blokuje? Ostrzejsza wersja: Jaki jest twój jeden priorytet na dziś? Co może go zablokować? Od kogo potrzebujesz pomocy?",
    },
    {
      q: "Ile powinno trwać daily?",
      a: "Około minuty na osobę plus minuta lub dwie na otwarcie i zamknięcie: mniej więcej osiem minut dla sześcioosobowego zespołu. Najwyżej piętnaście minut.",
    },
    {
      q: "Czym jest szablon daily stand-upu?",
      a: "Stałą agendą spotkania albo formatem wiadomości dla stand-upu na piśmie: te same trzy pytania, w tej samej kolejności, każdego dnia, żeby aktualizacje były szybkie do napisania i łatwe do przejrzenia.",
    },
    {
      q: "Czym jest asynchroniczny stand-up?",
      a: "Stand-upem na piśmie: każdy wrzuca odpowiedzi na trzy pytania na czat zespołu do ustalonej godziny i czyta odpowiedzi innych. Pasuje do zespołów w różnych strefach czasowych.",
    },
    {
      q: "Czy daily stand-up jest tylko dla zespołów Scrum?",
      a: "Nie. Wywodzi się ze zwinnych zespołów programistycznych, gdzie nazywa się daily scrum, ale może z niego korzystać każdy mały zespół, w którym praca jednych zależy od pracy innych.",
    },
    {
      q: "Czy to narzędzie do daily jest darmowe?",
      a: "Tak, i działa w całości w twojej przeglądarce: nic, co wybierzesz, nie jest nigdzie wysyłane. Skopiuj agendę albo szablon do zaproszenia w kalendarzu lub na czat zespołu.",
    },
  ],
};

export default pl;
