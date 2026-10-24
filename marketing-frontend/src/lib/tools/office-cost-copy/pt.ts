import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const pt: OfficeCostsContent = {
  meta: {
    title: "Calculadora de custo de escritório virtual: quanto 10 ferramentas custam para sua equipe",
    description:
      "Informe o tamanho da sua equipe e veja quanto Gather, SoWork, Spot, Kumospace, WorkAdventure, SpatialChat, Roam, oVice, Sococo e TinyFloor custam por mês, com cobrança anual ou mensal, pela página de preços de cada um.",
  },
  eyebrow: "Ferramentas grátis",
  updated: "Preços verificados em",
  title: "Quanto um escritório virtual <em>custa para sua equipe.</em>",
  intro:
    "A maioria dos escritórios virtuais cobra por pessoa, alguns por espaço ou por escritório, e os planos gratuitos param em tamanhos diferentes. Informe quantas pessoas há na sua equipe para ver quanto cada uma de dez ferramentas custa por mês, da mais barata à mais cara.",
  calculator: {
    people: "Pessoas na equipe",
    count: "{count} pessoas",
    billing: { yearly: "Cobrança anual", monthly: "Cobrança mensal" },
    product: "Produto",
    free: "Plano gratuito",
    price: "Plano pago",
    perMonth: "{amount} por mês",
    perYear: "{amount} por ano",
    only: { yearly: "só anual", monthly: "só mensal" },
    noFree: "Sem plano gratuito",
    fits: "Grátis neste tamanho",
    upTo: "Até {count} pessoas",
    pricingPage: "Página de preços",
    basis: {
      office: "Um preço pelo escritório",
      member: "Por membro",
      activeMember: "Por membro ativo",
      space: "Por espaço",
      seat: "Por assento, mínimo de 10",
    },
    limits: {
      everyFeature: "todos os recursos",
      thirtyMinutes: "reuniões de 30 minutos",
      oneFloor: "um andar",
      atOnce: "ao mesmo tempo",
      twoHours: "2 horas por dia",
      preRelease: "versão prévia, sem suporte",
    },
    summary: "Para {count} pessoas, os planos por pessoa vão de {low} a {high} por mês. O TinyFloor custa {tinyfloor}.",
    summaryLarge: "Para {count} pessoas, os planos por pessoa vão de {low} a {high} por mês.",
  },
  sections: [
    {
      title: "Como os escritórios virtuais cobram",
      body: ["De quatro formas, e a forma que uma ferramenta usa decide quanto uma equipe em crescimento paga mais do que o preço de vitrine."],
      items: [
        {
          title: "Por membro",
          detail: "Gather, SoWork, Spot, Kumospace, WorkAdventure, SpatialChat",
          body: "Você paga por todos que têm conta, todo mês, entrando ou não. A conta cresce a cada contratação: uma equipe de 10 paga o dobro de uma equipe de 5.",
        },
        {
          title: "Por membro ativo",
          detail: "Roam",
          body: "Você paga pelas pessoas que usaram no mês. Quem está de licença não custa nada, mas a maioria das equipes está ativa todo mês, então na prática funciona como por membro.",
        },
        {
          title: "Por espaço ou por bloco de assentos",
          detail: "oVice, Sococo",
          body: "Você paga por um espaço dimensionado para um número de pessoas, ou por um bloco mínimo de assentos. Barato se sua equipe o preenche, caro se não: o Sococo cobra 10 assentos mesmo que vocês sejam 4.",
        },
        {
          title: "Um preço pelo escritório",
          detail: "TinyFloor",
          body: "Um preço só, seja qual for o número de pessoas, até o tamanho que o plano comporta. Adicionar alguém não custa nada, então ninguém precisa decidir se um freelancer vale um assento.",
        },
      ],
    },
    {
      title: "Cobrança anual ou mensal",
      body: [
        "A maioria das ferramentas por pessoa dá de 10 a 20% de desconto para quem paga um ano adiantado: o Gather custa US$ 12 por membro na cobrança anual e US$ 15 na mensal. É um compromisso de um ano para uma equipe cujo tamanho pode mudar, e o desconto se perde se vocês saírem depois de três meses.",
        "Algumas cobram de um jeito só: Roam e TinyFloor cobram por mês, Sococo por ano. A calculadora mostra essas pelo preço que têm e avisa.",
      ],
    },
  ],
  table: {
    title: "Quanto uma equipe de 5, 10 ou 15 paga por mês",
    body: [
      "Os mesmos preços em três tamanhos comuns, com cobrança anual onde a ferramenta oferece, já que é o preço mais baixo. Planos gratuitos não entram aqui; a calculadora acima mostra quais servem.",
    ],
    product: "Produto",
    note: "Preços em dólares americanos, sem impostos, da página de preços de cada produto. O Sococo cobra no mínimo 10 assentos; o oVice passa do Entry-S para o Entry-M a partir de uns 10 membros regulares.",
  },
  after: [
    {
      title: "Quando um plano gratuito basta",
      body: [
        "Um plano gratuito que cabe sua equipe inteira ganha de qualquer plano pago, então confira os limites antes do preço. O do SoWork cobre 10 membros, mas encerra toda reunião em 30 minutos. O do WorkAdventure cobre 10 pessoas online ao mesmo tempo. O do SpatialChat dá a 12 pessoas duas horas de reunião por dia, o que serve para uma sessão semanal, não para um escritório aberto o dia todo. O do Kumospace cobre 5 membros em um andar, e o do TinyFloor 3 pessoas com todos os recursos. O plano gratuito do oVice roda em uma versão prévia, sem suporte.",
      ],
    },
    {
      title: "O que o preço não mostra",
      items: [
        {
          title: "O que vem no plano",
          body: "O plano mais barato nem sempre é o que vocês usariam. O SoWork Basic tem duas gravações de reunião; gravações e notas com IA ficam no Premium, a US$ 12 por membro. O Gather inclui gravação e transcrição. O TinyFloor não tem gravações nem notas com IA.",
        },
        {
          title: "Convidados",
          body: "Clientes e freelancers que aparecem de vez em quando podem contar como membros em algumas ferramentas. Gather e oVice deixam convidar visitantes sem pagar por eles; confira antes de adicionar quem só visita.",
        },
        { title: "Impostos", body: "Todos os preços aqui são sem impostos. Dependendo de onde vocês estão, IVA ou imposto sobre vendas é somado no checkout." },
        {
          title: "Testes",
          body: "O Gather e o Spot têm um teste de 30 dias, Roam e oVice 14 dias, SoWork 7 dias. O teste diz se a equipe vai usar; o preço diz se vocês vão continuar pagando.",
        },
      ],
    },
    {
      title: "Como verificamos",
      body: [
        "Cada preço vem da página de preços do próprio produto, com link na calculadora, lida no mês indicado no topo. Usamos o plano que uma equipe pequena compraria para um escritório aberto o dia todo, não planos de eventos ou corporativos. Onde a página dá só um período de cobrança, mostramos esse. Preços mudam, então confira a página de preços antes de comprar; revisamos a cada poucos meses.",
      ],
    },
  ],
  fit: {
    title: "Um preço para a equipe inteira",
    body: "O TinyFloor é um escritório no navegador para equipes pequenas: você vai até alguém para conversar, tem sala de reunião, chat e compartilhamento de tela. É grátis para até 3 pessoas e US$ 29 por mês para a equipe inteira depois disso, não importa quantos vocês sejam. Não tem gravações nem notas com IA; se vocês precisam disso, Gather ou SoWork Premium vão servir melhor.",
    cta: "Experimente o escritório de demonstração",
  },
  faqTitle: "Perguntas <em>frequentes.</em>",
  faq: [
    {
      q: "Quanto custa um escritório virtual por mês?",
      a: "Para uma equipe de 10 em um plano pago, de US$ 29 a US$ 195 por mês, conforme a ferramenta: o TinyFloor custa US$ 29 pelo escritório inteiro, e as ferramentas por pessoa vão de US$ 48 (Spot Basic, cobrança anual) a US$ 195 (Roam).",
    },
    {
      q: "Qual é o escritório virtual mais barato para uma equipe pequena?",
      a: "Um plano gratuito que sirva: o do SoWork cobre 10 membros com reuniões de 30 minutos, o do WorkAdventure 10 pessoas ao mesmo tempo, o do Kumospace 5 membros e o do TinyFloor 3 pessoas. Acima disso, o TinyFloor, a US$ 29 por mês pela equipe inteira, é o menor preço pago a partir de 7 pessoas.",
    },
    {
      q: "O Gather é grátis?",
      a: "Não. O Gather encerrou o plano gratuito em 2025. Depois de um teste de 30 dias, custa US$ 12 por membro por mês na cobrança anual ou US$ 15 na mensal, então uma equipe de 10 paga de US$ 120 a US$ 150 por mês.",
    },
    {
      q: "É melhor preço por pessoa ou preço fixo?",
      a: "Por pessoa sai mais barato para uma equipe de 2 ou 3, em que o preço por cabeça é pequeno. O preço fixo ganha conforme a equipe cresce, e nunca cobra mais por adicionar um freelancer ou uma nova contratação.",
    },
    {
      q: "Os preços de escritório virtual incluem impostos?",
      a: "Não. Os preços nas páginas de preços das ferramentas, e aqui, são sem impostos; IVA ou imposto sobre vendas é somado no checkout, conforme onde vocês estão.",
    },
  ],
};

export default pt;
