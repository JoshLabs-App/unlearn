// 内容数据层：「福尔摩斯 · 贝克街」第三章，接第二章结尾哈德森太太送来的那封电报。
// @chapter-title 第三章 · 身份案
// @chapter-subtitle 打字机上的破绽
// 跟前两章同一个 BAKER_STREET_CONTENT 对象继续 push。
//
// 改编来源（公有领域）：Arthur Conan Doyle, A Case of Identity (1891)。
// 剧情按原著走：玛丽·萨瑟兰的年金 → 煤气工舞会上认识霍斯默·安吉尔 → 安吉尔只在
// 继父出差时露面、戴墨镜、压着嗓子说话、所有信件连签名都是打字的 → 婚礼当天他坐进
// 马车凭空消失 → 福尔摩斯从打字机的字母磨损认出安吉尔就是继父温迪班克本人 →
// 动机是保住玛丽那份年金 → 福尔摩斯没把真相告诉玛丽（她不会信），只把温迪班克赶走。
//
// Tier: L2（跟第一、二章同一个 tier）。不引入新 grammarTag，纯复现前两章那十二个。
// 台词里不用破折号：Qwen3 遇到 "—" 会把音拖得很长（第二章国王那句踩过这个坑）。
//
// 配音：新角色 mary（玛丽·萨瑟兰，年轻、急切、话多）、windibank（继父，油滑、闪烁）。
// 需要同步 scripts/tts_qwen3.py 的 ROLE_VOICES 和 generate-audio.mjs 的 ROLES。
//
// 结尾钩子指向《蓝宝石案》（圣诞节、鹅、宝石，同样没有命案），把有命案的篇目留到后面。

