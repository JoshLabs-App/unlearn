// 内容数据层：第二本书「福尔摩斯 · 贝克街」第一章。
// 和主线（十年之约）是两条独立的故事线，各自一个内容对象，不往 GAME_CONTENT 上 push。
// 引擎多本书支持（每本书各自存档、词汇量跨书合并去重、闪回不跨书、全开放不锁）
// 还没做，做好之前这个文件只用于校验和审稿：
//   node scripts/validate-curriculum.mjs --book baker-street --baseline L2
//
// 改编来源（均已进入公有领域）：Arthur Conan Doyle,
//   A Study in Scarlet (1887) 第 1-2 章（华生与福尔摩斯相遇，第 1-3 课）
//   The Red-Headed League (1891)（红发会，第 4-10 课）
// 结构上的一处合并：原著相遇在 1881 年、红发会在 1890 年，这里把红发会当作两人
// 合住后接的第一个案子。剧情本身不改，只压缩时间线。
//
// 语言：背景留在 1881 年伦敦（马车、提灯、金镑、电报），台词用今天的英语；
// 不出现 okay / guys / phone 之类的现代词，也不用 whilst / fain 之类的过时词。
//
// Tier: L2（A2 起）。玩家扮演华生，正确选项只用 L1+L2 语法（陈述/疑问/can/will/
// 现在进行时/一般过去时/because-so 连接词）；福尔摩斯等 NPC 台词可以超纲（输入不受
// 产出上限约束）。本章不引入新 grammarTag，全部是主线第 1-7 章已引入的标签。
//
// 配音：所有角色都是英式男声，需要在 scripts/generate-audio.mjs 的 NAMED_VOICES 里补：
//   holmes → bm_george, stamford / spaulding → bm_lewis, wilson → bm_daniel,
//   jones / merryweather → bm_fable, hudson → bf_alice
// 玩家（华生）的选项也应该用英式男声，不是主线的 am_puck，这需要 pipeline 支持按书配置。

