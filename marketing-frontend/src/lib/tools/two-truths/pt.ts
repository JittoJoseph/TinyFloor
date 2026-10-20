import type { IcebreakersContent } from "@/lib/tools/icebreakers";

/** Ideias de "duas verdades e uma mentira", em português do Brasil. */
const pt: IcebreakersContent = {
  groups: [
    {
      key: "skills",
      label: "Habilidades",
      title: "Ideias de duas verdades e uma mentira sobre habilidades",
      when: "Coisas que você sabe ou não sabe fazer. Fáceis de inventar e difíceis de adivinhar, porque qualquer um pode ter aprendido qualquer coisa.",
      questions: [
        "Eu sei montar um cubo mágico.",
        "Eu digito sem olhar para o teclado mais rápido do que muita gente fala.",
        "Eu sei fazer malabarismo com três bolinhas.",
        "Eu sei assobiar com os dedos.",
        "Aprendi a tocar um instrumento sozinho, vendo vídeos na internet.",
        "Eu sei o nome de todas as capitais da Europa.",
        "Eu nunca aprendi a andar de bicicleta.",
        "Eu desenho um retrato razoável em cinco minutos.",
        "Eu sei dizer \"olá\" em mais de dez línguas.",
        "Eu sei fazer um prato perfeito e mais nada.",
        "Eu sei plantar bananeira.",
        "Eu já ganhei um concurso de soletrar.",
        "Eu sei recitar de cor a primeira página de um livro.",
        "Eu não sei nadar.",
        "Eu consigo encostar a língua no nariz.",
        "Eu sei tricotar.",
        "Eu sei ler partitura, mas não toco nada.",
        "Eu durmo em qualquer lugar em menos de um minuto.",
      ],
    },
    {
      key: "experiences",
      label: "Experiências",
      title: "Ideias de duas verdades e uma mentira sobre coisas que você já fez",
      when: "Pequenas histórias que parecem improváveis. As melhores são verdadeiras e a equipe tem certeza de que são a mentira.",
      questions: [
        "Eu já apareci ao vivo na televisão.",
        "Eu já me perdi numa cidade por um dia inteiro.",
        "Eu já corri uma meia maratona.",
        "Eu conheci uma pessoa famosa e só reconheci depois.",
        "Eu já fui a um show sozinho.",
        "Eu já dormi num aeroporto.",
        "Eu já vi a aurora boreal.",
        "Eu participei de uma peça na escola e esqueci todas as falas.",
        "Eu já subi uma montanha de mais de 3.000 metros.",
        "Eu já ganhei um prêmio numa rifa que nem lembrava de ter comprado.",
        "Eu já andei de camelo.",
        "Eu já fiquei preso num elevador por mais de uma hora.",
        "Eu já comi algo tão apimentado que tive que sair da mesa.",
        "Eu já montei um móvel sem o manual, e ele ficou em pé.",
        "Eu já fui a um casamento onde não conhecia ninguém.",
        "Eu já passei um ano inteiro sem comprar roupa nova.",
        "Eu já me apresentei num palco para mais de cem pessoas.",
        "Eu já fiquei acordado por mais de 24 horas.",
      ],
    },
    {
      key: "work",
      label: "Trabalho",
      title: "Ideias de duas verdades e uma mentira sobre trabalho",
      when: "Sobre empregos que você já teve e como você trabalha. Boas para uma equipe nova, porque todo mundo descobre um pouco da trajetória dos outros.",
      questions: [
        "Meu primeiro emprego foi num restaurante.",
        "Eu já respondi para todos da empresa sem querer.",
        "Eu já trabalhei em três países diferentes.",
        "Eu já tive um emprego em que precisava usar fantasia.",
        "Eu nunca consegui um emprego por anúncio de vaga.",
        "Eu já dormi numa reunião.",
        "Eu já mudei completamente de carreira pelo menos uma vez.",
        "Meu primeiro computador é mais velho que algumas pessoas desta chamada.",
        "Eu já fiz uma entrevista de emprego dentro de um carro.",
        "Eu já trabalhei no turno da noite.",
        "Eu estudei algo que não tem nada a ver com o meu trabalho.",
        "Eu já fiz uma apresentação sem slides porque o notebook morreu.",
        "Eu já trabalhei numa empresa com mais de 10.000 pessoas.",
        "Eu já mandei um e-mail para a pessoa errada e acabou dando certo.",
        "Eu já trabalhei de mais de dez cidades diferentes.",
        "Eu guardo todos os cadernos que já usei no trabalho.",
      ],
    },
    {
      key: "habits",
      label: "Comida e hábitos",
      title: "Ideias de duas verdades e uma mentira sobre comida e hábitos",
      when: "Coisas do dia a dia. Sem risco nenhum e surpreendentemente difíceis de adivinhar, o que deixa a rodada rápida.",
      questions: [
        "Eu nunca tomei uma xícara de café.",
        "Eu tomo o mesmo café da manhã todos os dias.",
        "Eu não gosto de chocolate.",
        "Eu coloco sal na fruta.",
        "Eu acordo antes das 6h sem despertador.",
        "Eu nunca vi nenhum filme de uma saga famosa.",
        "Meu celular fica no silencioso o tempo todo.",
        "Eu já comi insetos de propósito.",
        "Eu não suporto o barulho de chiclete.",
        "Eu leio a última página de um livro primeiro.",
        "Eu tenho mais de 50 plantas.",
        "Eu nunca quebrei um osso.",
        "Eu dou nome para as minhas plantas.",
        "Eu já assisti à mesma série do começo ao fim mais de cinco vezes.",
        "Eu durmo de meia.",
        "Eu nunca andei de montanha-russa.",
      ],
    },
  ],
  meta: {
    title: "Duas Verdades e uma Mentira: 68 Ideias para o Trabalho e Equipes Remotas",
    description:
      "68 ideias de duas verdades e uma mentira para o trabalho, sobre habilidades, experiências, empregos e hábitos, e como jogar numa chamada de vídeo ou no chat. Sorteie uma.",
  },
  eyebrow: "Ferramenta grátis",
  updated: "Atualizado em",
  title: "Duas verdades e uma mentira: <em>ideias para o trabalho.</em>",
  intro:
    "Duas verdades e uma mentira é o jogo de equipe mais fácil que existe: cada pessoa diz três coisas sobre si mesma, e o resto tenta adivinhar qual é inventada. A parte difícil é pensar em boas frases na hora. Aqui estão 68 ideias para pegar emprestado, adaptar ou transformar na sua mentira, e como jogar com uma equipe remota.",
  picker: { all: "Todas", another: "Outra ideia", copy: "Copiar", copied: "Copiada", of: "de" },
  howTo: [
    {
      title: "Como jogar duas verdades e uma mentira no trabalho",
      items: [
        {
          title: "Dê um minuto para todo mundo se preparar",
          detail: "Ou peça antes",
          body: "Pensar em três frases na hora é difícil. Peça para cada um escrever as suas antes da reunião, ou dê um minuto e mostre as ideias desta página.",
        },
        {
          title: "Diga as três, em qualquer ordem",
          detail: "Sem entregar no rosto",
          body: "Cada pessoa fala as suas três frases. A mentira não precisa ser sempre a última, e as verdades são melhores quando parecem improváveis.",
        },
        {
          title: "Todos chutam ao mesmo tempo",
          detail: "Depois a revelação",
          body: "Numa chamada de vídeo, peça para todos digitarem 1, 2 ou 3 no chat no mesmo instante, para ninguém ir atrás do primeiro palpite. Depois a pessoa revela a mentira e conta a história de uma das verdades.",
        },
        {
          title: "Conte pontos, ou não",
          detail: "Cinco pessoas em uns dez minutos",
          body: "Um ponto para cada acerto, e um ponto para quem falou por cada pessoa que enganou. Com uma equipe maior, faça algumas pessoas por reunião em vez de todo mundo de uma vez.",
        },
      ],
    },
    {
      title: "Jogando com uma equipe remota",
      body: [
        "Numa chamada, o chat ajuda muito: palpites ao mesmo tempo deixam o jogo justo e rápido. Peça para cada um colocar as três frases no chat como uma lista numerada, assim ninguém precisa decorar enquanto escuta.",
        "Para uma equipe em fusos diferentes, jogue no chat da equipe ao longo de um dia ou uma semana. Cada pessoa posta as três frases numa mensagem com três reações, uma por frase; cada um vota quando estiver online, e a revelação vem na manhã seguinte. É um ótimo jeito de receber alguém novo: as duas verdades e uma mentira no primeiro dia contam mais para a equipe do que uma apresentação.",
      ],
    },
  ],
  rules: [
    {
      title: "O que faz boas frases de duas verdades e uma mentira",
      items: [
        {
          title: "As verdades parecem inventadas",
          body: "\"Eu já apareci ao vivo na televisão\" é uma ótima verdade porque ninguém acredita. \"Eu gosto de pizza\" entrega o jogo.",
        },
        {
          title: "A mentira parece verdade",
          body: "Escolha algo que você poderia ter feito, do mesmo tipo de vida das suas verdades. Uma mentira absurda demais é fácil de pegar.",
        },
        {
          title: "Nada pessoal",
          body: "Fique em habilidades, experiências, trabalho e hábitos. Família, saúde, relacionamentos e dinheiro não combinam com um jogo do trabalho, nem como mentira.",
        },
        {
          title: "Curtas para lembrar",
          body: "Uma frase cada. A história pode vir depois da revelação, para quem quiser ouvir.",
        },
      ],
    },
    {
      title: "Como escolhemos estas",
      body: [
        "Escrevemos estas ideias para equipes de trabalho e separamos por assunto: habilidades, coisas que você já fez, trabalho, e comida e hábitos. Toda ideia pode ser verdade para alguém, nenhuma pede que alguém compartilhe algo pessoal, e nenhuma pressupõe muito dinheiro ou viagens. Use como estão, mude um detalhe para torná-la verdade para você, ou guarde uma como a sua mentira.",
      ],
    },
  ],
  fit: {
    title: "Jogue no escritório",
    body: "O TinyFloor é um escritório virtual para equipes pequenas: você vê quem está na mesa, vai até a pessoa para conversar e se reúne na sala de reuniões para a daily, um jogo, ou os dois. Funciona numa aba do navegador, grátis para até 3 pessoas e US$ 29 por mês para a equipe toda.",
    cta: "Conhecer o escritório de demonstração",
  },
  faqTitle: "Perguntas <em>frequentes.</em>",
  faq: [
    {
      q: "Quais são boas ideias de duas verdades e uma mentira para o trabalho?",
      a: "Frases sobre habilidades, experiências, empregos e hábitos, em que as verdades parecem surpreendentes e a mentira parece possível: \"Eu já apareci ao vivo na televisão\", \"Meu primeiro emprego foi num restaurante\", \"Eu sei montar um cubo mágico\".",
    },
    {
      q: "Como se joga duas verdades e uma mentira?",
      a: "Cada pessoa diz três frases sobre si mesma, duas verdadeiras e uma falsa. Os outros tentam adivinhar qual é a mentira, e depois quem falou revela.",
    },
    {
      q: "Como jogar duas verdades e uma mentira no Zoom, Meet ou Teams?",
      a: "Peça para cada pessoa postar as três frases no chat como uma lista numerada, todos digitam o palpite no mesmo instante, e depois vem a revelação. Cinco pessoas levam uns dez minutos.",
    },
    {
      q: "O que evitar em duas verdades e uma mentira no trabalho?",
      a: "Qualquer coisa sobre família, relacionamentos, saúde ou dinheiro, e o que alguém talvez não queira contar. Fique em habilidades, experiências, trabalho e hábitos do dia a dia.",
    },
    {
      q: "Quanto tempo dura duas verdades e uma mentira?",
      a: "Uns dois minutos por pessoa, então dez minutos para cinco pessoas. Com uma equipe maior, faça algumas pessoas por reunião, ou jogue no chat da equipe ao longo de uma semana.",
    },
  ],
};

export default pt;
