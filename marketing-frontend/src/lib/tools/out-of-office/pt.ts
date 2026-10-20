import type { OooContent } from "@/lib/tools/out-of-office";

/** O gerador de resposta automática de ausência, em português do Brasil. */
const pt: OooContent = {
  meta: {
    title: "Gerador de Mensagem de Ausência: Exemplos e Modelos Grátis",
    description:
      "Escreva uma mensagem de ausência em segundos: resposta automática de e-mail e status para Slack ou Teams, para férias, licença médica, viagem a trabalho e mais. Exemplos e como ativar no Outlook e Gmail.",
  },
  eyebrow: "Ferramenta grátis",
  updated: "Atualizado em",
  title: "Gerador de <em>mensagem de ausência.</em>",
  intro:
    "Diga por que você está fora, quando volta e quem pode ajudar enquanto isso, e receba uma resposta automática de e-mail e um status curto para o chat da equipe, prontos para colar. Abaixo: exemplos de mensagens para cada situação e como ativar no Outlook, Gmail, Slack e Teams.",
  writer: {
    reason: "Por que você está fora",
    reasons: { vacation: "Férias", sick: "Licença médica", travel: "Viagem a trabalho", parental: "Licença-maternidade/paternidade", holiday: "Feriado" },
    back: "Volta em",
    unknown: "Deixe em branco se ainda não souber.",
    name: "Seu nome",
    contact: "Quem procurar no seu lugar",
    email: "E-mail dessa pessoa",
    optional: "(opcional)",
    tone: "Tom",
    tones: { professional: "Profissional", friendly: "Amigável", short: "Curto" },
    emailTitle: "Resposta automática de e-mail",
    statusTitle: "Status para Slack, Teams ou TinyFloor",
    statusNote: "Até 100 caracteres, para caber no status do Slack.",
    copy: "Copiar",
    copied: "Copiado",
  },
  sections: [
    {
      title: "Exemplos de mensagem de ausência",
      body: [
        "Toda boa mensagem de ausência diz três coisas: que você está fora, quando volta e quem procurar se não puder esperar. Veja como isso fica nas situações mais comuns; o gerador acima escreve o mesmo com as suas datas e nomes.",
      ],
      items: [
        {
          title: "Férias",
          detail: "Fora por alguns dias",
          body: "\"Obrigado pelo seu e-mail. Estou de férias e fora do escritório até segunda-feira, 2 de novembro. Responderei sua mensagem quando retornar. Em caso de urgência, entre em contato com Ana Lima (ana@exemplo.com).\"",
        },
        {
          title: "Licença médica",
          detail: "Curta e reservada",
          body: "\"Obrigado pelo seu e-mail. Estou fora do escritório hoje e responderei assim que retornar. Em caso de urgência, entre em contato com Ana Lima.\" Dizer que está doente é opcional; você nunca deve detalhes a ninguém.",
        },
        {
          title: "Viagem a trabalho ou evento",
          detail: "Mais devagar, não ausente",
          body: "\"Obrigado pela mensagem! Estou viajando a trabalho até quinta-feira, 5 de novembro, e olhando o e-mail menos que o normal. Respondo quando voltar. Se não puder esperar, Ana Lima pode ajudar.\"",
        },
        {
          title: "Licença-maternidade ou paternidade",
          detail: "Ausência longa",
          body: "\"Obrigado pelo seu e-mail. Estou de licença até 2 de fevereiro e não vou acompanhar o e-mail. Para assuntos dos meus projetos, fale com Ana Lima (ana@exemplo.com), que está me substituindo.\" Numa ausência longa, indique uma pessoa, não só uma data.",
        },
        {
          title: "Feriado",
          detail: "Para a equipe toda",
          body: "\"Obrigado pelo seu e-mail. Nosso escritório está fechado por causa do feriado até terça-feira, 3 de novembro. Responderemos sua mensagem quando voltarmos.\"",
        },
        {
          title: "A curtinha",
          detail: "Para colegas",
          body: "\"Estou de férias até 3 de novembro. Urgente? Fale com Ana Lima.\" Dentro da própria empresa, quanto mais curta, melhor.",
        },
      ],
    },
    {
      title: "Como ativar a resposta automática no Outlook",
      body: [
        "No novo Outlook e no Outlook na web, abra Configurações (o ícone de engrenagem), vá em Contas e depois em Respostas automáticas. Ative as respostas automáticas, marque a opção de enviar apenas durante um período, defina as datas de início e fim e cole a sua mensagem. Dá para escrever uma mensagem diferente para quem é de fora da sua organização, o que é uma boa ideia: colegas precisam de menos explicação do que clientes.",
        "No Outlook clássico para Windows, vá em Arquivo e depois em Respostas Automáticas, e preencha os mesmos dados. Se você definir uma data de fim, o Outlook desliga as respostas sozinho, então não precisa lembrar de voltar lá.",
      ],
    },
    {
      title: "Como ativar a resposta automática no Gmail",
      body: [
        "No Gmail, clique no ícone de engrenagem e depois em Ver todas as configurações. Na aba Geral, desça até Resposta automática de férias, ative, defina o primeiro e o último dia, coloque um assunto como \"Fora do escritório até 3 de novembro\", cole a mensagem e clique em Salvar alterações, no fim da página.",
        "O Gmail envia a resposta automática uma vez para cada pessoa num período de quatro dias, não a cada mensagem, então quem escrever duas vezes não recebe duas vezes. Também dá para enviar só para os seus contatos ou, numa conta de trabalho, só para pessoas da sua organização.",
      ],
    },
    {
      title: "Ausência no Slack e no Microsoft Teams",
      body: [
        "O chat da equipe não envia respostas automáticas, então um status faz esse papel: ele aparece ao lado do seu nome sempre que alguém tenta te mandar mensagem. No Slack, clique na sua foto, escolha Atualizar seu status, coloque um emoji e uma linha curta como \"🌴 De férias até 3 de nov.\" e defina para limpar quando você voltar. Pausar as notificações nas mesmas datas deixa o celular quieto também.",
        "No Microsoft Teams, clique na sua foto e escolha Definir mensagem de status. Escreva a mensagem e defina quando ela deve sumir. A mesma janela tem um link para agendar a ausência, que ativa a resposta automática do Outlook e o status do Teams juntos. O status do gerador acima é curto o bastante para os dois.",
      ],
    },
    {
      title: "O que uma boa mensagem de ausência inclui",
      items: [
        { title: "Quando você volta", body: "Uma data, não \"semana que vem\". Se ainda não souber, diga que responde assim que voltar." },
        { title: "Quem pode ajudar", body: "Um nome, e um e-mail se for alguém de fora da conversa. Combine antes; ninguém gosta de descobrir por um cliente que está te cobrindo." },
        { title: "Sem detalhes demais", body: "\"Fora do escritório\" basta. Onde você está e por quê não interessa a ninguém, e o destino das férias numa resposta automática avisa estranhos que a sua casa está vazia." },
        { title: "Sem promessas que você não vai cumprir", body: "\"Respondo quando voltar\" está ótimo. \"Vou responder todos os e-mails\" depois de duas semanas fora quase nunca é verdade." },
        { title: "Desligue depois", body: "Defina uma data de fim no Outlook ou no Gmail e um horário para o status do chat sumir, para ninguém ouvir que você está fora no dia em que voltou." },
      ],
    },
  ],
  fit: {
    title: "Recados de ausência, já dentro do escritório",
    body: "No TinyFloor, um escritório virtual para equipes pequenas, um recado como \"🌴 De férias até segunda\" fica no seu nome, para a equipe saber antes de tentar falar com você, e some sozinho no dia. Funciona numa aba do navegador, grátis para até 3 pessoas e US$ 29 por mês para a equipe toda.",
    cta: "Conhecer o escritório de demonstração",
  },
  faqTitle: "Perguntas <em>frequentes.</em>",
  faq: [
    {
      q: "O que escrever numa mensagem de ausência?",
      a: "Que você está fora, quando volta e quem procurar em caso de urgência. Por exemplo: \"Estou fora do escritório até segunda-feira, 2 de novembro. Em caso de urgência, entre em contato com Ana Lima.\"",
    },
    {
      q: "Como ativar a resposta automática no Outlook?",
      a: "No novo Outlook ou no Outlook na web: Configurações, Contas, Respostas automáticas. No Outlook clássico para Windows: Arquivo, Respostas Automáticas. Ative, defina as datas e cole a mensagem.",
    },
    {
      q: "Como ativar a resposta automática no Gmail?",
      a: "Clique no ícone de engrenagem, Ver todas as configurações, e na aba Geral ative a Resposta automática de férias. Defina as datas, um assunto e a mensagem, e clique em Salvar alterações.",
    },
    {
      q: "Preciso dizer por que estou ausente?",
      a: "Não. \"Fora do escritório\" basta. Dizer que está de férias é comum e tranquilo, mas você nunca precisa dar detalhes, ainda mais sobre saúde.",
    },
    {
      q: "Qual é um exemplo de mensagem de ausência profissional?",
      a: "\"Obrigado pelo seu e-mail. Estou fora do escritório até segunda-feira, 2 de novembro, e responderei quando retornar. Em caso de urgência, entre em contato com Ana Lima (ana@exemplo.com).\"",
    },
    {
      q: "Este gerador de mensagem de ausência é grátis?",
      a: "Sim, e funciona inteiro no seu navegador: os nomes, datas e e-mails que você digita nunca são enviados para lugar nenhum. Copie a mensagem para o Outlook, Gmail, Slack ou Teams.",
    },
  ],
};

export default pt;