const BAKER_STREET_CONTENT = {
  bookId: "baker-street",
  bookTitle: "福尔摩斯 · 贝克街",
  bookTitleEn: "Sherlock Holmes: Baker Street",
  basedOn: "Adapted from Arthur Conan Doyle's A Study in Scarlet (1887) and The Red-Headed League (1891).",
  minLevel: "A2",
  chapterTitle: "第一章 · 贝克街的房客",
  chapterSubtitle: "The Red-Headed League",

  vocabBank: [
    { en: "Stamford! Yes, I just came back from Afghanistan.", zh: "斯坦福！是的，我刚从阿富汗回来。" },
    { en: "I got wounded, so they sent me home.", zh: "我受了伤，所以他们把我送回国了。" },
    { en: "Nothing yet. I'm looking for cheap rooms.", zh: "还没着落。我在找便宜的住处。" },
    { en: "Really? Who was the first?", zh: "真的？第一个是谁？" },
    { en: "How do you do, Mr. Holmes?", zh: "您好，福尔摩斯先生。" },
    { en: "How on earth did you know that?", zh: "你到底是怎么知道的？" },
    { en: "No, I don't. I smoke myself.", zh: "不介意，我自己也抽烟。" },
    { en: "All right, I'll be there at noon.", zh: "好，我中午到。" },
    { en: "Yes, that's me. I met him yesterday.", zh: "是的，就是我。我昨天见过他。" },
    { en: "Very nice. Can I see the bedrooms?", zh: "很不错。我能看看卧室吗？" },
    { en: "How much is it a month?", zh: "一个月多少钱？" },
    { en: "Not at all. I'll enjoy the music.", zh: "完全没有，我会很享受的。" },
    { en: "Let's do it. I'll bring my things tomorrow.", zh: "就这么定。我明天把东西搬过来。" },
    { en: "Sorry, am I interrupting?", zh: "抱歉，我打扰到你们了吗？" },
    { en: "Please go on, Mr. Wilson.", zh: "请继续，威尔逊先生。" },
    { en: "I see. What is he like?", zh: "明白。他这人怎么样？" },
    { en: "Half pay? That's very unusual.", zh: "一半工钱？这可太少见了。" },
    { en: "Can I take a look?", zh: "我能看一眼吗？" },
    { en: "And did they choose you?", zh: "那他们选中你了吗？" },
    { en: "You were lucky. What was the work?", zh: "你真走运。工作是什么？" },
    { en: "That sounds easy. So they paid you every week?", zh: "听起来很轻松。所以他们每周都给你钱？" },
    { en: "What does it say?", zh: "上面写了什么？" },
    { en: "That's very strange. Did you look for Mr. Ross?", zh: "太奇怪了。你去找罗斯先生了吗？" },
    { en: "You're in good hands, Mr. Wilson.", zh: "威尔逊先生，你找对人了。" },
    { en: "No, I don't. Not at all.", zh: "没有，完全没看明白。" },
    { en: "All right. I'll read the paper quietly.", zh: "好，我安静地看报。" },
    { en: "Why are you hitting the ground with your stick?", zh: "你为什么用手杖敲地面？" },
    { en: "Good idea. Let's ask him.", zh: "好主意。我们去问他。" },
    { en: "Thank you, that's very kind.", zh: "谢谢，您真好。" },
    { en: "I didn't notice. What does it mean?", zh: "我没注意。这说明什么？" },
    { en: "Of course. When do we start?", zh: "当然。我们什么时候开始？" },
    { en: "I'll bring it. Is it dangerous?", zh: "我会带的。危险吗？" },
    { en: "Who is he? Do you know him?", zh: "他是谁？你认识他？" },
    { en: "All right. Please knock on my door at half past nine.", zh: "好。请九点半敲我的门。" },
    { en: "Pleased to meet you. Are we going there now?", zh: "幸会。我们现在就去那儿吗？" },
    { en: "Gold! Now I understand.", zh: "金子！现在我明白了。" },
    { en: "Understood. How long do we wait?", zh: "明白。我们要等多久？" },
    { en: "I'm ready. My revolver is in my hand.", zh: "我准备好了。手枪就在我手里。" },
    { en: "Well done! We caught him.", zh: "干得好！我们抓住他了。" },
    { en: "So Spaulding wanted the shop to himself?", zh: "所以斯波尔丁想一个人待在店里？" },
    { en: "So you tapped the ground to find the tunnel.", zh: "所以你敲地面是为了找那条地道。" },
    { en: "Amazing. How did you know it was tonight?", zh: "太厉害了。你怎么知道是今晚？" },
    { en: "Sleep well, Holmes. And thank you.", zh: "好好睡一觉，福尔摩斯。谢谢你。" },
    { en: "A crown? Who is it from?", zh: "王冠？是谁寄来的？" },
    { en: "Pawnshop.", zh: "当铺" },
    { en: "Advertisement.", zh: "广告" },
    { en: "Encyclopaedia.", zh: "百科全书" },
    { en: "Cellar.", zh: "地下室" },
    { en: "Tunnel.", zh: "地道" },
    { en: "Revolver.", zh: "左轮手枪" }
  ],

  skillMeta: {
    meeting: { label: "结识新友", labelEn: "Meeting People", icon: "🤝" },
    lodging: { label: "找房安家", labelEn: "Finding Rooms", icon: "🏠" },
    story: { label: "听人讲述", labelEn: "Hearing the Story", icon: "👂" },
    case: { label: "跟着查案", labelEn: "On the Case", icon: "🔍" }
  },

  scenes: [
    {
      id: "the-criterion-bar",
      transition: {
        en: "London, 1881. You are Dr. John Watson, an army doctor just home from the war in Afghanistan. You have little money and no friends in the city.",
        zh: "1881 年，伦敦。你是约翰·华生医生，刚从阿富汗战场退伍回国的军医。手头没什么钱，城里也没有朋友。"
      },
      title: "An Old Friend",
      subtitle: "伦敦 · 酒吧偶遇 · 退伍归来",
      avatar: "🧑‍⚕️",
      startNode: "n1",
      nodes: {
        n1: {
          npcLine: { en: "Watson? Is that you? Good heavens, you're as thin as a stick!", zh: "华生？是你吗？天哪，你瘦得像根棍子！", voice: "stamford" },
          skill: "meeting",
          grammarTag: "past-simple",
          choices: [
            { text: "Stamford! Yes, I just came back from Afghanistan.", zh: "斯坦福！是的，我刚从阿富汗回来。", correct: true, xp: 10 },
            { text: "Sorry, I don't know you.", correct: false }
          ],
          hintOnWrong: "用一般过去时说自己刚做的事 → I just came back from Afghanistan.",
          next: "n2"
        },
        n2: {
          npcLine: { en: "Afghanistan! What happened to you out there?", zh: "阿富汗！你在那边出什么事了？", voice: "stamford" },
          skill: "meeting",
          grammarTag: "past-simple",
          choices: [
            { text: "I got wounded, so they sent me home.", zh: "我受了伤，所以他们把我送回国了。", correct: true, xp: 10 },
            { text: "I am going there tomorrow.", correct: false }
          ],
          hintOnWrong: "过去的事用过去时，so 连出结果 → I got wounded, so they sent me home.",
          next: "n3"
        },
        n3: {
          npcLine: { en: "Poor fellow. And what are you doing now?", zh: "可怜的家伙。那你现在在做什么？", voice: "stamford" },
          skill: "meeting",
          grammarTag: "present-continuous",
          choices: [
            { text: "Nothing yet. I'm looking for cheap rooms.", zh: "还没着落。我在找便宜的住处。", correct: true, xp: 10 },
            { text: "I'm the King of England.", correct: false }
          ],
          hintOnWrong: "正在做的事用现在进行时 → I'm looking for cheap rooms.",
          next: "n4"
        },
        n4: {
          npcLine: { en: "That's funny. You're the second man today who said that to me.", zh: "有意思。你是今天第二个跟我这么说的人。", voice: "stamford" },
          skill: "meeting",
          grammarTag: "wh-question",
          choices: [
            { text: "Really? Who was the first?", zh: "真的？第一个是谁？", correct: true, xp: 10 },
            { text: "I don't care.", correct: false }
          ],
          hintOnWrong: "用 Who 追问是谁 → Who was the first?",
          next: null
        }
      }
    },
    {
      id: "the-laboratory",
      transition: {
        en: "The first man, Stamford says, is called Sherlock Holmes. The next morning, he takes you to the chemistry laboratory at St Bartholomew's Hospital. A tall, thin man is bent over a test tube.",
        zh: "斯坦福说，第一个人叫夏洛克·福尔摩斯。第二天上午，他带你去圣巴塞洛缪医院的化学实验室。一个又高又瘦的男人正俯身盯着一支试管。"
      },
      title: "The Laboratory",
      subtitle: "圣巴塞洛缪医院 · 化学实验室",
      avatar: "🕵️",
      startNode: "n1",
      nodes: {
        n1: {
          avatar: "🧑‍⚕️",
          npcLine: { en: "Here he is. Holmes, this is my friend Dr. Watson.", zh: "他在这儿。福尔摩斯，这是我朋友华生医生。", voice: "stamford" },
          skill: "meeting",
          grammarTag: "courtesy",
          choices: [
            { text: "How do you do, Mr. Holmes?", zh: "您好，福尔摩斯先生。", correct: true, xp: 10 },
            { text: "Where is the doctor?", correct: false }
          ],
          hintOnWrong: "初次见面的正式问候 → How do you do, Mr. Holmes?",
          next: "n2"
        },
        n2: {
          npcLine: { en: "You've been in Afghanistan, I see.", zh: "你去过阿富汗吧，我看得出来。", voice: "holmes" },
          skill: "meeting",
          grammarTag: "wh-question",
          choices: [
            { text: "How on earth did you know that?", zh: "你到底是怎么知道的？", correct: true, xp: 10 },
            { text: "No, I live in London.", correct: false }
          ],
          hintOnWrong: "惊讶地追问对方怎么知道 → How on earth did you know that?",
          next: "n3"
        },
        n3: {
          npcLine: { en: "Never mind that now. Stamford says you want rooms. So do I. Do you mind the smell of strong tobacco?", zh: "这个先不说。斯坦福说你想找房子，我也是。你介意浓烈的烟草味吗？", voice: "holmes" },
          skill: "lodging",
          grammarTag: "short-answer",
          choices: [
            { text: "No, I don't. I smoke myself.", zh: "不介意，我自己也抽烟。", correct: true, xp: 10 },
            { text: "Yes, please, two sugars.", correct: false }
          ],
          hintOnWrong: "用 No, I don't 简短回答 → No, I don't. I smoke myself.",
          next: "n4"
        },
        n4: {
          npcLine: { en: "Good. I have my eye on some rooms in Baker Street. Come and see them tomorrow at noon.", zh: "很好。我看中了贝克街的几间房。明天中午来看看吧。", voice: "holmes" },
          skill: "lodging",
          grammarTag: "will-future",
          choices: [
            { text: "All right, I'll be there at noon.", zh: "好，我中午到。", correct: true, xp: 10 },
            { text: "I was there yesterday.", correct: false }
          ],
          hintOnWrong: "答应将来要做的事用 I'll → I'll be there at noon.",
          next: null
        }
      }
    },
    {
      id: "baker-street-221b",
      transition: {
        en: "Noon, the next day. A tall house on Baker Street. An older lady opens the door.",
        zh: "第二天中午，贝克街上一栋高高的房子。一位上了年纪的女士来开门。"
      },
      title: "221B Baker Street",
      subtitle: "贝克街 221B · 看房",
      avatar: "🕵️",
      startNode: "n1",
      nodes: {
        n1: {
          avatar: "👩‍🦳",
          npcLine: { en: "Good afternoon. You must be Dr. Watson. Mr. Holmes is upstairs.", zh: "下午好。您一定是华生医生吧。福尔摩斯先生在楼上。", voice: "hudson" },
          skill: "lodging",
          grammarTag: "past-simple",
          choices: [
            { text: "Yes, that's me. I met him yesterday.", zh: "是的，就是我。我昨天见过他。", correct: true, xp: 10 },
            { text: "No, I'm Mr. Holmes.", correct: false }
          ],
          hintOnWrong: "确认身份，并用过去时说昨天的事 → I met him yesterday.",
          next: "n2"
        },
        n2: {
          npcLine: { en: "Watson! Two bedrooms, one sitting room, two big windows. What do you think?", zh: "华生！两间卧室，一间起居室，两扇大窗。你觉得怎么样？", voice: "holmes" },
          skill: "lodging",
          grammarTag: "can-modal",
          choices: [
            { text: "Very nice. Can I see the bedrooms?", zh: "很不错。我能看看卧室吗？", correct: true, xp: 10 },
            { text: "I don't like windows.", correct: false }
          ],
          hintOnWrong: "用 Can I 提出请求 → Can I see the bedrooms?",
          next: "n3"
        },
        n3: {
          npcLine: { en: "Of course. And the rent is quite low, if we share it.", zh: "当然。房租也不贵，如果我们分摊的话。", voice: "holmes" },
          skill: "lodging",
          grammarTag: "wh-question",
          choices: [
            { text: "How much is it a month?", zh: "一个月多少钱？", correct: true, xp: 10 },
            { text: "How old is the house?", correct: false }
          ],
          hintOnWrong: "用 How much 问价格 → How much is it a month?",
          next: "n4"
        },
        n4: {
          npcLine: { en: "Eight pounds, four each. Now, my habits. I play the violin at night. Is that a problem?", zh: "八镑，一人四镑。再说说我的习惯。我晚上拉小提琴，有问题吗？", voice: "holmes" },
          skill: "lodging",
          grammarTag: "will-future",
          choices: [
            { text: "Not at all. I'll enjoy the music.", zh: "完全没有，我会很享受的。", correct: true, xp: 10 },
            { text: "Yes, I play the drums.", correct: false }
          ],
          hintOnWrong: "表示不介意，用 I'll 说自己会怎样 → Not at all. I'll enjoy the music.",
          next: "n5"
        },
        n5: {
          npcLine: { en: "Excellent. Then let's take the rooms.", zh: "太好了。那我们就把房子定下来吧。", voice: "holmes" },
          skill: "lodging",
          grammarTag: "lets-suggestion",
          choices: [
            { text: "Let's do it. I'll bring my things tomorrow.", zh: "就这么定。我明天把东西搬过来。", correct: true, xp: 10 },
            { text: "Let's go to Afghanistan.", correct: false }
          ],
          hintOnWrong: "接受提议 → Let's do it. I'll bring my things tomorrow.",
          next: null
        }
      }
    },
    {
      id: "a-red-headed-visitor",
      transition: {
        en: "Some weeks later. You come home and find a stout man with fiery red hair sitting in your sitting room.",
        zh: "几周后。你回到家，发现起居室里坐着一个顶着一头火红头发的胖男人。"
      },
      title: "A Red-Headed Visitor",
      subtitle: "贝克街 · 一位红发客人",
      avatar: "👨‍🦰",
      startNode: "n1",
      nodes: {
        n1: {
          avatar: "🕵️",
          npcLine: { en: "Watson, come in! Mr. Wilson here is telling me a very strange story.", zh: "华生，进来！这位威尔逊先生正在给我讲一个非常奇怪的故事。", voice: "holmes" },
          skill: "story",
          grammarTag: "present-continuous",
          choices: [
            { text: "Sorry, am I interrupting?", zh: "抱歉，我打扰到你们了吗？", correct: true, xp: 10 },
            { text: "I'm going out again.", correct: false }
          ],
          hintOnWrong: "问自己是不是正在打扰 → Sorry, am I interrupting?",
          next: "n2"
        },
        n2: {
          avatar: "🕵️",
          npcLine: { en: "Not at all. Sit down. Mr. Wilson, please tell my friend everything from the beginning.", zh: "完全没有。坐。威尔逊先生，请从头把一切讲给我朋友听。", voice: "holmes" },
          skill: "story",
          grammarTag: "please-request",
          choices: [
            { text: "Please go on, Mr. Wilson.", zh: "请继续，威尔逊先生。", correct: true, xp: 10 },
            { text: "Please leave, Mr. Wilson.", correct: false }
          ],
          hintOnWrong: "礼貌请对方继续说 → Please go on, Mr. Wilson.",
          next: "n3"
        },
        n3: {
          npcLine: { en: "I keep a small pawnshop in Saxe-Coburg Square. Business is slow, so I have only one assistant.", zh: "我在萨克斯-科伯格广场开一家小当铺。生意清淡，所以只雇了一个伙计。", voice: "wilson" },
          skill: "story",
          grammarTag: "wh-question",
          choices: [
            { text: "I see. What is he like?", zh: "明白。他这人怎么样？", correct: true, xp: 10 },
            { text: "I want to buy a shop.", correct: false }
          ],
          hintOnWrong: "用 What is he like 问对方是个怎样的人 → What is he like?",
          next: "n4"
        },
        n4: {
          npcLine: { en: "Spaulding? A clever young man. He works for half pay, because he wants to learn the trade.", zh: "斯波尔丁？很机灵的年轻人。他只拿一半工钱，因为他想学这门手艺。", voice: "wilson" },
          skill: "story",
          grammarTag: "statement",
          choices: [
            { text: "Half pay? That's very unusual.", zh: "一半工钱？这可太少见了。", correct: true, xp: 10 },
            { text: "I work for free too.", correct: false }
          ],
          hintOnWrong: "用陈述句表达看法 → That's very unusual.",
          next: "n5"
        },
        n5: {
          npcLine: { en: "That's what I thought. Then, two months ago, he showed me this advertisement in the newspaper.", zh: "我也是这么想的。后来，两个月前，他给我看了报纸上的这则广告。", voice: "wilson" },
          skill: "story",
          grammarTag: "can-modal",
          choices: [
            { text: "Can I take a look?", zh: "我能看一眼吗？", correct: true, xp: 10 },
            { text: "I can't read.", correct: false }
          ],
          hintOnWrong: "用 Can I 请求看一下 → Can I take a look?",
          next: null
        }
      }
    },
    {
      id: "four-pounds-a-week",
      title: "Four Pounds a Week",
      subtitle: "红发会 · 一份奇怪的差事",
      avatar: "👨‍🦰",
      startNode: "n1",
      nodes: {
        n1: {
          npcLine: { en: "'To the Red-Headed League: a position for a red-headed man, four pounds a week, easy work.' So I went to the office with Spaulding.", zh: "「致红发会：招一名红发男子，周薪四镑，工作轻松。」于是我和斯波尔丁去了办公室。", voice: "wilson" },
          skill: "story",
          grammarTag: "do-question",
          choices: [
            { text: "And did they choose you?", zh: "那他们选中你了吗？", correct: true, xp: 10 },
            { text: "Did you buy a hat?", correct: false }
          ],
          hintOnWrong: "用 Did they 问过去发生的事 → And did they choose you?",
          next: "n2"
        },
        n2: {
          npcLine: { en: "They did! Hundreds of red-headed men waited outside, but the manager, Mr. Duncan Ross, picked me.", zh: "选中了！几百个红发男人在外面排队，但经理邓肯·罗斯先生选了我。", voice: "wilson" },
          skill: "story",
          grammarTag: "past-simple",
          choices: [
            { text: "You were lucky. What was the work?", zh: "你真走运。工作是什么？", correct: true, xp: 10 },
            { text: "You were late.", correct: false }
          ],
          hintOnWrong: "用 was / were 谈过去的事 → You were lucky. What was the work?",
          next: "n3"
        },
        n3: {
          npcLine: { en: "Copying the Encyclopaedia Britannica. Every day from ten until two, in a small office. I copied the letter A for eight weeks.", zh: "抄《大英百科全书》。每天上午十点到下午两点，在一间小办公室里。我抄了八个星期的字母 A。", voice: "wilson" },
          skill: "story",
          grammarTag: "connector",
          choices: [
            { text: "That sounds easy. So they paid you every week?", zh: "听起来很轻松。所以他们每周都给你钱？", correct: true, xp: 10 },
            { text: "I never write letters.", correct: false }
          ],
          hintOnWrong: "用 so 接着往下推 → So they paid you every week?",
          next: "n4"
        },
        n4: {
          npcLine: { en: "Every Saturday, four gold pounds. Then, this morning, I found this on the office door.", zh: "每周六，四个金镑。然后，今天早上，我在办公室门上发现了这个。", voice: "wilson" },
          skill: "story",
          grammarTag: "wh-question",
          choices: [
            { text: "What does it say?", zh: "上面写了什么？", correct: true, xp: 10 },
            { text: "Is it lunch time?", correct: false }
          ],
          hintOnWrong: "问纸上写了什么 → What does it say?",
          next: null
        }
      }
    },
    {
      id: "the-league-is-dissolved",
      title: "The League Is Dissolved",
      subtitle: "贝克街 · 红发会解散了",
      avatar: "🕵️",
      startNode: "n1",
      nodes: {
        n1: {
          avatar: "👨‍🦰",
          npcLine: { en: "'THE RED-HEADED LEAGUE IS DISSOLVED. October 9th.' No office, no Mr. Ross, no money. Everyone is gone!", zh: "「红发会已解散。10 月 9 日。」办公室没了，罗斯先生没了，钱也没了。人全都不见了！", voice: "wilson" },
          skill: "story",
          grammarTag: "do-question",
          choices: [
            { text: "That's very strange. Did you look for Mr. Ross?", zh: "太奇怪了。你去找罗斯先生了吗？", correct: true, xp: 10 },
            { text: "That's normal.", correct: false }
          ],
          hintOnWrong: "用 Did you 问对方有没有做 → Did you look for Mr. Ross?",
          next: "n2"
        },
        n2: {
          avatar: "👨‍🦰",
          npcLine: { en: "I did. The landlord never heard of him. So I came straight to Mr. Holmes.", zh: "找了。房东根本没听说过这个人。所以我直接来找福尔摩斯先生了。", voice: "wilson" },
          skill: "story",
          grammarTag: "statement",
          choices: [
            { text: "You're in good hands, Mr. Wilson.", zh: "威尔逊先生，你找对人了。", correct: true, xp: 10 },
            { text: "You're in trouble, Mr. Wilson.", correct: false }
          ],
          hintOnWrong: "用陈述句安慰对方 → You're in good hands, Mr. Wilson.",
          next: "n3"
        },
        n3: {
          npcLine: { en: "Mr. Wilson, you lost nothing. You gained thirty pounds, and you know the letter A very well now. Watson, do you understand it?", zh: "威尔逊先生，你什么都没损失。你赚了三十镑，还把字母 A 学了个透。华生，你看明白了吗？", voice: "holmes" },
          skill: "story",
          grammarTag: "short-answer",
          choices: [
            { text: "No, I don't. Not at all.", zh: "没有，完全没看明白。", correct: true, xp: 10 },
            { text: "Yes, I made it myself.", correct: false }
          ],
          hintOnWrong: "用 No, I don't 简短回答 → No, I don't. Not at all.",
          next: "n4"
        },
        n4: {
          npcLine: { en: "Neither do I, not yet. It's a three-pipe problem. Please don't speak to me for fifty minutes.", zh: "我也没有，暂时还没。这是个三斗烟的问题。五十分钟内请别跟我说话。", voice: "holmes" },
          skill: "story",
          grammarTag: "will-future",
          choices: [
            { text: "All right. I'll read the paper quietly.", zh: "好，我安静地看报。", correct: true, xp: 10 },
            { text: "Let's talk for an hour.", correct: false }
          ],
          hintOnWrong: "答应对方，用 I'll 说自己接下来做什么 → I'll read the paper quietly.",
          next: null
        }
      }
    },
    {
      id: "saxe-coburg-square",
      transition: {
        en: "That afternoon, Holmes takes you to Mr. Wilson's street. He stops in front of the pawnshop and taps the pavement with his walking stick.",
        zh: "当天下午，福尔摩斯带你去威尔逊先生的那条街。他在当铺门前停下，用手杖敲了敲人行道。"
      },
      title: "Tapping the Pavement",
      subtitle: "萨克斯-科伯格广场 · 当铺门口",
      avatar: "🕵️",
      startNode: "n1",
      nodes: {
        n1: {
          npcLine: { en: "Here's the pawnshop. Now watch this.", zh: "当铺就是这家。看好了。", voice: "holmes" },
          skill: "case",
          grammarTag: "present-continuous",
          choices: [
            { text: "Why are you hitting the ground with your stick?", zh: "你为什么用手杖敲地面？", correct: true, xp: 10 },
            { text: "Why are you sleeping?", correct: false }
          ],
          hintOnWrong: "问对方正在做什么 → Why are you hitting the ground with your stick?",
          next: "n2"
        },
        n2: {
          npcLine: { en: "I'm listening to the ground. Now let's knock and ask the assistant the way to the Strand.", zh: "我在听地下的动静。现在我们去敲门，向那个伙计问去斯特兰德街怎么走。", voice: "holmes" },
          skill: "case",
          grammarTag: "lets-suggestion",
          choices: [
            { text: "Good idea. Let's ask him.", zh: "好主意。我们去问他。", correct: true, xp: 10 },
            { text: "Let's go home.", correct: false }
          ],
          hintOnWrong: "同意提议 → Good idea. Let's ask him.",
          next: "n3"
        },
        n3: {
          avatar: "🧑",
          npcLine: { en: "The Strand? Third right, fourth left, sir.", zh: "斯特兰德街？第三个路口右转，第四个路口左转，先生。", voice: "spaulding" },
          skill: "case",
          grammarTag: "courtesy",
          choices: [
            { text: "Thank you, that's very kind.", zh: "谢谢，您真好。", correct: true, xp: 10 },
            { text: "No, thank you.", correct: false }
          ],
          hintOnWrong: "道谢 → Thank you, that's very kind.",
          next: "n4"
        },
        n4: {
          npcLine: { en: "Did you see his trousers, Watson? The knees were worn and dirty.", zh: "华生，你看见他的裤子了吗？膝盖那儿磨破了，脏兮兮的。", voice: "holmes" },
          skill: "case",
          grammarTag: "past-simple",
          choices: [
            { text: "I didn't notice. What does it mean?", zh: "我没注意。这说明什么？", correct: true, xp: 10 },
            { text: "He needs new shoes.", correct: false }
          ],
          hintOnWrong: "用 didn't 说自己没注意到，再追问 → I didn't notice. What does it mean?",
          next: null
        }
      }
    },
    {
      id: "bring-your-revolver",
      transition: {
        en: "After a concert, Holmes is silent for a long time. Then he finally speaks.",
        zh: "音乐会结束后，福尔摩斯沉默了很久。然后他终于开口。"
      },
      title: "Bring Your Revolver",
      subtitle: "音乐会之后 · 今晚有行动",
      avatar: "🕵️",
      startNode: "n1",
      nodes: {
        n1: {
          npcLine: { en: "Watson, a serious crime is planned for tonight. I need your help. Are you free?", zh: "华生，今晚有人要犯一桩大案。我需要你帮忙。你有空吗？", voice: "holmes" },
          skill: "case",
          grammarTag: "wh-question",
          choices: [
            { text: "Of course. When do we start?", zh: "当然。我们什么时候开始？", correct: true, xp: 10 },
            { text: "I'm busy tonight.", correct: false }
          ],
          hintOnWrong: "用 When 问时间 → When do we start?",
          next: "n2"
        },
        n2: {
          npcLine: { en: "Ten o'clock, back at Baker Street. Two other men will join us. And please bring your army revolver.", zh: "十点，回贝克街。还有两个人会来。另外，请带上你的军用左轮手枪。", voice: "holmes" },
          skill: "case",
          grammarTag: "will-future",
          choices: [
            { text: "I'll bring it. Is it dangerous?", zh: "我会带的。危险吗？", correct: true, xp: 10 },
            { text: "I'll bring my violin.", correct: false }
          ],
          hintOnWrong: "用 I'll 答应，再确认 → I'll bring it. Is it dangerous?",
          next: "n3"
        },
        n3: {
          npcLine: { en: "Possibly. The man we want is John Clay. A thief, and a very clever one.", zh: "有可能。我们要抓的人叫约翰·克莱。一个贼，而且非常狡猾。", voice: "holmes" },
          skill: "case",
          grammarTag: "do-question",
          choices: [
            { text: "Who is he? Do you know him?", zh: "他是谁？你认识他？", correct: true, xp: 10 },
            { text: "Is he a doctor?", correct: false }
          ],
          hintOnWrong: "用 Do you 问对方认不认识 → Do you know him?",
          next: "n4"
        },
        n4: {
          npcLine: { en: "I know of him. He's the pawnshop assistant. Now go and rest. It'll be a long night.", zh: "我听说过他。他就是当铺那个伙计。现在去休息吧。今晚会很长。", voice: "holmes" },
          skill: "case",
          grammarTag: "please-request",
          choices: [
            { text: "All right. Please knock on my door at half past nine.", zh: "好。请九点半敲我的门。", correct: true, xp: 10 },
            { text: "Please wake me next week.", correct: false }
          ],
          hintOnWrong: "用 Please 提出请求 → Please knock on my door at half past nine.",
          next: null
        }
      }
    },
    {
      id: "the-bank-cellar",
      transition: {
        en: "Ten o'clock. Two men are waiting at Baker Street: a police inspector and a bank director. A cab takes you all across the city to the bank.",
        zh: "十点。贝克街上等着两个人：一位警探和一位银行经理。一辆马车载着你们穿过城市，来到银行。"
      },
      title: "The Bank Cellar",
      subtitle: "城市银行地下室 · 守夜",
      avatar: "🎩",
      startNode: "n1",
      nodes: {
        n1: {
          npcLine: { en: "Dr. Watson? Merryweather, director of the City Bank. Our cellar is right behind that pawnshop, you know.", zh: "华生医生？我是梅里韦瑟，城市银行的经理。我们的地下室就在那家当铺后面。", voice: "merryweather" },
          skill: "case",
          grammarTag: "present-continuous",
          choices: [
            { text: "Pleased to meet you. Are we going there now?", zh: "幸会。我们现在就去那儿吗？", correct: true, xp: 10 },
            { text: "Do you sell fish?", correct: false }
          ],
          hintOnWrong: "问接下来是不是要去 → Are we going there now?",
          next: "n2"
        },
        n2: {
          npcLine: { en: "Down these stairs, gentlemen. Mind the boxes. They hold two thousand gold coins from the Bank of France.", zh: "各位，走这边楼梯下去。小心那些箱子。里面是法兰西银行的两千枚金币。", voice: "merryweather" },
          skill: "case",
          grammarTag: "statement",
          choices: [
            { text: "Gold! Now I understand.", zh: "金子！现在我明白了。", correct: true, xp: 10 },
            { text: "Gold! Can I take some?", correct: false }
          ],
          hintOnWrong: "用陈述句说自己明白了 → Gold! Now I understand.",
          next: "n3"
        },
        n3: {
          avatar: "🕵️",
          npcLine: { en: "Quiet now. Put out the lantern and wait in the dark. Not a sound.", zh: "现在安静。灭掉提灯，在黑暗里等着。别出声。", voice: "holmes" },
          skill: "case",
          grammarTag: "wh-question",
          choices: [
            { text: "Understood. How long do we wait?", zh: "明白。我们要等多久？", correct: true, xp: 10 },
            { text: "Can I sing a song?", correct: false }
          ],
          hintOnWrong: "用 How long 问要多久 → How long do we wait?",
          next: "n4"
        },
        n4: {
          avatar: "🕵️",
          npcLine: { en: "An hour, perhaps. Look, a light between the stones! He's coming up through the floor.", zh: "大概一个小时吧。看，石板缝里有光！他正从地板下面钻上来。", voice: "holmes" },
          skill: "case",
          grammarTag: "statement",
          choices: [
            { text: "I'm ready. My revolver is in my hand.", zh: "我准备好了。手枪就在我手里。", correct: true, xp: 10 },
            { text: "I'm sleeping.", correct: false }
          ],
          hintOnWrong: "用陈述句说明自己的状态 → I'm ready. My revolver is in my hand.",
          next: "n5"
        },
        n5: {
          avatar: "👮",
          npcLine: { en: "Got him! John Clay, you are under arrest.", zh: "抓住了！约翰·克莱，你被捕了。", voice: "jones" },
          skill: "case",
          grammarTag: "past-simple",
          choices: [
            { text: "Well done! We caught him.", zh: "干得好！我们抓住他了。", correct: true, xp: 10 },
            { text: "Let him go.", correct: false }
          ],
          hintOnWrong: "用过去时说刚发生的事 → We caught him.",
          next: null
        }
      }
    },
    {
      id: "three-pipes-and-a-tunnel",
      transition: {
        en: "Early morning, back at Baker Street. Holmes pours two glasses of whisky.",
        zh: "凌晨，回到贝克街。福尔摩斯倒了两杯威士忌。"
      },
      title: "Three Pipes and a Tunnel",
      subtitle: "贝克街 · 天亮前的复盘",
      avatar: "🕵️",
      startNode: "n1",
      nodes: {
        n1: {
          npcLine: { en: "It was clear from the start, Watson. The League was a trick to get Mr. Wilson out of his shop every morning.", zh: "从一开始就很清楚，华生。红发会是个骗局，为的是每天上午把威尔逊先生支出店去。", voice: "holmes" },
          skill: "case",
          grammarTag: "connector",
          choices: [
            { text: "So Spaulding wanted the shop to himself?", zh: "所以斯波尔丁想一个人待在店里？", correct: true, xp: 10 },
            { text: "So Wilson is the thief?", correct: false }
          ],
          hintOnWrong: "想把威尔逊支开的是店员斯波尔丁，不是威尔逊自己 → So Spaulding wanted the shop to himself?",
          next: "n2"
        },
        n2: {
          npcLine: { en: "Exactly. Half pay, a cellar, dirty knees. He was digging a tunnel to the bank.", zh: "正是。一半工钱、一间地下室、脏膝盖。他在挖一条通往银行的地道。", voice: "holmes" },
          skill: "case",
          grammarTag: "past-simple",
          choices: [
            { text: "So you tapped the ground to find the tunnel.", zh: "所以你敲地面是为了找那条地道。", correct: true, xp: 10 },
            { text: "So you dug the tunnel.", correct: false }
          ],
          hintOnWrong: "地道是斯波尔丁挖的，福尔摩斯敲地面是为了找它 → So you tapped the ground to find the tunnel.",
          next: "n3"
        },
        n3: {
          npcLine: { en: "And the League closed because the tunnel was finished. They didn't need Mr. Wilson out of the way any more.", zh: "而红发会解散，是因为地道挖通了。他们不再需要把威尔逊先生支开了。", voice: "holmes" },
          skill: "case",
          grammarTag: "wh-question",
          choices: [
            { text: "Amazing. How did you know it was tonight?", zh: "太厉害了。你怎么知道是今晚？", correct: true, xp: 10 },
            { text: "How old are you?", correct: false }
          ],
          hintOnWrong: "用 How did you know 问对方怎么知道的 → How did you know it was tonight?",
          next: "n4"
        },
        n4: {
          npcLine: { en: "Saturday. The bank is closed on Sunday, so they had two days to get away. Now, Watson, I think I've earned some sleep.", zh: "周六。银行周日不开门，所以他们有两天时间逃走。好了，华生，我想我该睡一觉了。", voice: "holmes" },
          skill: "case",
          grammarTag: "courtesy",
          choices: [
            { text: "Sleep well, Holmes. And thank you.", zh: "好好睡一觉，福尔摩斯。谢谢你。", correct: true, xp: 10 },
            { text: "Wake up, Holmes!", correct: false }
          ],
          hintOnWrong: "祝对方睡个好觉并致谢 → Sleep well, Holmes. And thank you.",
          next: "n5"
        },
        n5: {
          avatar: "👩‍🦳",
          npcLine: { en: "Excuse me, gentlemen. This letter came for Mr. Holmes last night, while you were out. No name, only a crown on the paper.", zh: "打扰了，先生们。这封信是昨晚你们出门时送来的，给福尔摩斯先生。没有署名，纸上只有一个王冠。", voice: "hudson" },
          skill: "case",
          grammarTag: "wh-question",
          choices: [
            { text: "A crown? Who is it from?", zh: "王冠？是谁寄来的？", correct: true, xp: 10 },
            { text: "Is it for me?", correct: false }
          ],
          hintOnWrong: "用 Who 问信是谁寄的 → Who is it from?",
          next: null
        }
      }
    }
  ]
};