BAKER_STREET_CONTENT.scenes.push(
  {
    id: "a-lady-at-eleven",
    transition: {
      en: "Eleven o'clock. A large young woman comes up the stairs, out of breath, turning a pair of gloves over and over in her hands.",
      zh: "十一点。一位身材高大的年轻女子上了楼，气喘吁吁，两只手把一副手套翻来覆去地捏着。"
    },
    title: "A Lady at Eleven",
    subtitle: "贝克街 221B · 十一点的客人",
    avatar: "👒",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "Mr Holmes? My name is Mary Sutherland. I want you to find a man.", zh: "福尔摩斯先生？我叫玛丽·萨瑟兰。我想请您找一个人。", voice: "mary" },
        skill: "meeting",
        grammarTag: "wh-question",
        choices: [
          { text: "Who is the man you want to find?", zh: "您想找的这个人是谁？", correct: true, xp: 10 },
          { text: "Who is the man you want find?", correct: false }
        ],
        hintOnWrong: "want 后面接 to + 动词 → the man you want to find?",
        next: "n2"
      },
      n2: {
        npcLine: { en: "Mr Hosmer Angel. We were going to marry last Friday. He got into the carriage and he never arrived at the church.", zh: "霍斯默·安吉尔先生。我们上周五本该结婚的。他坐进了马车，然后再也没到教堂。", voice: "mary" },
        skill: "story",
        grammarTag: "do-question",
        choices: [
          { text: "Did anyone see him get out?", zh: "有人看见他下车吗？", correct: true, xp: 10 },
          { text: "Did anyone saw him get out?", correct: false }
        ],
        hintOnWrong: "Did 后面跟动词原形 → Did anyone see him get out?",
        next: "n3"
      },
      n3: {
        npcLine: { en: "Nobody. The driver opened the door at the church and the carriage was empty.", zh: "没有。车夫在教堂门口打开车门，车里是空的。", voice: "mary" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "That's a very strange thing.", zh: "这可真是件怪事。", correct: true, xp: 10 },
          { text: "That's a very strange things.", correct: false }
        ],
        hintOnWrong: "a 后面用单数 → a very strange thing.",
        next: "n4"
      },
      n4: {
        avatar: "🕵️",
        npcLine: { en: "Sit down, Miss Sutherland, and start at the beginning. Tell us about your family first.", zh: "萨瑟兰小姐，请坐，从头讲起。先说说您家里的情况。", voice: "holmes" },
        skill: "case",
        grammarTag: "please-request",
        choices: [
          { text: "Please take your time, miss.", zh: "小姐，您慢慢说。", correct: true, xp: 10 },
          { text: "Please taking your time, miss.", correct: false }
        ],
        hintOnWrong: "Please 后面跟动词原形 → Please take your time.",
        next: null
      }
    }
  },
  {
    id: "a-hundred-a-year",
    title: "A Hundred a Year",
    subtitle: "贝克街 221B · 一年一百镑",
    avatar: "👒",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "My father died and left me some money. My uncle in New Zealand left me more. I have a hundred pounds a year.", zh: "我父亲去世时给我留了一点钱。我在新西兰的叔叔又留了一些。我一年有一百镑的进项。", voice: "mary" },
        skill: "story",
        grammarTag: "do-question",
        choices: [
          { text: "Do you keep that money yourself?", zh: "这笔钱您自己拿着吗？", correct: true, xp: 10 },
          { text: "Do you keeps that money yourself?", correct: false }
        ],
        hintOnWrong: "Do you 后面用动词原形 → Do you keep that money yourself?",
        next: "n2"
      },
      n2: {
        npcLine: { en: "No. I give it all to my mother and my stepfather. I earn a little by typing, and that is enough for me.", zh: "不。我全给了母亲和继父。我打字挣一点，够我自己用了。", voice: "mary" },
        skill: "story",
        grammarTag: "statement",
        choices: [
          { text: "So they live on your money.", zh: "所以他们靠您的钱过日子。", correct: true, xp: 10 },
          { text: "So they lives on your money.", correct: false }
        ],
        hintOnWrong: "they 后面用动词原形 → So they live on your money.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "My stepfather is much younger than my mother. His name is James Windibank. He sells wine and travels to France very often.", zh: "我继父比我母亲年轻很多。他叫詹姆斯·温迪班克。他卖酒，经常去法国。", voice: "mary" },
        skill: "story",
        grammarTag: "wh-question",
        choices: [
          { text: "How does he treat you at home?", zh: "他在家里怎么对您？", correct: true, xp: 10 },
          { text: "How he does treat you at home?", correct: false }
        ],
        hintOnWrong: "疑问句里 does 提到主语前面 → How does he treat you?",
        next: "n4"
      },
      n4: {
        npcLine: { en: "He is kind enough. But he does not like me to go out. He says a family should stay at home.", zh: "他人还算好。但他不喜欢我出门。他说一家人就该待在家里。", voice: "mary" },
        skill: "case",
        grammarTag: "connector",
        choices: [
          { text: "But you went to the ball, so he was away.", zh: "可您去了那场舞会，所以他当时不在家。", correct: true, xp: 10 },
          { text: "But you went to the ball, so he was gone away.", correct: false }
        ],
        hintOnWrong: "过去时说他人不在用 was away → so he was away.",
        next: null
      }
    }
  },
  {
    id: "the-gasfitters-ball",
    title: "The Gasfitters' Ball",
    subtitle: "回忆 · 煤气工的舞会",
    avatar: "🎻",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "Yes! He was in France. Mother and I went to the gasfitters' ball, and that is where I met Hosmer.", zh: "是的！他当时在法国。我和母亲去了煤气工的舞会，我就是在那儿认识霍斯默的。", voice: "mary" },
        skill: "story",
        grammarTag: "past-simple",
        choices: [
          { text: "What did he do for a living?", zh: "他是做什么工作的？", correct: true, xp: 10 },
          { text: "What did he did for a living?", correct: false }
        ],
        hintOnWrong: "did 后面跟动词原形 → What did he do for a living?",
        next: "n2"
      },
      n2: {
        npcLine: { en: "He worked in an office in Leadenhall Street. He came to see me twice, and then my stepfather came home from France.", zh: "他在利登霍尔街的一间办公室上班。他来看过我两次，后来我继父就从法国回来了。", voice: "mary" },
        skill: "case",
        grammarTag: "do-question",
        choices: [
          { text: "Did Hosmer stop coming then?", zh: "那之后霍斯默就不来了吗？", correct: true, xp: 10 },
          { text: "Did Hosmer stopped coming then?", correct: false }
        ],
        hintOnWrong: "Did 后面跟动词原形 → Did Hosmer stop coming then?",
        next: "n3"
      },
      n3: {
        npcLine: { en: "He wrote to me instead. Then my stepfather went to France again, and Hosmer came back at once.", zh: "他改成给我写信。后来我继父又去了法国，霍斯默马上就回来了。", voice: "mary" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "He only came when your stepfather was away.", zh: "他只在您继父不在的时候来。", correct: true, xp: 10 },
          { text: "He only came when your stepfather were away.", correct: false }
        ],
        hintOnWrong: "单数主语用 was → when your stepfather was away.",
        next: "n4"
      },
      n4: {
        npcLine: { en: "I never thought of it that way. But yes, that is true.", zh: "我从没这么想过。但确实是这样。", voice: "mary" },
        skill: "case",
        grammarTag: "can-modal",
        choices: [
          { text: "Can you describe him for us?", zh: "您能给我们描述一下他的样子吗？", correct: true, xp: 10 },
          { text: "Can you described him for us?", correct: false }
        ],
        hintOnWrong: "Can you 后面跟动词原形 → Can you describe him for us?",
        next: null
      }
    }
  },
  {
    id: "the-man-in-tinted-glasses",
    title: "The Man in Tinted Glasses",
    subtitle: "贝克街 221B · 一个古怪的未婚夫",
    avatar: "🕶️",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "He always wore tinted glasses, because of a weakness in his eyes. He spoke very quietly, almost in a whisper.", zh: "他总戴着有色眼镜，说是眼睛不好。他说话声音很轻，几乎像耳语。", voice: "mary" },
        skill: "case",
        grammarTag: "wh-question",
        choices: [
          { text: "When did you meet him? In the evening?", zh: "您什么时候见他？晚上吗？", correct: true, xp: 10 },
          { text: "When you did meet him? In the evening?", correct: false }
        ],
        hintOnWrong: "疑问句里 did 提到主语前面 → When did you meet him?",
        next: "n2"
      },
      n2: {
        npcLine: { en: "Always in the evening. He said the daylight hurt his eyes. He had a thick moustache too.", zh: "总是在晚上。他说白天的光刺眼。他还留着浓密的胡子。", voice: "mary" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "Glasses, a whisper and a moustache.", zh: "眼镜、耳语，还有胡子。", correct: true, xp: 10 },
          { text: "Glasses, a whisper and a moustaches.", correct: false }
        ],
        hintOnWrong: "a 后面用单数 → and a moustache.",
        next: "n3"
      },
      n3: {
        avatar: "🕵️",
        npcLine: { en: "Miss Sutherland, did he ever send you a letter written by hand?", zh: "萨瑟兰小姐，他给您写过手写的信吗？", voice: "holmes" },
        skill: "case",
        grammarTag: "short-answer",
        choices: [
          { text: "No, she didn't. Not one.", zh: "没有，一封都没有。", correct: true, xp: 10 },
          { text: "No, she doesn't. Not one.", correct: false }
        ],
        hintOnWrong: "问的是过去的事，用 didn't → No, she didn't.",
        next: "n4"
      },
      n4: {
        npcLine: { en: "Never. Every letter was typed, and he even typed his name at the bottom.", zh: "从来没有。每封信都是打字的，连底下的署名也是打的。", voice: "mary" },
        skill: "case",
        grammarTag: "present-continuous",
        choices: [
          { text: "Holmes, you're smiling. Why?", zh: "福尔摩斯，你在笑。为什么？", correct: true, xp: 10 },
          { text: "Holmes, you're smile. Why?", correct: false }
        ],
        hintOnWrong: "you're 后面用 -ing 形式 → you're smiling.",
        next: null
      }
    }
  },
  {
    id: "the-empty-carriage",
    title: "The Empty Carriage",
    subtitle: "回忆 · 婚礼那天早上",
    avatar: "💍",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "On Friday morning he came for me in a carriage. There was only room for one, so he put me in and took another cab.", zh: "周五早上他坐马车来接我。车里只坐得下一个人，他把我送上车，自己另叫了一辆。", voice: "mary" },
        skill: "story",
        grammarTag: "past-simple",
        choices: [
          { text: "And he got to the church first?", zh: "他先到的教堂？", correct: true, xp: 10 },
          { text: "And he getted to the church first?", correct: false }
        ],
        hintOnWrong: "get 的过去式是 got → And he got to the church first?",
        next: "n2"
      },
      n2: {
        npcLine: { en: "No. His cab arrived, and the driver opened the door, and there was nobody inside. Nobody at all.", zh: "没有。他那辆车到了，车夫打开门，里面一个人也没有。空空的。", voice: "mary" },
        skill: "story",
        grammarTag: "statement",
        choices: [
          { text: "He was in the cab when it left.", zh: "车走的时候他人在里面。", correct: true, xp: 10 },
          { text: "He was in the cab when it leave.", correct: false }
        ],
        hintOnWrong: "when 从句里也用过去时 → when it left.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "The driver says he was. He does not know how the gentleman got out.", zh: "车夫说他在。车夫也不知道那位先生是怎么下车的。", voice: "mary" },
        skill: "case",
        grammarTag: "wh-question",
        choices: [
          { text: "What did he say to you that morning?", zh: "那天早上他跟您说了什么？", correct: true, xp: 10 },
          { text: "What did he says to you that morning?", correct: false }
        ],
        hintOnWrong: "did 后面跟动词原形 → What did he say to you?",
        next: "n4"
      },
      n4: {
        npcLine: { en: "He made me promise to be true to him, whatever happened. Even if something took him away suddenly.", zh: "他让我答应，不管发生什么都要对他忠诚。哪怕有什么事突然把他带走。", voice: "mary" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "He knew he was going to disappear.", zh: "他知道自己要消失。", correct: true, xp: 10 },
          { text: "He knew he was go to disappear.", correct: false }
        ],
        hintOnWrong: "be going to 后面跟动词原形 → he was going to disappear.",
        next: null
      }
    }
  },
  {
    id: "after-she-leaves",
    transition: {
      en: "Miss Sutherland leaves her address and goes. Holmes sits back with his fingertips together and closes his eyes.",
      zh: "萨瑟兰小姐留下地址走了。福尔摩斯往后一靠，十指相抵，闭上了眼睛。"
    },
    title: "After She Leaves",
    subtitle: "贝克街 221B · 客人走后",
    avatar: "🕵️",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "A quiet voice, dark glasses, a big moustache, and letters with a typed signature. What does that give you?", zh: "压低的嗓音、有色眼镜、浓密的胡子，还有连署名都打字的信。这些告诉你什么？", voice: "holmes" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "He hid his face and his writing.", zh: "他把自己的脸和字迹都藏起来了。", correct: true, xp: 10 },
          { text: "He hid his face and his write.", correct: false }
        ],
        hintOnWrong: "字迹的名词是 writing → his face and his writing.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "Good, Watson. And he only appeared when the stepfather was in France. Never once at the same time.", zh: "很好，华生。而且他只在继父人在法国时出现。一次也没撞上过。", voice: "holmes" },
        skill: "case",
        grammarTag: "do-question",
        choices: [
          { text: "Do you think they are the same man?", zh: "你是说他们是同一个人？", correct: true, xp: 10 },
          { text: "Do you think they are the same men?", correct: false }
        ],
        hintOnWrong: "the same man 是单数 → they are the same man?",
        next: "n3"
      },
      n3: {
        npcLine: { en: "I am almost sure of it. The money is the reason. If she marries, the hundred pounds leaves the house.", zh: "我几乎可以肯定。原因就是钱。她一结婚，那一百镑就从这个家里走了。", voice: "holmes" },
        skill: "case",
        grammarTag: "connector",
        choices: [
          { text: "So he invented a man and then removed him.", zh: "所以他编了一个人，又把这个人弄没了。", correct: true, xp: 10 },
          { text: "So he invented a man and then remove him.", correct: false }
        ],
        hintOnWrong: "and then 后面保持过去时 → and then removed him.",
        next: "n4"
      },
      n4: {
        npcLine: { en: "Now she waits for a man who never existed, and she will never marry anyone else. Watson, hand me the paper.", zh: "现在她在等一个从来不存在的人，而且再也不会嫁给别人了。华生，把纸递给我。", voice: "holmes" },
        skill: "case",
        grammarTag: "will-future",
        choices: [
          { text: "I'll get it. Are you writing to him?", zh: "我拿。你要写信给他？", correct: true, xp: 10 },
          { text: "I'll got it. Are you writing to him?", correct: false }
        ],
        hintOnWrong: "I'll 后面跟动词原形 → I'll get it.",
        next: null
      }
    }
  },
  {
    id: "two-letters",
    title: "Two Letters",
    subtitle: "贝克街 221B · 两封信",
    avatar: "✉️",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "I wrote to Mr Windibank at his office and asked him to come here at six. I also wrote to his firm.", zh: "我给温迪班克先生的办公室写了信，请他六点过来。我也给他公司写了一封。", voice: "holmes" },
        skill: "case",
        grammarTag: "wh-question",
        choices: [
          { text: "What did you ask the firm?", zh: "你问了公司什么？", correct: true, xp: 10 },
          { text: "What did you asked the firm?", correct: false }
        ],
        hintOnWrong: "did 后面跟动词原形 → What did you ask the firm?",
        next: "n2"
      },
      n2: {
        npcLine: { en: "I asked whether their traveller in France answers to a certain description. Their answer came this morning.", zh: "我问他们派驻法国的推销员是不是符合某个描述。他们的回信今天早上到了。", voice: "holmes" },
        skill: "case",
        grammarTag: "do-question",
        choices: [
          { text: "Does the description match Hosmer?", zh: "那个描述跟霍斯默对得上吗？", correct: true, xp: 10 },
          { text: "Does the description matches Hosmer?", correct: false }
        ],
        hintOnWrong: "Does 后面用动词原形 → Does the description match Hosmer?",
        next: "n3"
      },
      n3: {
        npcLine: { en: "Every word of it, except the glasses and the moustache. Now look at Hosmer's letter and at Windibank's note.", zh: "字字都对得上，只差眼镜和胡子。现在看看霍斯默的信，再看看温迪班克的便条。", voice: "holmes" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "Both of them come from a machine.", zh: "两封都出自一台机器。", correct: true, xp: 10 },
          { text: "Both of them comes from a machine.", correct: false }
        ],
        hintOnWrong: "Both 是复数，动词不加 s → Both of them come from a machine.",
        next: "n4"
      },
      n4: {
        npcLine: { en: "Look closer. In both, the letter e is broken at the top and the letter r has no tail.", zh: "再看仔细些。两封里，字母 e 的上端都缺了一块，字母 r 都没有尾巴。", voice: "holmes" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "The same machine typed them both.", zh: "两封信是同一台机器打的。", correct: true, xp: 10 },
          { text: "The same machine typed them all.", correct: false }
        ],
        hintOnWrong: "只有两封，用 both 不用 all → typed them both.",
        next: null
      }
    }
  },
  {
    id: "six-o-clock",
    transition: {
      en: "Six o'clock. A short, thick man in his thirties comes in, hat in hand, smiling with his mouth but not with his eyes.",
      zh: "六点。一个三十来岁的矮胖男人走进来，手里拿着帽子，嘴上笑着，眼睛没有笑。"
    },
    title: "Six O'Clock",
    subtitle: "贝克街 221B · 继父来了",
    avatar: "🎩",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "Good evening. I got your letter. I am afraid my stepdaughter is a foolish girl. She should forget the whole thing.", zh: "晚上好。我收到您的信了。我这个继女恐怕有点糊涂。她该把这件事整个忘了。", voice: "windibank" },
        skill: "meeting",
        grammarTag: "courtesy",
        choices: [
          { text: "Good evening. Please sit down, sir.", zh: "晚上好。先生，请坐。", correct: true, xp: 10 },
          { text: "Good evening. Please sat down, sir.", correct: false }
        ],
        hintOnWrong: "Please 后面跟动词原形 → Please sit down, sir.",
        next: "n2"
      },
      n2: {
        avatar: "🕵️",
        npcLine: { en: "It is a pity she cannot forget him. Tell me, does your typewriter have a broken e?", zh: "可惜她忘不掉他。请问，您那台打字机的字母 e 是不是缺了一块？", voice: "holmes" },
        skill: "case",
        grammarTag: "present-continuous",
        choices: [
          { text: "He's turning white, Holmes.", zh: "福尔摩斯，他脸色发白了。", correct: true, xp: 10 },
          { text: "He's turn white, Holmes.", correct: false }
        ],
        hintOnWrong: "He's 后面用 -ing 形式 → He's turning white.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "I do not know what you mean. This is nonsense. I came here to help, not to be insulted.", zh: "我不明白您什么意思。这是胡说。我是来帮忙的，不是来受侮辱的。", voice: "windibank" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "Nobody insulted you, Mr Windibank.", zh: "温迪班克先生，没人侮辱您。", correct: true, xp: 10 },
          { text: "Nobody insult you, Mr Windibank.", correct: false }
        ],
        hintOnWrong: "过去时用 insulted → Nobody insulted you.",
        next: "n4"
      },
      n4: {
        avatar: "🕵️",
        npcLine: { en: "Sit down. You wore the glasses, you grew the moustache, and you whispered so that she would not know your voice.", zh: "坐下。眼镜是您戴的，胡子是您留的，您压着嗓子说话，就是不让她听出您的声音。", voice: "holmes" },
        skill: "case",
        grammarTag: "past-simple",
        choices: [
          { text: "He walked her to the church himself.", zh: "是他自己把她送到教堂的。", correct: true, xp: 10 },
          { text: "He walk her to the church himself.", correct: false }
        ],
        hintOnWrong: "讲过去的事用过去时 → He walked her to the church.",
        next: null
      }
    }
  },
  {
    id: "the-man-who-was-not-there",
    title: "The Man Who Was Not There",
    subtitle: "贝克街 221B · 揭穿",
    avatar: "🕵️",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "You put her in the carriage, walked round the corner, took off the glasses and the moustache, and went to your office.", zh: "您把她送上马车，绕过街角，摘下眼镜和胡子，然后去上班了。", voice: "holmes" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "Hosmer Angel was never in that cab.", zh: "霍斯默·安吉尔根本没在那辆车里。", correct: true, xp: 10 },
          { text: "Hosmer Angel was never in that cabs.", correct: false }
        ],
        hintOnWrong: "that 后面用单数 → in that cab.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "You cannot prove any of this. And even if you could, I have broken no law.", zh: "这些您都证明不了。就算证明得了，我也没触犯任何法律。", voice: "windibank" },
        skill: "case",
        grammarTag: "wh-question",
        choices: [
          { text: "Why did you do it to her?", zh: "您为什么要这样对她？", correct: true, xp: 10 },
          { text: "Why you did do it to her?", correct: false }
        ],
        hintOnWrong: "疑问句里 did 提到主语前面 → Why did you do it to her?",
        next: "n3"
      },
      n3: {
        npcLine: { en: "For the hundred pounds a year, of course. A husband would have taken it out of the house.", zh: "当然是为了那一年一百镑。她一有丈夫，这笔钱就从家里出去了。", voice: "windibank" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "You did it for money and nothing else.", zh: "你就是为了钱，别无其他。", correct: true, xp: 10 },
          { text: "You did it for money and nothing more.", correct: false }
        ],
        hintOnWrong: "别无其他固定说 nothing else → and nothing else.",
        next: "n4"
      },
      n4: {
        avatar: "🕵️",
        npcLine: { en: "The law cannot touch you, but you deserve a whip. Get out of my room before I lose my temper.", zh: "法律动不了您，可您欠一顿鞭子。趁我还没发火，出去。", voice: "holmes" },
        skill: "case",
        grammarTag: "lets-suggestion",
        choices: [
          { text: "Let's open the window after he goes.", zh: "他走了我们把窗户打开吧。", correct: true, xp: 10 },
          { text: "Let's opening the window after he goes.", correct: false }
        ],
        hintOnWrong: "Let's 后面跟动词原形 → Let's open the window.",
        next: null
      }
    }
  },
  {
    id: "what-she-will-not-believe",
    title: "What She Will Not Believe",
    subtitle: "贝克街 221B · 不说的真相",
    avatar: "🕵️",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "That man will end on the gallows one day. But not for this.", zh: "那个人早晚会上绞架。但不是因为这件事。", voice: "holmes" },
        skill: "story",
        grammarTag: "do-question",
        choices: [
          { text: "Do we tell Miss Sutherland now?", zh: "我们现在告诉萨瑟兰小姐吗？", correct: true, xp: 10 },
          { text: "Do we told Miss Sutherland now?", correct: false }
        ],
        hintOnWrong: "Do we 后面用动词原形 → Do we tell Miss Sutherland now?",
        next: "n2"
      },
      n2: {
        npcLine: { en: "No. If I tell her, she will not believe me. There is an old Persian saying about taking a tiger's cub.", zh: "不。我说了她也不会信。波斯有句老话，说的是从老虎嘴里抢崽子。", voice: "holmes" },
        skill: "story",
        grammarTag: "statement",
        choices: [
          { text: "It's dangerous to take her dream away.", zh: "夺走她的梦是危险的。", correct: true, xp: 10 },
          { text: "It's dangerous to took her dream away.", correct: false }
        ],
        hintOnWrong: "to 后面跟动词原形 → It's dangerous to take her dream away.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "She will wait a year or two, and then she will stop waiting. That is kinder than the truth today.", zh: "她会等上一两年，然后自己不等了。这比今天告诉她真相仁慈些。", voice: "holmes" },
        skill: "case",
        grammarTag: "can-modal",
        choices: [
          { text: "I can't argue with that, Holmes.", zh: "这我没法反驳，福尔摩斯。", correct: true, xp: 10 },
          { text: "I can't argued with that, Holmes.", correct: false }
        ],
        hintOnWrong: "can't 后面跟动词原形 → I can't argue with that.",
        next: "n4"
      },
      n4: {
        avatar: "👩‍🦳",
        npcLine: { en: "Mr Holmes, the commissionaire is downstairs. He found a hat and a goose in the street on Christmas morning, and he wants your advice.", zh: "福尔摩斯先生，门房在楼下。他圣诞节早上在街上捡到一顶帽子和一只鹅，想请您给个主意。", voice: "hudson" },
        skill: "meeting",
        grammarTag: "will-future",
        choices: [
          { text: "A goose? I'll go down and let him in.", zh: "一只鹅？我下去让他进来。", correct: true, xp: 10 },
          { text: "A goose? I'll going down and let him in.", correct: false }
        ],
        hintOnWrong: "I'll 后面跟动词原形 → I'll go down and let him in.",
        next: null
      }
    }
  }
);
