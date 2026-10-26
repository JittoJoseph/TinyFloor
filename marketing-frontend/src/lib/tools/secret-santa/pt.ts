import type { SantaContent } from "@/lib/tools/secret-santa";

/** The Secret Santa generator in Brazilian Portuguese, written from the English page. */
const pt: SantaContent = {
  meta: {
    title: "Amigo secreto online: sorteio grátis sem e-mail e sem cadastro",
    description: "Faça o sorteio do amigo secreto em segundos e envie a cada pessoa um link privado que mostra quem ela tirou. Grátis, sem e-mails ou cadastros, e feito para equipes que trabalham remotamente.",
  },
  eyebrow: "Ferramenta grátis",
  updated: "Atualizado em",
  title: "Sorteio de <em>amigo secreto.</em>",
  intro: "Digite os nomes de todos, faça o sorteio e envie a cada pessoa seu próprio link privado: ele mostra quem ela tirou e ninguém mais vê. Sem e-mails, sem cadastros e funciona para equipes espalhadas por vários países. Abaixo: como fazer um amigo secreto online, as regras e ideias de presentes para colegas de trabalho.",
  drawer: {
    names: "Nomes",
    namesHint: "Um por linha, no mínimo três. Adicione seu nome se for participar.",
    budget: "Valor do presente",
    date: "Data da revelação",
    optional: "(opcional)",
    draw: "Sortear nomes",
    redraw: "Sortear novamente",
    redrawNote: "Fazer um novo sorteio gera novos links. Envie apenas os mais recentes.",
    tooFew: "Adicione pelo menos três nomes.",
    duplicate: "Duas pessoas têm o mesmo nome. Adicione uma inicial para que cada uma encontre seu próprio link.",
    linksTitle: "Links privados",
    linksNote: "Envie para cada pessoa o seu próprio link, em uma mensagem individual. Ao abrir o link, ela verá quem tirou.",
    copy: "Copiar link",
    copied: "Copiado",
    copyAll: "Copiar todos os links",
    allIntro: "Amigo secreto: abra apenas o link com o seu nome.",
    revealTitle: "Olá {name}, você tirou…",
    show: "Mostrar o nome",
    lookAway: "Garanta que ninguém esteja olhando para a sua tela.",
    budgetLabel: "Orçamento",
    dateLabel: "Revelação",
    keepSecret: "Mantenha em segredo até a revelação.",
    own: "Sorteie os nomes para o seu grupo",
  },
  sections: [
    {
      title: "Como fazer amigo secreto online",
      items: [
        {
          title: "Reúna os nomes",
          body: "Pergunte quem quer participar. A participação deve ser opcional no trabalho: um amigo secreto em que as pessoas são forçadas a entrar não é divertido para ninguém.",
        },
        {
          title: "Defina um orçamento e uma data",
          body: "Um valor único, definido com antecedência, para que ninguém gaste três vezes mais do que a pessoa que vai lhe presentear. A data é o dia em que os presentes serão abertos.",
        },
        { title: "Sorteie os nomes", body: "Digite os nomes acima e faça o sorteio. Todo mundo tira alguém, e ninguém tira a si mesmo." },
        {
          title: "Envie os links",
          body: "Envie para cada pessoa o seu próprio link por mensagem direta ou e-mail. Quem organiza também pode participar: você vê os links, mas não quem tirou quem.",
        },
        {
          title: "Abram os presentes juntos",
          body: "Numa chamada de vídeo ou na festa, um de cada vez, com todo mundo tentando adivinhar quem é o seu amigo secreto.",
        },
      ],
    },
    {
      title: "Amigo secreto com uma equipe remota",
      body: [
        "Quando a equipe trabalha em cidades ou países diferentes, os presentes precisam viajar. O jeito mais simples são os presentes digitais: um vale-presente, um e-book, um mês de serviço de streaming ou uma doação em nome da pessoa. Se preferirem enviar algo físico, quem organiza pode coletar os endereços residenciais de forma privada e passar cada um apenas para quem precisa, ou todos podem comprar em uma loja que entregue no país de destino.",
        "Abram os presentes juntos em uma chamada, de preferência como parte de uma festa de fim de ano. Nossas [ideias de festa de fim de ano virtual](/guides/virtual-holiday-party-ideas) trazem um roteiro e brincadeiras para acompanhar.",
      ],
    },
    {
      title: "Regras do amigo secreto",
      items: [
        {
          title: "Respeite o orçamento",
          body: "Gastar menos não tem problema, passar do limite fica chato. O objetivo do orçamento é este: um presente simples, escolhido com carinho.",
        },
        {
          title: "Mantenha o segredo",
          body: "Não conte a ninguém quem você tirou até que os presentes sejam abertos, e não pergunte aos outros quem eles tiraram.",
        },
        { title: "Mantenha adequado para o trabalho", body: "Nada pessoal, nada que possa constranger alguém na frente dos colegas." },
        {
          title: "Compartilhe um desejo",
          body: "Se as pessoas enviarem um desejo curto no chat da equipe, como “Adoraria ganhar um bom livro”, ninguém precisa ficar adivinhando.",
        },
        {
          title: "Deixe a participação opcional",
          body: "Algumas pessoas não comemoram ou simplesmente não querem participar. Elas ainda são bem-vindas na festa.",
        },
      ],
    },
    {
      title: "Ideias de presentes de amigo secreto para colegas",
      body: [
        "Ideias fáceis de enviar e que cabem em quase todo orçamento:",
      ],
      items: [
        { title: "Café ou chá", detail: "Até R$ 50", body: "Um pacote de café de uma boa torrefação local ou uma seleção de chás." },
        { title: "Um livro", detail: "Até R$ 50", body: "Algo que você adorou este ano, com um bilhete explicando o motivo." },
        { title: "Uma planta de mesa", detail: "Até R$ 70", body: "Pequena, difícil de morrer e bonita de se ver durante as chamadas." },
        { title: "Um vale-presente", detail: "Qualquer valor", body: "De uma livraria, rede de cafés ou aplicativo de entrega onde a pessoa mora." },
        { title: "Um caderno bonito", detail: "Até R$ 50", body: "Útil para quem ainda gosta de anotar as coisas no papel." },
        { title: "Um mês de assinatura", detail: "Até R$ 50", body: "Uma assinatura de música, audiolivro ou streaming, enviada como código de presente." },
        { title: "Um quebra-cabeça ou jogo", detail: "Até R$ 100", body: "Algo para a noite ou para a família toda." },
        {
          title: "Algo típico da sua cidade",
          detail: "Até R$ 80",
          body: "Doces locais ou uma lembrancinha que só a sua região tem. Equipes remotas adoram isso.",
        },
      ],
    },
  ],
  fit: {
    title: "Abram os presentes juntos",
    body: "O TinyFloor é um escritório virtual para equipes pequenas. Abram os presentes na sala de reunião com vídeo e compartilhamento de tela, e depois continuem conversando em suas mesas, como fariam em uma festa de verdade. É grátis para até 3 pessoas e US$ 29 por mês para a equipe toda.",
    cta: "Conhecer o escritório de demonstração",
  },
  faqTitle: "Perguntas <em>frequentes.</em>",
  faq: [
    {
      q: "Como funciona este gerador de amigo secreto?",
      a: "Digite os nomes, faça o sorteio e envie para cada pessoa o link com o nome dela. Ao abrir o link, ela verá quem tirou, além do orçamento e da data, se você os tiver definido.",
    },
    {
      q: "As pessoas precisam de e-mail ou de conta?",
      a: "Não. Não há cadastro e nada é enviado por e-mail: você mesmo envia os links por chat, e-mail ou mensagem de texto.",
    },
    {
      q: "O organizador pode participar?",
      a: "Sim. O organizador vê os links, mas não quem tirou quem, então adicione seu próprio nome e abra apenas o seu link.",
    },
    { q: "Alguém pode tirar o próprio nome?", a: "Não. Cada pessoa tira outra pessoa, e cada pessoa é tirada por exatamente um amigo secreto." },
    {
      q: "Como fazer um amigo secreto com uma equipe remota?",
      a: "Faça o sorteio online, envie um link privado para cada um, combinem um orçamento e escolham presentes digitais ou coletem os endereços de forma privada. Depois, abram os presentes juntos em uma videochamada.",
    },
    {
      q: "Qual é um bom orçamento para amigo secreto no trabalho?",
      a: "Algo que todos possam pagar sem pesar no bolso, geralmente entre R$ 50 e R$ 100. Defina um valor único no convite para que os presentes sejam equivalentes.",
    },
    {
      q: "Este gerador de amigo secreto é grátis?",
      a: "Sim, sem limite de pessoas. Ele funciona no seu navegador e os nomes só viajam nos links que você enviar.",
    },
  ],
};

export default pt;
