// 内容数据层：第九十五章，紧接第九十四章——同一个 GAME_CONTENT 对象继续 push。
// index.html 里这个文件排在 chapter94.js 之后、audio-manifest.js 之前加载。
//
// Tier: L4（不引入新grammarTag，复现 past-perfect / conditional-advanced / reported-speech /
// relative-clause / subjunctive / concession / passive / present-perfect 等 L3-L4 结构）
// 主线结局章（chapter-index 里 kind: "main"）。设计精华第 1 条：故事必须有真正的结局。
// 第 22 到 94 章的"生活体验"是番外，主线在第 21 章求婚之后一直没有收束——这一章把
// 家族信件线和"十年之约"主题一起收尾：
//
// 剧情：Ho太太打电话来，Uncle Lok在老房子（Lily's House）修地板时发现了Lily留下的最后
// 一封信，收信人写的是"十年后住在这栋房子里的人"。周六全家回到老房子，Ho太太、David、
// Uncle Lok、Sam和他的学生、图书管理员Mr. Grant都来了。Emma读信：Lily写道，如果有人读到
// 这封信，说明信件的传统起作用了，请写下一封。两人决定给女儿小Lily写一封信，约定她
// 十一岁时打开——正是Emma当年给主角写信的年纪。信封封好，放回地板下，跟当年的信放在
// 一起。深夜门廊上，两人在同一片星空下收尾："这不是故事的结束，只是我们的十年把笔递给
// 了她的十年。"
//
// 写作规则（设计精华第 5、8 条）：错误选项是"语法近似但错"（时态错/主谓不一致/反义疑问
// 错/双重否定等），不用靠常识就能排除的荒谬句；grammarTag 只标玩家正确选项里能推出来的
// 结构。跑 `node scripts/validate-curriculum.mjs --strict` 校验。

