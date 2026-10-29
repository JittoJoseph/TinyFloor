import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const pl: OfficeCostsContent = {
  meta: {
    title: "Kalkulator kosztów wirtualnego biura: ile 10 narzędzi kosztuje twój zespół",
    description:
      "Podaj wielkość zespołu i zobacz, ile miesięcznie kosztują Gather, SoWork, Spot, Kumospace, WorkAdventure, SpatialChat, Roam, oVice, Sococo i TinyFloor, przy płatności rocznej lub miesięcznej, według cennika każdego z nich.",
  },
  eyebrow: "Darmowe narzędzia",
  updated: "Ceny sprawdzone",
  title: "Ile wirtualne biuro <em>kosztuje twój zespół.</em>",
  intro:
    "Większość wirtualnych biur liczy za osobę, kilka za przestrzeń albo za biuro, a darmowe plany kończą się na różnych wielkościach. Podaj, ile osób jest w twoim zespole, żeby zobaczyć, ile miesięcznie kosztuje każde z dziesięciu narzędzi, od najtańszego.",
  calculator: {
    people: "Osoby w zespole",
    count: "Osoby: {count}",
    billing: { yearly: "Płatność roczna", monthly: "Płatność miesięczna" },
    product: "Produkt",
    free: "Darmowy plan",
    price: "Płatny plan",
    perMonth: "{amount} miesięcznie",
    perYear: "{amount} rocznie",
    only: { yearly: "tylko rocznie", monthly: "tylko miesięcznie" },
    noFree: "Brak darmowego planu",
    fits: "Za darmo przy tej wielkości",
    upTo: "Do {count} osób",
    pricingPage: "Cennik",
    basis: {
      office: "Jedna cena za biuro",
      member: "Za członka",
      activeMember: "Za aktywnego członka",
      space: "Za przestrzeń",
      seat: "Za miejsce, co najmniej 10",
    },
    limits: {
      everyFeature: "wszystkie funkcje",
      thirtyMinutes: "spotkania do 30 minut",
      oneFloor: "jedno piętro",
      atOnce: "jednocześnie",
      twoHours: "2 godziny dziennie",
      preRelease: "wersja przedpremierowa, bez wsparcia",
    },
    summary: "Dla zespołu ({count} os.) plany za osobę kosztują od {low} do {high} miesięcznie. TinyFloor kosztuje {tinyfloor}.",
    summaryLarge: "Dla zespołu ({count} os.) plany za osobę kosztują od {low} do {high} miesięcznie.",
  },
  sections: [
    {
      title: "Jak liczą wirtualne biura",
      body: ["Na cztery sposoby, a to, który stosuje narzędzie, bardziej niż cena wywoławcza decyduje, ile zapłaci rosnący zespół."],
      items: [
        {
          title: "Za członka",
          detail: "Gather, SoWork, Spot, Kumospace, WorkAdventure, SpatialChat",
          body: "Płacisz co miesiąc za każdego, kto ma konto, czy wchodzi, czy nie. Rachunek rośnie z każdą nową osobą: zespół 10 osób płaci dwa razy tyle co zespół 5 osób.",
        },
        {
          title: "Za aktywnego członka",
          detail: "Roam",
          body: "Płacisz za osoby, które korzystały w danym miesiącu. Ktoś na urlopie nic nie kosztuje, ale większość zespołów jest aktywna co miesiąc, więc w praktyce działa to jak opłata za członka.",
        },
        {
          title: "Za przestrzeń albo pakiet miejsc",
          detail: "oVice, Sococo",
          body: "Płacisz za przestrzeń przewidzianą dla określonej liczby osób albo za minimalny pakiet miejsc. Tanio, jeśli zespół ją wypełnia, drogo, jeśli nie: Sococo liczy 10 miejsc, nawet jeśli jest was czworo.",
        },
        {
          title: "Jedna cena za biuro",
          detail: "TinyFloor",
          body: "Jedna cena bez względu na liczbę osób, do wielkości, jaką obejmuje plan. Dodanie kogoś nic nie kosztuje, więc nikt nie musi decydować, czy osoba na zleceniu jest warta miejsca.",
        },
      ],
    },
    {
      title: "Płatność roczna czy miesięczna",
      body: [
        "Większość narzędzi liczących za osobę daje 10–20% zniżki za zapłatę z góry za rok: Gather kosztuje 12 $ za członka przy płatności rocznej i 15 $ przy miesięcznej. To roczne zobowiązanie dla zespołu, którego wielkość może się zmienić, a zniżka przepada, jeśli zrezygnujecie po trzech miesiącach.",
        "Niektóre rozliczają się tylko na jeden sposób: Roam i TinyFloor miesięcznie, Sococo rocznie. Kalkulator pokazuje je w cenie, jaką mają, i to zaznacza.",
      ],
    },
  ],
  table: {
    title: "Ile miesięcznie płaci zespół 5, 10 albo 15 osób",
    body: [
      "Te same ceny przy trzech typowych wielkościach, przy płatności rocznej tam, gdzie narzędzie ją oferuje, bo to niższa cena. Darmowe plany nie są tu liczone; kalkulator powyżej pokazuje, które pasują.",
    ],
    product: "Produkt",
    note: "Ceny w dolarach amerykańskich bez podatku, z cennika każdego produktu. Sococo liczy co najmniej 10 miejsc; oVice przechodzi z Entry-S na Entry-M powyżej około 10 stałych członków.",
  },
  after: [
    {
      title: "Kiedy wystarczy darmowy plan",
      body: [
        "Darmowy plan, w którym mieści się cały zespół, wygrywa z każdym płatnym, więc sprawdź limity przed ceną. Plan SoWork obejmuje 10 członków, ale kończy każde spotkanie po 30 minutach. Plan WorkAdventure obejmuje 10 osób online jednocześnie. Plan SpatialChat daje 12 osobom dwie godziny spotkań dziennie, co wystarczy na cotygodniowe spotkanie, ale nie na biuro otwarte cały dzień. Plan Kumospace obejmuje 5 członków na jednym piętrze, a plan TinyFloor 3 osoby ze wszystkimi funkcjami. Darmowy plan oVice działa na wersji przedpremierowej bez wsparcia.",
      ],
    },
    {
      title: "Czego cena nie pokazuje",
      items: [
        {
          title: "Co jest w planie",
          body: "Najtańszy plan nie zawsze jest tym, którego byście używali. SoWork Basic ma dwa nagrania spotkań; nagrania i notatki AI są w Premium, za 12 $ za członka. Gather zawiera nagrywanie i transkrypcję. TinyFloor nie ma nagrań ani notatek AI.",
        },
        {
          title: "Goście",
          body: "Klienci i osoby na zleceniu, które wpadają od czasu do czasu, w niektórych narzędziach liczą się jako członkowie. Gather i oVice pozwalają zapraszać gości bez płacenia za nich; sprawdź to, zanim dodasz osoby, które tylko odwiedzają.",
        },
        { title: "Podatek", body: "Wszystkie ceny tutaj są bez podatku. W zależności od tego, gdzie jesteście, przy płatności doliczany jest VAT albo podatek od sprzedaży." },
        {
          title: "Okresy próbne",
          body: "Gather i Spot mają 30-dniowy okres próbny, Roam i oVice 14 dni, SoWork 7 dni. Okres próbny powie wam, czy zespół będzie z tego korzystał; cena, czy będziecie dalej płacić.",
        },
      ],
    },
    {
      title: "Jak sprawdzaliśmy",
      body: [
        "Każda cena pochodzi z cennika samego produktu, podlinkowanego w kalkulatorze, odczytanego w miesiącu podanym na górze. Bierzemy plan, który mały zespół kupiłby dla biura otwartego cały dzień, a nie plany na wydarzenia czy dla dużych firm. Gdy cennik podaje tylko jeden okres rozliczeniowy, pokazujemy ten. Ceny się zmieniają, więc sprawdź cennik przed zakupem; my sprawdzamy ponownie co kilka miesięcy.",
      ],
    },
  ],
  fit: {
    title: "Jedna cena dla całego zespołu",
    body: "TinyFloor to biuro w przeglądarce dla zespołów zdalnych: podchodzisz do kogoś, żeby porozmawiać, jest sala spotkań, czat i udostępnianie ekranu. Jest za darmo do 3 osób, a potem kosztuje 29 $ miesięcznie za cały zespół, bez względu na to, ilu was jest. Nie ma nagrań ani notatek AI; jeśli ich potrzebujecie, lepiej sprawdzą się Gather albo SoWork Premium.",
    cta: "Wypróbuj biuro demo",
  },
  faqTitle: "Częste <em>pytania.</em>",
  faq: [
    {
      q: "Ile kosztuje wirtualne biuro miesięcznie?",
      a: "Dla zespołu 10 osób na płatnym planie od 29 $ do 195 $ miesięcznie, zależnie od narzędzia: TinyFloor kosztuje 29 $ za całe biuro, a narzędzia liczące za osobę od 48 $ (Spot Basic, płatność roczna) do 195 $ (Roam).",
    },
    {
      q: "Jakie jest najtańsze wirtualne biuro dla małego zespołu?",
      a: "Darmowy plan, który pasuje: plan SoWork obejmuje 10 członków ze spotkaniami do 30 minut, WorkAdventure 10 osób jednocześnie, Kumospace 5 członków, a TinyFloor 3 osoby. Powyżej tego TinyFloor, za 29 $ miesięcznie za cały zespół, to najniższa płatna cena od 7 osób w górę.",
    },
    {
      q: "Czy Gather jest darmowy?",
      a: "Nie. Gather zrezygnował z darmowego planu w 2025 roku. Po 30-dniowym okresie próbnym kosztuje 12 $ za członka miesięcznie przy płatności rocznej albo 15 $ przy miesięcznej, więc zespół 10 osób płaci od 120 $ do 150 $ miesięcznie.",
    },
    {
      q: "Lepsza cena za osobę czy stała cena?",
      a: "Cena za osobę wychodzi taniej dla zespołu 2 lub 3 osób, gdzie koszt na głowę jest niewielki. Stała cena wygrywa, gdy zespół rośnie, i nigdy nie kosztuje więcej, gdy dodajecie osobę na zleceniu albo nowego pracownika.",
    },
    {
      q: "Czy ceny wirtualnych biur zawierają podatek?",
      a: "Nie. Ceny w cennikach narzędzi, i tutaj, są bez podatku; VAT albo podatek od sprzedaży doliczany jest przy płatności, zależnie od tego, gdzie jesteście.",
    },
  ],
};

export default pl;
