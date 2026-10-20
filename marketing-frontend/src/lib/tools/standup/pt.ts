import type { StandupContent } from "@/lib/tools/standup";

/** O modelo de daily (reunião diária), em português do Brasil. */
const pt: StandupContent = {
  meta: {
    title: "Modelo de Daily (Reunião Diária): Pauta e Versão Assíncrona Grátis",
    description:
      "Monte a pauta da daily no tempo certo para a sua equipe, ou um modelo de daily assíncrona para postar no Slack ou no Teams. Grátis, com três conjuntos de perguntas e um guia.",
  },
  eyebrow: "Ferramenta grátis",
  updated: "Atualizado em",
  title: "Modelo de <em>daily.</em>",
  intro:
    "Uma boa daily leva cerca de um minuto por pessoa e termina com todo mundo sabendo o que está acontecendo e quem está travado. Escolha o tamanho da equipe e como vocês se reúnem, numa chamada, por escrito ou passando pelo quadro, e receba uma pauta no tempo certo, ou um modelo para postar no chat da equipe.",
  builder: {
    team: "Tamanho da equipe",
    people: "{count} pessoas",
    format: "Como vocês se reúnem",
    formats: { live: "Numa chamada", async: "Por escrito (assíncrona)", board: "Passando pelo quadro" },
    questions: "Perguntas",
    sets: [
      { key: "classic", label: "Clássicas", questions: ["O que você fez ontem?", "O que você vai fazer hoje?", "Tem algo te travando?"] },
      { key: "focus", label: "Foco", questions: ["Qual é a sua prioridade de hoje?", "O que pode atrapalhar?", "De quem você precisa de ajuda?"] },
      { key: "progress", label: "Progresso", questions: ["O que avançou?", "Qual é o próximo passo?", "Algum risco que a gente precisa saber?"] },
    ],
    icebreaker: "Começar com um quebra-gelo de um minuto",
    minutes: "{count} minutos",
    agenda: "Pauta",
    template: "Modelo para postar",
    copy: "Copiar",
    copied: "Copiado",
    lines: {
      open: "Abertura: comece no horário, mesmo que alguém atrase",
      icebreaker: "Quebra-gelo: uma pergunta rápida, uma frase cada",
      round: "Rodada: cada pessoa responde, cerca de um minuto cada",
      column: "{column}: o que está travado, o que vem depois",
      blockers: "Bloqueios: combinem quem vai ajudar e conversem depois",
      close: "Encerramento: algo que todo mundo precisa saber",
    },
    columns: ["Bloqueado", "Em revisão", "Em andamento", "A seguir"],
    note: {
      live: "Cerca de um minuto por pessoa, um pouco menos numa equipe maior, mais um minuto para abrir e fechar. No máximo quinze minutos: passou disso, é uma reunião, não uma daily.",
      async: "Peça para todo mundo postar até o mesmo horário toda manhã, no próprio fuso, ler as atualizações dos outros e responder em uma thread a qualquer bloqueio.",
      board: "Passe pelo quadro da direita para a esquerda: primeiro o que está mais perto de pronto, para a equipe terminar as coisas antes de começar outras. Cinco minutos mais cerca de um por pessoa.",
    },
  },
  sections: [
    {
      title: "Para que serve a daily",
      body: [
        "A daily (ou reunião diária, também chamada de stand-up) é uma reunião curta, normalmente no começo do dia, em que cada pessoa da equipe diz no que está trabalhando e se algo está atrapalhando. Ela vem das equipes ágeis de software, onde se chama daily scrum, mas funciona para qualquer equipe pequena em que o trabalho de um depende do de outro.",
        "Ela não é um relatório para o gestor. A ideia é a equipe enxergar o dia junta: quem está fazendo o quê, onde dois trabalhos se encontram e quem precisa de ajuda. Se a daily destravou alguém, valeu a pena; se foi uma rodada de recitais que ninguém escuta, não valeu.",
      ],
    },
    {
      title: "Três jeitos de fazer",
      items: [
        {
          title: "Numa chamada",
          detail: "O clássico",
          body: "Todo mundo entra no mesmo horário e cada um responde às mesmas três perguntas. Melhor para equipes em fusos próximos que gostam de se ver uma vez por dia. Mantenha em cerca de um minuto por pessoa.",
        },
        {
          title: "Por escrito",
          detail: "Daily assíncrona",
          body: "Cada pessoa posta as respostas no chat da equipe até um horário combinado e lê as dos outros. Melhor para equipes em fusos diferentes, ou que já têm reuniões demais. Perde a conversa, então crie o hábito de responder a qualquer bloqueio.",
        },
        {
          title: "Passando pelo quadro",
          detail: "Primeiro o trabalho, depois as pessoas",
          body: "Em vez de fazer a rodada pelas pessoas, passe pelo quadro de tarefas, coluna por coluna, começando pelo que está mais perto de pronto. Melhor para equipes com um quadro movimentado, em que a pergunta é o que está travado, não o que cada um fez.",
        },
      ],
    },
    {
      title: "As três perguntas da daily",
      body: [
        "As três clássicas são o que você fez ontem, o que vai fazer hoje e se algo está te travando. Funcionam, mas convidam a uma lista de tudo o que a pessoa tocou. Se as suas dailies estão longas, experimente um conjunto mais direto:",
      ],
      items: [
        {
          title: "Clássicas",
          body: "O que você fez ontem? O que vai fazer hoje? Tem algo te travando? Todo mundo conhece, e funcionam bem para uma equipe nova.",
        },
        {
          title: "Foco",
          body: "Qual é a sua prioridade de hoje? O que pode atrapalhar? De quem você precisa de ajuda? Respostas mais curtas, e a última pergunta transforma bloqueios em pedidos.",
        },
        {
          title: "Progresso",
          body: "O que avançou? Qual é o próximo passo? Algum risco? Sobre o trabalho, não sobre a pessoa, e combinam com passar pelo quadro.",
        },
      ],
    },
    {
      title: "Pauta de daily, minuto a minuto",
      body: [
        "Para uma equipe de seis numa chamada, a daily leva uns oito minutos. Comece no horário, mesmo que alguém atrase: esperar ensina todo mundo a atrasar. Depois faça a rodada numa ordem fixa, a ordem em que as pessoas aparecem na tela ou alfabética, para ninguém ficar se perguntando quando é a sua vez.",
        "Quando alguém mencionar um problema, não resolva na daily. Anote quem pode ajudar e combinem de conversar logo depois, só com quem precisa estar. Esse hábito é o que mantém a daily em dez minutos. Feche perguntando se há algo que todo mundo precisa saber e encerre a chamada.",
      ],
      table: {
        head: ["Tamanho da equipe", "Numa chamada", "Passando pelo quadro"],
        rows: [
          ["3 pessoas", "5 minutos", "8 minutos"],
          ["6 pessoas", "8 minutos", "11 minutos"],
          ["8 pessoas", "10 minutos", "13 minutos"],
          ["12 pessoas", "11 minutos", "15 minutos"],
          ["15 pessoas", "14 minutos", "15 minutos"],
        ],
        note: "Calculado como a ferramenta acima faz: cerca de um minuto por pessoa (três quartos de minuto acima de oito pessoas) mais dois para abrir e fechar, e nunca mais de quinze.",
      },
    },
    {
      title: "Como fazer uma daily assíncrona",
      body: [
        "Uma daily assíncrona são as mesmas três perguntas, respondidas por escrito. Escolha um canal e um horário, por exemplo 10h no fuso de cada pessoa, e peça para todos postarem as respostas numa única mensagem, usando o modelo acima para ficar fácil de ler.",
        "Duas coisas fazem funcionar. Primeiro, ler as atualizações dos outros; uma daily assíncrona que ninguém lê é um diário. Segundo, responder em uma thread a qualquer bloqueio, no mesmo dia. Algumas equipes mantêm uma chamada curta por semana além disso, para todo mundo continuar se vendo.",
      ],
    },
    {
      title: "Erros comuns na daily",
      items: [
        { title: "Vira resolução de problemas", body: "Alguém levanta um problema e três pessoas começam a resolver. Anote, combine quem conversa depois e siga em frente." },
        { title: "É um relatório para o gestor", body: "Se todo mundo olha para o líder enquanto fala, a daily é para a pessoa errada. Fale com a equipe." },
        { title: "Gente demais", body: "Acima de umas doze pessoas, ninguém escuta todo mundo. Divida em dailies menores por projeto ou frente de trabalho." },
        { title: "Começar atrasado", body: "Esperar cinco minutos pela última pessoa custa cinco minutos de todos os outros, todo dia. Comece no horário." },
        { title: "Dizer \"sem bloqueios\" todo dia", body: "Se ninguém nunca está travado, faça uma pergunta mais direta: \"O que pode atrapalhar a sua prioridade hoje?\" costuma achar alguma coisa." },
      ],
    },
  ],
  fit: {
    title: "Faça a daily no escritório",
    body: "O TinyFloor é um escritório virtual para equipes pequenas: você vê quem está na mesa, e a daily é uma caminhada até a sala de reuniões em vez de mais um link. Depois, vá até quem está travado. Funciona numa aba do navegador, grátis para até 3 pessoas e US$ 29 por mês para a equipe toda.",
    cta: "Conhecer o escritório de demonstração",
  },
  faqTitle: "Perguntas <em>frequentes.</em>",
  faq: [
    {
      q: "Quais são as três perguntas da daily?",
      a: "O que você fez ontem? O que vai fazer hoje? Tem algo te travando? Uma versão mais direta: Qual é a sua prioridade de hoje? O que pode atrapalhar? De quem você precisa de ajuda?",
    },
    {
      q: "Quanto tempo deve durar uma daily?",
      a: "Cerca de um minuto por pessoa, mais um ou dois para abrir e fechar: uns oito minutos para uma equipe de seis. No máximo quinze.",
    },
    {
      q: "O que é um modelo de daily?",
      a: "Uma pauta fixa para a reunião, ou um formato de mensagem para a daily por escrito: as mesmas três perguntas, na mesma ordem, todo dia, para as atualizações serem rápidas de dar e fáceis de ler.",
    },
    {
      q: "O que é uma daily assíncrona?",
      a: "Uma daily feita por escrito: cada pessoa posta as respostas às três perguntas no chat da equipe até um horário combinado e lê as dos outros. Funciona bem para equipes em fusos diferentes.",
    },
    {
      q: "A daily é só para equipes de scrum?",
      a: "Não. Ela vem das equipes ágeis de software, onde se chama daily scrum, mas qualquer equipe pequena em que o trabalho de um depende do de outro pode usar.",
    },
    {
      q: "Esta ferramenta de daily é grátis?",
      a: "Sim, e funciona inteira no seu navegador: nada do que você escolhe é enviado para lugar nenhum. Copie a pauta ou o modelo para o convite da agenda ou para o chat da equipe.",
    },
  ],
};

export default pt;
