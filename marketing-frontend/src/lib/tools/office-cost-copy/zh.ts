import type { OfficeCostsContent } from "@/lib/tools/office-costs";

const zh: OfficeCostsContent = {
  meta: {
    title: "虚拟办公室费用计算器：10 款工具让你的团队花多少钱",
    description:
      "输入团队人数，查看 Gather、SoWork、Spot、Kumospace、WorkAdventure、SpatialChat、Roam、oVice、Sococo 和 TinyFloor 按年付或按月付每月要花多少钱，价格来自各自的定价页。",
  },
  eyebrow: "免费工具",
  updated: "价格核对于",
  title: "虚拟办公室<em>让你的团队花多少钱。</em>",
  intro:
    "大多数虚拟办公室按人收费，少数按空间或按办公室收费，免费版能容纳的人数也各不相同。输入团队人数，就能看到十款工具每月各要多少钱，从便宜到贵排列。",
  calculator: {
    people: "团队人数",
    count: "{count} 人",
    billing: { yearly: "按年付", monthly: "按月付" },
    product: "产品",
    free: "免费版",
    price: "付费版",
    perMonth: "每月 {amount}",
    perYear: "每年 {amount}",
    only: { yearly: "仅按年付", monthly: "仅按月付" },
    noFree: "没有免费版",
    fits: "这个人数免费",
    upTo: "最多 {count} 人",
    pricingPage: "定价页",
    basis: {
      office: "整个办公室一个价",
      member: "按成员",
      activeMember: "按活跃成员",
      space: "按空间",
      seat: "按席位，至少 10 个",
    },
    limits: {
      everyFeature: "全部功能",
      thirtyMinutes: "会议限 30 分钟",
      oneFloor: "一层楼",
      atOnce: "同时在线",
      twoHours: "每天 2 小时",
      preRelease: "预发布版，无支持",
    },
    summary: "{count} 人的团队，按人收费的方案每月 {low} 到 {high}。TinyFloor {tinyfloor}。",
    summaryLarge: "{count} 人的团队，按人收费的方案每月 {low} 到 {high}。",
  },
  sections: [
    {
      title: "虚拟办公室怎么收费",
      body: ["一共四种方式，一个成长中的团队最终付多少钱，更多取决于收费方式，而不是标价。"],
      items: [
        {
          title: "按成员",
          detail: "Gather、SoWork、Spot、Kumospace、WorkAdventure、SpatialChat",
          body: "每个有账号的人都要按月付费，不管来不来。每招一个人账单就涨一次：10 人的团队要付 5 人团队的两倍。",
        },
        {
          title: "按活跃成员",
          detail: "Roam",
          body: "只为当月用过的人付费。休假的人不花钱，但大多数团队每个月都在用，所以实际上和按成员差不多。",
        },
        {
          title: "按空间或按席位包",
          detail: "oVice、Sococo",
          body: "为一个适合一定人数的空间付费，或者买一个最低席位包。团队坐满就划算，坐不满就贵：Sococo 就算你们只有 4 个人，也按 10 个席位收费。",
        },
        {
          title: "整个办公室一个价",
          detail: "TinyFloor",
          body: "在方案能容纳的人数以内，不管多少人都是一个价。多加一个人不花钱，所以没人需要纠结要不要给外包同事一个席位。",
        },
      ],
    },
    {
      title: "按年付还是按月付",
      body: [
        "大多数按人收费的工具，提前付一年能便宜 10% 到 20%：Gather 按年付每位成员 $12，按月付 $15。但对人数可能变化的团队来说，这是一年的承诺，三个月后不用了，折扣也就没了。",
        "有些只支持一种付款方式：Roam 和 TinyFloor 按月付，Sococo 按年付。计算器会按它们实际的价格显示，并注明这一点。",
      ],
    },
  ],
  table: {
    title: "5 人、10 人、15 人的团队每月要付多少",
    body: ["同样的价格，按三种常见人数列出，能按年付的取按年付的价格，因为更低。这里不计免费版；哪些免费版够用，看上面的计算器。"],
    product: "产品",
    note: "美元，不含税，来自各产品的定价页。Sococo 至少按 10 个席位收费；oVice 在固定成员超过大约 10 人后从 Entry-S 换到 Entry-M。",
  },
  after: [
    {
      title: "什么时候免费版就够了",
      body: [
        "能装下整个团队的免费版胜过任何付费版，所以先看限制再看价格。SoWork 的免费版支持 10 位成员，但每次会议 30 分钟就结束。WorkAdventure 的支持 10 人同时在线。SpatialChat 的让 12 个人每天开 2 小时会，够每周聚一次，但撑不起一整天开着的办公室。Kumospace 的支持一层楼 5 位成员，TinyFloor 的支持 3 个人使用全部功能。oVice 的免费版运行在没有支持的预发布版本上。",
      ],
    },
    {
      title: "价格看不出来的",
      items: [
        {
          title: "方案里有什么",
          body: "最便宜的方案不一定是你们会用的那个。SoWork Basic 只有两次会议录制；录制和 AI 纪要在 Premium 里，每位成员 $12。Gather 包含录制和转写。TinyFloor 没有录制，也没有 AI 纪要。",
        },
        {
          title: "访客",
          body: "偶尔来一下的客户和外包同事，在有些工具里会算作成员。Gather 和 oVice 可以免费邀请访客；在添加只是来访的人之前，先确认一下。",
        },
        { title: "税费", body: "这里所有价格都不含税。根据你们所在的地区，结账时会加上增值税或销售税。" },
        {
          title: "试用",
          body: "Gather 和 Spot 有 30 天试用，Roam 和 oVice 14 天，SoWork 7 天。试用告诉你团队会不会用；价格告诉你会不会一直付下去。",
        },
      ],
    },
    {
      title: "我们怎么核对的",
      body: [
        "每个价格都来自产品自己的定价页（计算器里有链接），在页面顶部写的那个月读取。我们选的是小团队为一整天开着的办公室会买的方案，不含活动方案或企业方案。定价页只给一种付款周期的，我们就显示那一种。价格会变，购买前请看一下定价页；我们每隔几个月会重新核对。",
      ],
    },
  ],
  fit: {
    title: "整个团队一个价",
    body: "TinyFloor 是给远程团队用的浏览器办公室：走到同事身边就能聊，还有会议室、聊天和屏幕共享。3 人以内免费，超过以后不管多少人，整个团队每月 $29。它没有录制和 AI 纪要；如果你们需要这些，Gather 或 SoWork Premium 会更合适。",
    cta: "体验演示办公室",
  },
  faqTitle: "常见<em>问题。</em>",
  faq: [
    {
      q: "虚拟办公室每月要多少钱？",
      a: "10 人的团队用付费方案，视工具不同每月 $29 到 $195：TinyFloor 整个办公室 $29，按人收费的工具从 $48（Spot Basic，按年付）到 $195（Roam）。",
    },
    {
      q: "小团队最便宜的虚拟办公室是哪个？",
      a: "够用的免费版：SoWork 的支持 10 位成员、会议限 30 分钟，WorkAdventure 的支持 10 人同时在线，Kumospace 的支持 5 位成员，TinyFloor 的支持 3 个人。超过这些，整个团队每月 $29 的 TinyFloor 是 7 人起最便宜的付费价格。",
    },
    {
      q: "Gather 免费吗？",
      a: "不免费。Gather 在 2025 年取消了免费版。30 天试用后，按年付每位成员每月 $12，按月付 $15，10 人的团队每月要付 $120 到 $150。",
    },
    {
      q: "按人收费和固定价格，哪个更好？",
      a: "2 到 3 人的团队按人收费更便宜，因为人均价格不高。团队越大固定价格越划算，而且加一个外包同事或新同事也不会多收钱。",
    },
    {
      q: "虚拟办公室的价格含税吗？",
      a: "不含。各工具定价页上的价格和这里的价格都不含税；结账时会根据你们所在地区加上增值税或销售税。",
    },
  ],
};

export default zh;