GAME_CONTENT.scenes.push(
  {
    id: "a-call-from-mrs-ho",
    transition: { en: "One quiet evening, the phone rings. It's a voice they haven't heard in a while.", zh: "一个安静的夜晚，电话响了。是一个好久没听到的声音。" },
    title: "A Call from Mrs. Ho",
    subtitle: "家里 · Ho太太的电话",
    avatar: "📞",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "It's Mrs. Ho. I hope I'm not calling too late, dear.", zh: "我是Ho太太。希望没打扰你太晚，亲爱的。", voice: "ho" },
        skill: "community",
        grammarTag: "statement",
        choices: [
          { text: "Not at all, it's so good to hear your voice.", zh: "一点也不晚，能听到您的声音真好。", correct: true, xp: 10 },
          { text: "Not at all, it's so good to hearing your voice.", correct: false }
        ],
        hintOnWrong: "so good to + 动词原形 → Not at all, it's so good to hear your voice.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "Uncle Lok found something in the old house that he says you both need to see.", zh: "Lok叔叔在老房子里发现了一样东西，他说你们俩都得来看看。", voice: "ho" },
        skill: "community",
        grammarTag: "statement",
        choices: [
          { text: "Something Lily wrote? Now you have my full attention.", zh: "是Lily写的东西？现在您完全抓住我的注意力了。", correct: true, xp: 10 },
          { text: "Something Lily writes? Now you have my full attention.", correct: false }
        ],
        hintOnWrong: "Lily 是过去的人，要用过去式 wrote → Something Lily wrote? Now you have my full attention.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "Come Saturday, and bring little Lily. He insists the whole family should be there.", zh: "周六来吧，把小Lily也带上。他坚持要全家都到场。", voice: "ho" },
        skill: "community",
        grammarTag: "will-future",
        choices: [
          { text: "We'll be there, and we wouldn't miss it for anything.", zh: "我们一定到，说什么也不会错过。", correct: true, xp: 10 },
          { text: "We'll be there, and we wouldn't miss it for nothing.", correct: false }
        ],
        hintOnWrong: "wouldn't miss it for anything 是固定说法，不能双重否定 → We'll be there, and we wouldn't miss it for anything.",
        next: null
      }
    }
  },
  {
    id: "back-at-lilys-house",
    transition: { en: "Saturday afternoon. The old house on the corner has a fresh coat of paint and a small crowd inside.", zh: "周六下午。街角的老房子刷了新漆，屋里已经聚了一小群人。" },
    title: "Back at Lily's House",
    subtitle: "老房子 · 重回 Lily's House",
    avatar: "🏡",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "Look who's here! She's grown so much since the last time we saw her.", zh: "看看是谁来了！上次见到她之后她长大了好多。", voice: "ho" },
        skill: "community",
        grammarTag: "present-perfect",
        choices: [
          { text: "She has grown fast, and she already loves this place.", zh: "她长得是快，而且她已经喜欢上这个地方了。", correct: true, xp: 10 },
          { text: "She has grow fast, and she already loves this place.", correct: false }
        ],
        hintOnWrong: "现在完成时 has + 过去分词 grown → She has grown fast, and she already loves this place.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "Mom has been talking about this evening all week, honestly.", zh: "说实话，我妈这一整周都在念叨今晚。" },
        skill: "community",
        grammarTag: "statement",
        choices: [
          { text: "So have we, David. This house pulls everyone back.", zh: "我们也是，David。这栋房子会把每个人都拉回来。", correct: true, xp: 10 },
          { text: "So have we, David. This house pull everyone back.", correct: false }
        ],
        hintOnWrong: "第三人称单数 this house 后动词加 s → So have we, David. This house pulls everyone back.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "Emma's grandmother used to stand right where you're standing now.", zh: "Emma的祖母以前就常站在你现在站的这个位置。", voice: "ho" },
        skill: "community",
        grammarTag: "present-continuous",
        choices: [
          { text: "Then I'm standing in the right place tonight.", zh: "那我今晚站对地方了。", correct: true, xp: 10 },
          { text: "Then I'm stand in the right place tonight.", correct: false }
        ],
        hintOnWrong: "现在进行时 am + 动词-ing → Then I'm standing in the right place tonight.",
        next: null
      }
    }
  },
  {
    id: "uncle-loks-box",
    transition: { en: "Uncle Lok, slower now but smiling, carries a small wooden box to the table.", zh: "Lok叔叔走得慢了，但笑着把一个小木盒端到桌上。" },
    title: "Uncle Lok's Box",
    subtitle: "老房子 · 地板下的木盒",
    avatar: "📦",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "When the floor was repaired last month, the workers found this under the boards.", zh: "上个月修地板的时候，工人在木板底下发现了这个。" },
        skill: "housing",
        grammarTag: "passive",
        choices: [
          { text: "Under the boards? It must have been hidden there for decades.", zh: "在木板底下？那它肯定在那儿藏了几十年了。", correct: true, xp: 10 },
          { text: "Under the boards? It must has been hidden there for decades.", correct: false }
        ],
        hintOnWrong: "情态动词后面用 have 不用 has → Under the boards? It must have been hidden there for decades.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "There's one more letter from Lily, and it isn't addressed to anyone we know.", zh: "里面还有一封Lily的信，收信人不是我们认识的任何人。" },
        skill: "housing",
        grammarTag: "wh-question",
        choices: [
          { text: "Who did she write it to, then?", zh: "那她是写给谁的？", correct: true, xp: 10 },
          { text: "Who she wrote it to, then?", correct: false }
        ],
        hintOnWrong: "特殊疑问句要有助动词 did → Who did she write it to, then?",
        next: "n3"
      },
      n3: {
        npcLine: { en: "The envelope says: to whoever is living in this house in ten years.", zh: "信封上写着：致十年后住在这栋房子里的人。" },
        skill: "housing",
        grammarTag: "relative-clause",
        choices: [
          { text: "Whoever is living here... that's us, and that's little Lily.", zh: "十年后住在这里的人……就是我们，还有小Lily。", correct: true, xp: 10 },
          { text: "Whoever living here... that's us, and that's little Lily.", correct: false }
        ],
        hintOnWrong: "whoever 引导的从句要有动词 is → Whoever is living here... that's us, and that's little Lily.",
        next: null
      }
    }
  },
  {
    id: "the-last-letter",
    transition: { en: "Emma unfolds the yellowed pages and reads aloud, her voice steady until the last line.", zh: "Emma展开泛黄的信纸大声读了起来，声音一直很稳，直到最后一行。" },
    title: "The Last Letter",
    subtitle: "老房子 · 最后一封信",
    avatar: "💌",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "She wrote that if this house was still standing, someone had kept the promise.", zh: "她写道，如果这栋房子还立着，就说明有人守住了承诺。", voice: "emma" },
        skill: "community",
        grammarTag: "reported-speech",
        choices: [
          { text: "She admitted that she wasn't sure anyone would stay.", zh: "她承认自己当时并不确定会有人留下来。", correct: true, xp: 10 },
          { text: "She admitted that she isn't sure anyone would stay.", correct: false }
        ],
        hintOnWrong: "间接引语时态要后移：admitted that she wasn't → She admitted that she wasn't sure anyone would stay.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "Then she wrote: 'If you are reading this, the letters worked. Please write the next one.'", zh: "然后她写道：'如果你正在读这封信，说明这些信起作用了。请写下一封。'", voice: "emma" },
        skill: "community",
        grammarTag: "conditional-advanced",
        choices: [
          { text: "If she hadn't written that, we might never have thought of it.", zh: "如果她没写这句，我们可能永远想不到。", correct: true, xp: 10 },
          { text: "If she hadn't wrote that, we might never have thought of it.", correct: false }
        ],
        hintOnWrong: "第三条件句 if + hadn't + 过去分词 written → If she hadn't written that, we might never have thought of it.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "The last line just says: 'Love travels slower than mail, but it always arrives.'", zh: "最后一行只写着：'爱比信走得慢，但它总会到。'", voice: "emma" },
        skill: "community",
        grammarTag: "comparative",
        choices: [
          { text: "That's the truest thing I've heard in this house.", zh: "这是我在这栋房子里听过最真的一句话。", correct: true, xp: 10 },
          { text: "That's the most true thing I've heard in this house.", correct: false }
        ],
        hintOnWrong: "单音节形容词最高级加 -est：the truest → That's the truest thing I've heard in this house.",
        next: null
      }
    }
  },
  {
    id: "sam-and-the-students",
    transition: { en: "The front door opens again. Sam walks in with a group from the east-end classroom.", zh: "前门又开了。Sam带着东区教室的一群学生走了进来。" },
    title: "Sam and the Students",
    subtitle: "老房子 · Sam 和他的学生",
    avatar: "🎓",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "Sorry we're late, the streetcar took forever. Everyone insisted on coming.", zh: "抱歉来晚了，电车慢得要命。大家都坚持要来。" },
        skill: "community",
        grammarTag: "do-question",
        choices: [
          { text: "You brought the whole class? Lily would have loved this.", zh: "你把全班都带来了？Lily要是看到一定很高兴。", correct: true, xp: 10 },
          { text: "You brought the whole class? Lily would loved this.", correct: false }
        ],
        hintOnWrong: "would have + 过去分词 → You brought the whole class? Lily would have loved this.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "Remember when I told you I was scared to stand in front of a room?", zh: "还记得我跟你说过我害怕站在一屋子人面前吗？" },
        skill: "community",
        grammarTag: "connector",
        choices: [
          { text: "I remember, and now you run a whole school of your own.", zh: "我记得，而现在你自己办了一整所学校。", correct: true, xp: 10 },
          { text: "I remember, and now you runs a whole school of your own.", correct: false }
        ],
        hintOnWrong: "主语 you 后动词用原形 run → I remember, and now you run a whole school of your own.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "None of this would exist if you hadn't come back for that promise.", zh: "如果你当年没有为了那个约定回来，这一切都不会存在。" },
        skill: "community",
        grammarTag: "concession",
        choices: [
          { text: "Maybe not, though the letters were already here before me.", zh: "也许吧，不过这些信在我来之前就已经在这儿了。", correct: true, xp: 10 },
          { text: "Maybe not, though the letters was already here before me.", correct: false }
        ],
        hintOnWrong: "复数主语 the letters 配 were → Maybe not, though the letters were already here before me.",
        next: null
      }
    }
  },
  {
    id: "a-toast-to-lily",
    transition: { en: "Mr. Grant, the librarian who found the first clipping, taps his glass.", zh: "当年找到第一张剪报的图书管理员Mr. Grant敲了敲杯子。" },
    title: "A Toast to Lily",
    subtitle: "老房子 · 为 Lily 举杯",
    avatar: "🥂",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "I've spent forty years among letters, and none of them were as stubborn as Lily's.", zh: "我跟信件打了四十年交道，没有一封像Lily的信这么固执。" },
        skill: "community",
        grammarTag: "comparative",
        choices: [
          { text: "Stubborn is the kindest word for it, Mr. Grant.", zh: "'固执'已经是最客气的说法了，Mr. Grant。", correct: true, xp: 10 },
          { text: "Stubborn is the most kind word for it, Mr. Grant.", correct: false }
        ],
        hintOnWrong: "kind 的最高级是 kindest，不用 most → Stubborn is the kindest word for it, Mr. Grant.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "To the woman who wrote to strangers, and to the strangers who became family.", zh: "敬那位给陌生人写信的女士，也敬那些变成了家人的陌生人。" },
        skill: "community",
        grammarTag: "relative-clause",
        choices: [
          { text: "To Lily, who never met us but somehow knew us anyway.", zh: "敬Lily，她从没见过我们，却不知怎么就懂我们。", correct: true, xp: 10 },
          { text: "To Lily, which never met us but somehow knew us anyway.", correct: false }
        ],
        hintOnWrong: "指人用 who 不用 which → To Lily, who never met us but somehow knew us anyway.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "Although she never saw this room full, I think she always expected it.", zh: "虽然她从没见过这间屋子坐满人，我想她一直都料到了。" },
        skill: "community",
        grammarTag: "concession",
        choices: [
          { text: "Although she never saw it, she wrote as if she had.", zh: "虽然她从没见过，可她写得就像见过一样。", correct: true, xp: 10 },
          { text: "Although she never see it, she wrote as if she had.", correct: false }
        ],
        hintOnWrong: "never 后面用过去式 saw → Although she never saw it, she wrote as if she had.",
        next: null
      }
    }
  },
  {
    id: "the-next-promise",
    transition: { en: "Later, in the quiet kitchen, Emma sets a blank sheet of paper on the table.", zh: "晚些时候，安静的厨房里，Emma把一张空白信纸放到桌上。" },
    title: "The Next Promise",
    subtitle: "厨房 · 下一个约定",
    avatar: "📝",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "I wish Grandma could see how far her ten letters traveled.", zh: "真希望外婆能看到她那十封信走了多远。", voice: "emma" },
        skill: "community",
        grammarTag: "subjunctive",
        choices: [
          { text: "I wish she could too, but tonight she's in every word.", zh: "我也希望她能看到，不过今晚每一个字里都有她。", correct: true, xp: 10 },
          { text: "I wish she can too, but tonight she's in every word.", correct: false }
        ],
        hintOnWrong: "I wish 后面用过去式表虚拟：could → I wish she could too, but tonight she's in every word.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "What if we wrote one for our Lily, to open when she turns eleven?", zh: "要不我们也给我们的Lily写一封，等她十一岁的时候打开？", voice: "emma" },
        skill: "community",
        grammarTag: "will-future",
        choices: [
          { text: "Ten years from now? That's a decade she'll have to wait.", zh: "十年后？那她得等上整整十年。", correct: true, xp: 10 },
          { text: "Ten years from now? That's a decade she'll has to wait.", correct: false }
        ],
        hintOnWrong: "will 后面接动词原形 have → Ten years from now? That's a decade she'll have to wait.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "If she reads it at eleven, she'll be exactly the age I was when I wrote to you.", zh: "如果她十一岁读到它，正好是我当年给你写信的年纪。", voice: "emma" },
        skill: "community",
        grammarTag: "do-question",
        choices: [
          { text: "Then the promise comes full circle, doesn't it?", zh: "那这个约定就绕了一整圈回到原点了，是不是？", correct: true, xp: 10 },
          { text: "Then the promise comes full circle, isn't it?", correct: false }
        ],
        hintOnWrong: "反义疑问句要跟主句动词 comes 对应，用 doesn't it → Then the promise comes full circle, doesn't it?",
        next: null
      }
    }
  },
  {
    id: "writing-to-lily",
    transition: { en: "Two pens, one page. They take turns writing.", zh: "两支笔，一张纸。两人轮流写。" },
    title: "Writing to Lily",
    subtitle: "厨房 · 写给小 Lily 的信",
    avatar: "✒️",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "You start. Tell her what this house had already been before she was born.", zh: "你先写。告诉她在她出生之前，这栋房子已经是什么了。", voice: "emma" },
        skill: "community",
        grammarTag: "past-perfect",
        choices: [
          { text: "By the time you arrived, this house had already saved two families.", zh: "在你来到这个世界之前，这栋房子已经救过两个家庭。", correct: true, xp: 10 },
          { text: "By the time you arrived, this house has already saved two families.", correct: false }
        ],
        hintOnWrong: "过去完成时 had already + 过去分词 → By the time you arrived, this house had already saved two families.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "Now tell her the truth about her father, the one who almost didn't come back.", zh: "现在跟她说说她爸爸的实话，那个差点没有回来的人。", voice: "emma" },
        skill: "community",
        grammarTag: "past-simple",
        choices: [
          { text: "I nearly stayed away, but a promise kept pulling me home.", zh: "我差点就没回来，但一个约定一直把我往家里拉。", correct: true, xp: 10 },
          { text: "I nearly stay away, but a promise kept pulling me home.", correct: false }
        ],
        hintOnWrong: "讲过去的事用过去式 stayed → I nearly stayed away, but a promise kept pulling me home.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "Should we tell her that the letters were her great-grandmother's idea?", zh: "要不要告诉她，写信这件事是她曾外婆的主意？", voice: "emma" },
        skill: "community",
        grammarTag: "passive",
        choices: [
          { text: "Yes, tell her the letters were written by someone who loved strangers.", zh: "要，告诉她这些信是一个爱着陌生人的人写的。", correct: true, xp: 10 },
          { text: "Yes, tell her the letters were wrote by someone who loved strangers.", correct: false }
        ],
        hintOnWrong: "被动语态 were + 过去分词 written → Yes, tell her the letters were written by someone who loved strangers.",
        next: null
      }
    }
  },
  {
    id: "sealing-the-envelope",
    transition: { en: "Mrs. Ho brings an empty envelope from the same box, as if she had known all along.", zh: "Ho太太从同一个木盒里拿出一个空信封，仿佛她早就知道会有这一刻。" },
    title: "Sealing the Envelope",
    subtitle: "老房子 · 封上信封",
    avatar: "✉️",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "This house has kept letters safe for forty years. It can keep one more.", zh: "这栋房子把信安安稳稳地守了四十年。再多守一封也没问题。", voice: "ho" },
        skill: "housing",
        grammarTag: "relative-clause",
        choices: [
          { text: "Then it goes back to the place where the others waited.", zh: "那就把它放回其他信等过的那个地方。", correct: true, xp: 10 },
          { text: "Then it goes back to the place which the others waited.", correct: false }
        ],
        hintOnWrong: "表示地点的定语从句用 where → Then it goes back to the place where the others waited.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "Write the date on the front, so she knows how long it traveled.", zh: "在信封正面写上日期，这样她就知道这封信走了多久。", voice: "ho" },
        skill: "housing",
        grammarTag: "present-perfect",
        choices: [
          { text: "I've written today's date and the year she should open it.", zh: "我写好了今天的日期，还有她该打开它的那一年。", correct: true, xp: 10 },
          { text: "I've wrote today's date and the year she should open it.", correct: false }
        ],
        hintOnWrong: "现在完成时 have + 过去分词 written → I've written today's date and the year she should open it.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "David says he'll check on it every spring, just in case.", zh: "David说他每年春天都会来看一眼，以防万一。", voice: "ho" },
        skill: "housing",
        grammarTag: "reported-speech",
        choices: [
          { text: "He said he'd check every spring? That's Ho family loyalty.", zh: "他说他每年春天都来看？这就是Ho家的忠诚。", correct: true, xp: 10 },
          { text: "He said him would check every spring? That's Ho family loyalty.", correct: false }
        ],
        hintOnWrong: "间接引语从句里的主语用 he 不用 him → He said he'd check every spring? That's Ho family loyalty.",
        next: null
      }
    }
  },
  {
    id: "under-the-same-stars",
    transition: { en: "Midnight. The guests have gone. Emma and you sit on the porch with Lily asleep between you.", zh: "午夜。客人都走了。你和Emma坐在门廊上，Lily在你们中间睡着了。" },
    title: "Under the Same Stars",
    subtitle: "门廊 · 同一片星空",
    avatar: "🌌",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "Ten years ago tonight, I didn't know if you'd come. Now look at us.", zh: "十年前的今晚，我不知道你会不会来。现在看看我们。", voice: "emma" },
        skill: "community",
        grammarTag: "present-perfect",
        choices: [
          { text: "You waited, I came, and everything since has been the reward.", zh: "你等了，我来了，之后的一切都是回报。", correct: true, xp: 10 },
          { text: "You waited, I came, and everything since has be the reward.", correct: false }
        ],
        hintOnWrong: "现在完成时 has + 过去分词 been → You waited, I came, and everything since has been the reward.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "Do you think she'll understand the letter when she opens it?", zh: "你觉得她打开信的时候能看懂吗？", voice: "emma" },
        skill: "community",
        grammarTag: "conditional",
        choices: [
          { text: "If she doesn't, she'll have ten more years to grow into it.", zh: "如果看不懂，她还有十年可以慢慢长大去懂它。", correct: true, xp: 10 },
          { text: "If she don't, she'll have ten more years to grow into it.", correct: false }
        ],
        hintOnWrong: "第三人称单数 she 配 doesn't → If she doesn't, she'll have ten more years to grow into it.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "So this isn't the end of the story, is it?", zh: "所以这不是故事的结局，对吧？", voice: "emma" },
        skill: "community",
        grammarTag: "relative-clause",
        choices: [
          { text: "No. It's just where our decade hands the pen to hers.", zh: "不是。这只是我们的十年把笔递给她的十年的地方。", correct: true, xp: 10 },
          { text: "No. It's just where our decade hand the pen to hers.", correct: false }
        ],
        hintOnWrong: "第三人称单数 our decade 后动词加 s → No. It's just where our decade hands the pen to hers.",
        next: null
      }
    }
  }
);

GAME_CONTENT.vocabBank.push(
  { en: "attention", zh: "注意力", category: "community" },
  { en: "insists", zh: "坚持（要求）", category: "community" },
  { en: "envelope", zh: "信封", category: "community" },
  { en: "yellowed", zh: "泛黄的", category: "community" },
  { en: "addressed", zh: "写明收信人的", category: "community" },
  { en: "whoever", zh: "无论是谁", category: "community" },
  { en: "boards", zh: "地板木板", category: "housing" },
  { en: "decades", zh: "几十年", category: "community" },
  { en: "admitted", zh: "承认", category: "community" },
  { en: "stubborn", zh: "固执的", category: "community" },
  { en: "strangers", zh: "陌生人", category: "community" },
  { en: "librarian", zh: "图书管理员", category: "community" },
  { en: "clipping", zh: "剪报", category: "community" },
  { en: "full circle", zh: "绕一圈回到原点", category: "community" },
  { en: "loyalty", zh: "忠诚", category: "community" },
  { en: "reward", zh: "回报", category: "community" },
  { en: "porch", zh: "门廊", category: "housing" },
  { en: "hands the pen", zh: "把笔递给（比喻交棒）", category: "community" }
);
