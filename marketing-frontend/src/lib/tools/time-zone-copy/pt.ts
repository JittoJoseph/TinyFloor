import type { TimeZonesContent } from "@/lib/tools/time-zones";

const pt: TimeZonesContent = {
  meta: {
    title: "Planejador de reuniões por fuso horário para equipes remotas",
    description:
      "Adicione a cidade e o horário de trabalho de cada pessoa da equipe para ver quando todos estão trabalhando ao mesmo tempo, ou o horário que serve para mais gente quando nenhum serve para todos. Considera o horário de verão e meias horas, como na Índia.",
  },
  eyebrow: "Ferramentas grátis",
  updated: "Atualizado em",
  title: "Quando os horários da sua equipe <em>se cruzam.</em>",
  intro:
    "Adicione a cidade e o horário de trabalho de cada pessoa. O planejador mostra as horas em que todos estão trabalhando ao mesmo tempo, no horário de cada um, e, quando nenhuma hora serve para todos, a que serve para mais gente. Ele usa os fusos de hoje, então o horário de verão entra na conta.",
  planner: {
    zone: "Fuso horário",
    hours: "Horário de trabalho",
    remove: "Remover",
    add: "Adicionar pessoa",
    addMine: "Adicionar meu fuso",
    timesIn: "Horários em {city}",
    working: "Trabalhando",
    all: "Todos",
    everyone: "Todos estão trabalhando das {from} às {to}, horário de {city}.",
    best: "Nenhum horário serve para todos. Das {from} às {to}, horário de {city}, serve para {count} de {total}.",
    nobody: "Os horários de trabalho não se cruzam.",
    eachLocal: "No horário de cada pessoa:",
  },
  sections: [
    {
      title: "Quanto tempo em comum uma equipe precisa",
      body: [
        "Menos do que parece. Duas a quatro horas em comum por dia bastam para uma daily, para as perguntas que são mais rápidas de fazer do que de escrever e para uma reunião quando for preciso. O resto pode acontecer por escrito, no horário de cada um.",
        "O que pesa é não ter nenhuma hora em comum, ou ter só porque alguém trabalha às 7h ou às 22h todo dia. Se o planejador mostra um trecho em comum só no limite do dia de alguém, é essa pessoa que está pagando pelas reuniões da equipe.",
      ],
    },
    {
      title: "Como achar um horário justo",
      items: [
        {
          title: "Reúna-se dentro das horas em comum",
          body: "Coloque a daily e as reuniões recorrentes no trecho que o planejador mostra, e deixe o resto das horas em comum livre para perguntas rápidas. Tempo em comum é o que uma equipe distribuída tem de mais escasso.",
        },
        {
          title: "Reveze o horário ruim",
          body: "Quando o único horário possível é cedo para uns e tarde para outros, alterne semana a semana, para que não sejam sempre as mesmas pessoas entrando à noite.",
        },
        {
          title: "Menos reuniões, e mais curtas",
          body: "Uma daily de 15 minutos cabe em quase qualquer sobreposição; uma reunião de uma hora, em geral, não. Pergunte se a reunião poderia ser uma atualização por escrito antes de procurar horário para ela.",
        },
        {
          title: "Anote o resultado",
          body: "Quem não pôde ir deve conseguir se atualizar em dois minutos: algumas linhas com o que foi decidido e quem faz o quê, publicadas onde a equipe já lê.",
        },
        {
          title: "Mostre seu horário",
          body: "Coloque seu horário de trabalho na agenda e no status, para ninguém precisar calcular se é uma boa hora para te perguntar algo.",
        },
      ],
    },
    {
      title: "Quando não há horário em comum",
      items: [
        { title: "Daily por escrito", body: "Cada pessoa publica o que fez, o que vem a seguir e o que está travando no começo do seu dia. Os outros leem no começo do deles." },
        { title: "Duas reuniões menores", body: "Divida a equipe por região nas reuniões ao vivo, com uma pessoa nas duas, ou as notas compartilhadas, para levar o que importa de um lado ao outro." },
        { title: "Passe o bastão no fim do dia", body: "Quando a noite de uma pessoa é a manhã de outra, uma nota curta no fim do dia deixa o trabalho andar enquanto a primeira dorme." },
        { title: "Uma hora em comum por semana", body: "Mesmo uma equipe sem sobreposição diária consegue achar uma hora por semana em que todos se esticam um pouco, revezando quem se estica mais." },
      ],
    },
    {
      title: "O horário de verão muda a sobreposição",
      body: [
        "Os relógios mudam em datas diferentes em cada lugar, então as horas em comum de uma equipe podem mudar uma hora por algumas semanas a cada primavera e outono. Os EUA mudam no segundo domingo de março e no primeiro de novembro; a Europa no último domingo de março e de outubro. Austrália, Nova Zelândia e Chile mudam ao contrário, na primavera deles. Índia, China, Japão, Brasil e México não mudam.",
        "O planejador calcula o fuso de cada cidade para hoje, então confira de novo perto dessas datas se a sobreposição da sua equipe for apertada.",
      ],
    },
    {
      title: "Como ele calcula",
      body: [
        "Ele pega o dia, em meias horas, no horário da primeira pessoa, calcula que horas são para cada uma das outras com os dados de fuso horário do seu navegador e conta quem está dentro do horário de trabalho. As meias horas importam para a Índia, que está cinco horas e meia à frente do UTC. Horários que passam da meia-noite, como das 22h às 6h, também funcionam, e tudo roda no seu navegador.",
      ],
    },
  ],
  fit: {
    title: "Aproveite as horas em comum",
    body: "O TinyFloor é um escritório virtual para equipes remotas. Nas horas que vocês têm em comum, todos que estão online ficam no mesmo andar, e uma pergunta é ir até a mesa de alguém em vez de marcar uma chamada. É grátis para até 3 pessoas e US$ 29 por mês para a equipe inteira.",
    cta: "Experimente o escritório de demonstração",
  },
  faqTitle: "Perguntas <em>frequentes.</em>",
  faq: [
    {
      q: "Como encontrar um horário de reunião entre fusos horários?",
      a: "Liste a cidade e o horário de trabalho de cada pessoa e procure as meias horas em que todos estão trabalhando ao mesmo tempo. O planejador acima faz isso para até 12 pessoas e mostra o resultado no horário de cada uma.",
    },
    {
      q: "Quantas horas em comum uma equipe remota precisa?",
      a: "Duas a quatro horas por dia bastam para a maioria das equipes: o suficiente para uma daily, perguntas rápidas e uma reunião de vez em quando. O resto pode ser escrito e feito no horário de cada um.",
    },
    {
      q: "Qual é um horário justo para uma reunião entre fusos?",
      a: "Um que esteja dentro do horário de trabalho de todos. Se não houver, reveze o horário cedo ou tarde semana a semana, para que não sejam sempre as mesmas pessoas a pegá-lo.",
    },
    {
      q: "E se a minha equipe não tiver nenhum horário em comum?",
      a: "Trabalhe por escrito: daily escrita no começo do dia de cada um, uma nota de passagem no fim dele e reuniões ao vivo divididas por região. A maioria das equipes ainda consegue uma hora em comum por semana.",
    },
    {
      q: "O planejador considera o horário de verão?",
      a: "Sim. Ele usa o fuso de cada cidade para hoje, pelos dados de fuso horário do seu navegador, então o horário de verão entra na conta. Confira de novo no fim de março e no fim de outubro, quando os relógios mudam em datas diferentes.",
    },
  ],
};

export default pt;
