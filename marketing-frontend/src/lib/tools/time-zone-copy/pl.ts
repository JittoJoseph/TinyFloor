import type { TimeZonesContent } from "@/lib/tools/time-zones";

const pl: TimeZonesContent = {
  meta: {
    title: "Planer spotkań w strefach czasowych: wspólne godziny zespołu zdalnego",
    description:
      "Dodaj miasto i godziny pracy każdej osoby w zespole, żeby zobaczyć, kiedy wszyscy pracują jednocześnie, albo godzinę, która pasuje największej liczbie osób, gdy żadna nie pasuje wszystkim. Uwzględnia czas letni i półgodzinne strefy, jak w Indiach.",
  },
  eyebrow: "Darmowe narzędzia",
  updated: "Zaktualizowano",
  title: "Kiedy godziny pracy zespołu <em>się pokrywają.</em>",
  intro:
    "Dodaj miasto i godziny pracy każdej osoby. Planer pokazuje godziny, w których wszyscy pracują jednocześnie, w czasie każdej z nich, a gdy żadna godzina nie pasuje wszystkim, tę, która pasuje najwięcej osobom. Liczy z dzisiejszymi przesunięciami, więc czas letni jest uwzględniony.",
  planner: {
    zone: "Strefa czasowa",
    hours: "Godziny pracy",
    remove: "Usuń",
    add: "Dodaj osobę",
    addMine: "Dodaj moją strefę",
    timesIn: "Godziny w mieście {city}",
    working: "Pracuje",
    all: "Wszyscy",
    everyone: "Wszyscy pracują od {from} do {to} czasu w mieście {city}.",
    best: "Żadna godzina nie pasuje wszystkim. Od {from} do {to} czasu w mieście {city} pasuje osobom: {count} z {total}.",
    nobody: "Godziny pracy się nie pokrywają.",
    eachLocal: "W czasie każdej osoby:",
  },
  sections: [
    {
      title: "Ile wspólnego czasu potrzebuje zespół",
      body: [
        "Mniej, niż się wydaje. Dwie do czterech wspólnych godzin dziennie wystarczą na daily, na pytania, które szybciej zadać, niż napisać, i na spotkanie, gdy jest potrzebne. Cała reszta może dziać się na piśmie, w godzinach pracy każdej osoby.",
        "Boli brak jakiejkolwiek wspólnej godziny albo wspólny czas, który istnieje tylko dlatego, że ktoś codziennie pracuje o 7 albo o 22. Jeśli planer pokazuje wspólny odcinek tylko na skraju czyjegoś dnia, to ta osoba płaci za spotkania zespołu.",
      ],
    },
    {
      title: "Jak znaleźć uczciwą godzinę spotkania",
      items: [
        {
          title: "Spotykajcie się we wspólnych godzinach",
          body: "Umieśćcie daily i cykliczne spotkania w odcinku, który pokazuje planer, a resztę wspólnych godzin zostawcie na szybkie pytania. Wspólny czas to najrzadsza rzecz, jaką ma rozproszony zespół.",
        },
        {
          title: "Rotujcie niewygodną godzinę",
          body: "Gdy jedyna możliwa godzina jest wcześnie dla jednych i późno dla innych, zmieniajcie się co tydzień, żeby nie zawsze te same osoby logowały się wieczorem.",
        },
        {
          title: "Mniej i krótszych spotkań",
          body: "15-minutowe daily zmieści się w prawie każdym wspólnym czasie, godzinne spotkanie zwykle nie. Zanim zaczniecie szukać terminu, zapytajcie, czy spotkanie nie mogłoby być pisemną aktualizacją.",
        },
        {
          title: "Zapiszcie wynik",
          body: "Kto nie mógł być, powinien nadrobić w dwie minuty: kilka zdań o tym, co postanowiono i kto co robi, opublikowanych tam, gdzie zespół i tak czyta.",
        },
        {
          title: "Pokaż swoje godziny",
          body: "Wpisz godziny pracy w kalendarz i status, żeby nikt nie musiał liczyć, czy to dobry moment, by cię o coś zapytać.",
        },
      ],
    },
    {
      title: "Gdy nie ma wspólnych godzin",
      items: [
        { title: "Daily na piśmie", body: "Każdy na początku swojego dnia pisze, co zrobił, co dalej i co go blokuje. Inni czytają to na początku swojego." },
        { title: "Dwa mniejsze spotkania", body: "Podzielcie zespół według regionów na spotkania na żywo, z jedną osobą na obu albo wspólnymi notatkami, żeby to, co ważne, dotarło na drugą stronę." },
        { title: "Przekazanie pracy na koniec dnia", body: "Gdy wieczór jednej osoby jest porankiem drugiej, krótka notatka na koniec dnia pozwala pracy iść dalej, gdy pierwsza śpi." },
        { title: "Jedna wspólna godzina w tygodniu", body: "Nawet zespół bez codziennych wspólnych godzin może znaleźć jedną godzinę w tygodniu, w której każdy trochę się nagina, i rotować, kto nagina się najbardziej." },
      ],
    },
    {
      title: "Czas letni przesuwa wspólne godziny",
      body: [
        "Zegarki przestawia się w różnych miejscach w różne dni, więc wspólne godziny zespołu mogą się przesunąć o godzinę na kilka tygodni każdej wiosny i jesieni. USA zmieniają czas w drugą niedzielę marca i pierwszą listopada, Europa w ostatnią niedzielę marca i października. Australia, Nowa Zelandia i Chile robią to odwrotnie, w swojej wiośnie. Indie, Chiny, Japonia, Brazylia i Meksyk nie zmieniają czasu.",
        "Planer liczy przesunięcie każdego miasta na dziś, więc sprawdź go ponownie w okolicach tych dat, jeśli wspólny czas w twoim zespole jest niewielki.",
      ],
    },
    {
      title: "Jak to liczy",
      body: [
        "Bierze dzień podzielony na pół godziny w czasie pierwszej osoby, oblicza z danych stref czasowych twojej przeglądarki, która godzina jest u wszystkich pozostałych, i liczy, kto jest w swoich godzinach pracy. Półgodziny są potrzebne dla Indii, które są pięć i pół godziny przed UTC. Godziny pracy przez północ, na przykład od 22 do 6, też działają, a wszystko liczy się w twojej przeglądarce.",
      ],
    },
  ],
  fit: {
    title: "Wykorzystaj wspólne godziny",
    body: "TinyFloor to wirtualne biuro dla małych zespołów. We wspólnych godzinach wszyscy obecni są na tym samym piętrze, a pytanie to podejście do czyjegoś biurka, a nie umawianie rozmowy. Jest za darmo do 3 osób i kosztuje 29 $ miesięcznie za cały zespół.",
    cta: "Wypróbuj biuro demo",
  },
  faqTitle: "Częste <em>pytania.</em>",
  faq: [
    {
      q: "Jak znaleźć godzinę spotkania w różnych strefach czasowych?",
      a: "Zapisz miasto i godziny pracy każdej osoby i szukaj półgodzin, w których wszyscy pracują jednocześnie. Planer powyżej robi to dla maksymalnie 12 osób i pokazuje wynik w czasie każdej z nich.",
    },
    {
      q: "Ile wspólnych godzin potrzebuje zespół zdalny?",
      a: "Dwie do czterech godzin dziennie wystarczą większości zespołów: na daily, szybkie pytania i od czasu do czasu spotkanie. Reszta pracy może być pisemna i wykonywana w godzinach każdej osoby.",
    },
    {
      q: "Jaka jest uczciwa godzina spotkania w różnych strefach?",
      a: "Taka, która mieści się w godzinach pracy wszystkich. Jeśli jej nie ma, rotujcie wczesny albo późny termin co tydzień, żeby nie brały go zawsze te same osoby.",
    },
    {
      q: "Co, jeśli mój zespół nie ma żadnych wspólnych godzin?",
      a: "Pracujcie na piśmie: daily na piśmie na początku dnia każdej osoby, notatka z przekazaniem pracy na koniec i spotkania na żywo podzielone według regionów. Większość zespołów i tak znajdzie jedną wspólną godzinę w tygodniu.",
    },
    {
      q: "Czy planer uwzględnia czas letni?",
      a: "Tak. Korzysta z dzisiejszego przesunięcia każdego miasta według danych stref czasowych twojej przeglądarki, więc czas letni jest uwzględniony. Sprawdź ponownie pod koniec marca i października, gdy zegarki zmienia się w różne dni.",
    },
  ],
};

export default pl;
