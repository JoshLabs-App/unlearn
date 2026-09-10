// 内容数据层：「福尔摩斯 · 贝克街」第二章，紧接第一章结尾那封只画着王冠的信。
// @chapter-title 第二章 · 波希米亚丑闻
// @chapter-subtitle 唯一赢过他的女人
// 跟第一章同一个 BAKER_STREET_CONTENT 对象继续 push（不是独立声明），加载顺序按文件名排。
//
// 改编来源（公有领域）：Arthur Conan Doyle, A Scandal in Bohemia (1891)。
// 改动：原著里华生已婚、只是登门拜访，这里沿用第一章"两人同住贝克街"的设定；
// 结尾艾琳·艾德勒留信出走照原著，不改。
//
// Tier: L2（跟第一章同一个 tier，A2 起步）。玩家扮演华生，正确选项只用 L1+L2 语法。
// 本章不引入新 grammarTag，全部是第一章已经用过的十二个标签，纯复现巩固。
// 新增技能领域 disguise（乔装跟踪），跟第一章的 meeting/lodging/story/case 并列。
//
// 配音：新角色 king（波希米亚国王，傲慢、口音重）、irene（艾琳·艾德勒，聪明从容）、
// godfrey（律师，公事公办）。需要同步 scripts/tts_qwen3.py 的 ROLE_VOICES。
//
// 剧情：国王上门求助 → 说明照片的来龙去脉 → 福尔摩斯乔装踩点 → 意外撞上婚礼 →
// 设局用假火警逼艾琳暴露藏照片的位置 → 第二天扑空，只剩一封信和一张她自己的照片。

BAKER_STREET_CONTENT.scenes.push(
  {
    id: "the-man-in-the-mask",
    transition: {
      en: "The next evening. A carriage stops outside 221B. Heavy steps come up the stairs, and a very tall man walks in — wearing a black mask across his face.",
      zh: "第二天傍晚。一辆马车停在 221B 门外。沉重的脚步声上了楼，一个身材极高的男人走进来——脸上戴着一副黑色面具。"
    },
    title: "The Man in the Mask",
    subtitle: "贝克街 221B · 戴面具的客人",
    avatar: "🎭",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "You wrote to me. I am here. But I must keep my name to myself.", zh: "你们收到我的信了。我来了。但我的名字必须保密。", voice: "king" },
        skill: "meeting",
        grammarTag: "can-modal",
        choices: [
          { text: "Of course. Can you tell us the problem?", zh: "当然。您能说说是什么麻烦吗？", correct: true, xp: 10 },
          { text: "Of course. Can you told us the problem?", correct: false }
        ],
        hintOnWrong: "Can 后面跟动词原形 → Can you tell us the problem?",
        next: "n2"
      },
      n2: {
        avatar: "🕵️",
        npcLine: { en: "Your Majesty may speak freely. Dr. Watson is my friend, and the crown on your letter told me the rest.", zh: "陛下尽管说。华生医生是我的朋友，而您信纸上的王冠已经告诉了我其余的事。", voice: "holmes" },
        skill: "case",
        grammarTag: "past-simple",
        choices: [
          { text: "You knew it from the paper?", zh: "你从那张纸就看出来了？", correct: true, xp: 10 },
          { text: "You knowed it from the paper?", correct: false }
        ],
        hintOnWrong: "know 的过去式是 knew，不是 knowed → You knew it from the paper?",
        next: "n3"
      },
      n3: {
        npcLine: { en: "Then you know who I am. I am the King of Bohemia, and I am in serious trouble.", zh: "那你们知道我是谁了。我是波希米亚国王，我遇到了大麻烦。", voice: "king" },
        skill: "meeting",
        grammarTag: "statement",
        choices: [
          { text: "We're listening, Your Majesty.", zh: "我们在听，陛下。", correct: true, xp: 10 },
          { text: "We're listen, Your Majesty.", correct: false }
        ],
        hintOnWrong: "be 动词后面用 -ing 形式 → We're listening.",
        next: "n4"
      },
      n4: {
        npcLine: { en: "In a month I marry a young princess. Her family is very strict. If they hear of my past, the marriage is over.", zh: "一个月后我要迎娶一位年轻的公主。她家教极严。如果他们听说我的过去，这门亲事就完了。", voice: "king" },
        skill: "case",
        grammarTag: "wh-question",
        choices: [
          { text: "What is it in your past that worries you?", zh: "您过去有什么事让您担心？", correct: true, xp: 10 },
          { text: "What is it in your past that worry you?", correct: false }
        ],
        hintOnWrong: "that 指代单数 it，动词加 s → that worries you?",
        next: null
      }
    }
  },
  {
    id: "the-photograph",
    title: "The Photograph",
    subtitle: "贝克街 221B · 一张照片",
    avatar: "🎭",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "Five years ago I knew a woman in Warsaw. Irene Adler. A singer. We were together for a while.", zh: "五年前我在华沙认识了一个女人。艾琳·艾德勒。一位歌唱家。我们在一起过一段时间。", voice: "king" },
        skill: "story",
        grammarTag: "do-question",
        choices: [
          { text: "Did she keep something of yours?", zh: "她手里留了您的东西吗？", correct: true, xp: 10 },
          { text: "Did she kept something of yours?", correct: false }
        ],
        hintOnWrong: "Did 后面跟动词原形 → Did she keep something of yours?",
        next: "n2"
      },
      n2: {
        npcLine: { en: "A photograph. The two of us together. If the princess's family sees it, everything is finished.", zh: "一张照片。我们两个人的合影。如果公主家里人看到，一切就都完了。", voice: "king" },
        skill: "story",
        grammarTag: "statement",
        choices: [
          { text: "So she has the only copy.", zh: "所以只有她手上有这张。", correct: true, xp: 10 },
          { text: "So she have the only copy.", correct: false }
        ],
        hintOnWrong: "she 后面用 has → So she has the only copy.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "I sent men to buy it. I sent men to steal it. Twice they searched her house. Nothing.", zh: "我派人去买。我派人去偷。他们两次搜过她的房子。什么也没找到。", voice: "king" },
        skill: "case",
        grammarTag: "connector",
        choices: [
          { text: "So she hid it somewhere very safe.", zh: "所以她把它藏在了很安全的地方。", correct: true, xp: 10 },
          { text: "So she hide it somewhere very safe.", correct: false }
        ],
        hintOnWrong: "so 接过去时的结果 → So she hid it somewhere very safe.",
        next: "n4"
      },
      n4: {
        avatar: "🕵️",
        npcLine: { en: "Where does she live now, Your Majesty?", zh: "陛下，她现在住哪儿？", voice: "holmes" },
        skill: "case",
        grammarTag: "will-future",
        choices: [
          { text: "Briony Lodge. I'll write the address down.", zh: "布里翁尼府。我把地址写下来。", correct: true, xp: 10 },
          { text: "Briony Lodge. I'll wrote the address down.", correct: false }
        ],
        hintOnWrong: "I'll 后面跟动词原形 → I'll write the address down.",
        next: "n5"
      },
      n5: {
        avatar: "🕵️",
        npcLine: { en: "Good. Come back on Friday, Your Majesty. Watson, tomorrow we go to St John's Wood.", zh: "很好。陛下，星期五再来。华生，明天我们去圣约翰伍德。", voice: "holmes" },
        skill: "case",
        grammarTag: "lets-suggestion",
        choices: [
          { text: "Let's take the morning train.", zh: "我们坐早班车去吧。", correct: true, xp: 10 },
          { text: "Let's took the morning train.", correct: false }
        ],
        hintOnWrong: "Let's 后面跟动词原形 → Let's take the morning train.",
        next: null
      }
    }
  },
  {
    id: "a-groom-in-the-street",
    transition: {
      en: "Next morning you wait at Baker Street for hours. At three o'clock a dirty, cheerful stable worker walks in — and you do not recognise him until he laughs.",
      zh: "第二天上午你在贝克街等了好几个钟头。三点钟，一个脏兮兮、笑呵呵的马夫走了进来——直到他笑出声，你才认出他是谁。"
    },
    title: "A Groom in the Street",
    subtitle: "圣约翰伍德 · 乔装打探",
    avatar: "🐴",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "Well, Watson? Do you know me?", zh: "怎么样，华生？认得出我吗？", voice: "holmes" },
        skill: "disguise",
        grammarTag: "short-answer",
        choices: [
          { text: "No, I don't. Not at all, Holmes.", zh: "认不出，完全认不出，福尔摩斯。", correct: true, xp: 10 },
          { text: "No, I doesn't. Not at all, Holmes.", correct: false }
        ],
        hintOnWrong: "I 后面用 don't → No, I don't.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "Good. The stable men near Briony Lodge talk freely to one of their own. I spent two hours with them.", zh: "很好。布里翁尼府附近的马夫对自己人无话不谈。我跟他们待了两个小时。", voice: "holmes" },
        skill: "disguise",
        grammarTag: "wh-question",
        choices: [
          { text: "What did they tell you about her?", zh: "他们跟你说了她什么？", correct: true, xp: 10 },
          { text: "What did they told you about her?", correct: false }
        ],
        hintOnWrong: "did 后面跟动词原形 → What did they tell you?",
        next: "n3"
      },
      n3: {
        npcLine: { en: "She lives quietly. She drives out at five every day and returns at seven. One man visits her often — a lawyer called Godfrey Norton.", zh: "她过得很安静。每天五点出门，七点回来。有个男人常去找她——一位叫戈弗雷·诺顿的律师。", voice: "holmes" },
        skill: "case",
        grammarTag: "present-continuous",
        choices: [
          { text: "So he's helping her with something.", zh: "所以他在帮她办什么事。", correct: true, xp: 10 },
          { text: "So he's help her with something.", correct: false }
        ],
        hintOnWrong: "he's 后面用 -ing 形式 → So he's helping her.",
        next: "n4"
      },
      n4: {
        npcLine: { en: "That is what I thought. And then, this afternoon, something happened that I did not expect at all.", zh: "我原本也是这么想的。然后，今天下午，发生了一件我完全没料到的事。", voice: "holmes" },
        skill: "case",
        grammarTag: "do-question",
        choices: [
          { text: "Did something go wrong?", zh: "出岔子了吗？", correct: true, xp: 10 },
          { text: "Did something went wrong?", correct: false }
        ],
        hintOnWrong: "Did 后面跟动词原形 → Did something go wrong?",
        next: null
      }
    }
  },
  {
    id: "the-sudden-wedding",
    title: "The Sudden Wedding",
    subtitle: "圣莫尼卡教堂 · 一场突如其来的婚礼",
    avatar: "💒",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "Norton arrived in a great hurry. Then she came out and they drove to the Church of St Monica.", zh: "诺顿匆匆忙忙地赶来。接着她也出来了，两人一起坐车去了圣莫尼卡教堂。", voice: "holmes" },
        skill: "case",
        grammarTag: "past-simple",
        choices: [
          { text: "You followed them, of course.", zh: "你当然跟去了。", correct: true, xp: 10 },
          { text: "You follow them, of course.", correct: false }
        ],
        hintOnWrong: "讲刚发生过的事用过去时 → You followed them.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "I did. And inside, the priest needed one more witness. So I stood up and became the witness at their wedding.", zh: "跟了。而在教堂里，牧师还缺一个证婚人。于是我站起来，当了他们婚礼的证人。", voice: "holmes" },
        skill: "story",
        grammarTag: "statement",
        choices: [
          { text: "You were the witness at her wedding!", zh: "你当了她婚礼的证婚人！", correct: true, xp: 10 },
          { text: "You was the witness at her wedding!", correct: false }
        ],
        hintOnWrong: "You 后面用 were → You were the witness.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "I was. Married women keep such photographs even more carefully. This makes tonight important.", zh: "是的。结了婚的女人会把这类照片藏得更紧。所以今晚很关键。", voice: "holmes" },
        skill: "case",
        grammarTag: "wh-question",
        choices: [
          { text: "Why is tonight important?", zh: "今晚为什么关键？", correct: true, xp: 10 },
          { text: "Why tonight is important?", correct: false }
        ],
        hintOnWrong: "疑问句里 is 提到主语前面 → Why is tonight important?",
        next: "n4"
      },
      n4: {
        npcLine: { en: "Because I know how to make her show me the hiding place. Watson, will you help me? It is not quite legal.", zh: "因为我知道怎么让她自己把藏照片的地方指给我看。华生，你肯帮我吗？这事不太合法。", voice: "holmes" },
        skill: "case",
        grammarTag: "will-future",
        choices: [
          { text: "I'll help you. Just tell me what to do.", zh: "我帮你。告诉我该做什么就行。", correct: true, xp: 10 },
          { text: "I'll helping you. Just tell me what to do.", correct: false }
        ],
        hintOnWrong: "I'll 后面跟动词原形 → I'll help you.",
        next: null
      }
    }
  },
  {
    id: "the-plan",
    title: "The Plan",
    subtitle: "贝克街 · 定计",
    avatar: "🕵️",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "Tonight I go to her house as an old priest. There will be a small fight in the street, and I will be hurt.", zh: "今晚我扮成一个老牧师去她家。街上会有一场小小的打斗，我会受伤。", voice: "holmes" },
        skill: "case",
        grammarTag: "do-question",
        choices: [
          { text: "Do you want her to bring you inside?", zh: "你是想让她把你扶进屋里？", correct: true, xp: 10 },
          { text: "Do you want her bring you inside?", correct: false }
        ],
        hintOnWrong: "want 后面用 to + 动词 → want her to bring you inside?",
        next: "n2"
      },
      n2: {
        npcLine: { en: "Exactly. Once I am inside, you wait at the open window. When I raise my hand, throw this in and shout 'Fire!'", zh: "正是。等我进了屋，你就在开着的窗户外面等。我一举手，你就把这个扔进来，喊「着火了！」", voice: "holmes" },
        skill: "case",
        grammarTag: "can-modal",
        choices: [
          { text: "Can I look at it first?", zh: "我能先看看这东西吗？", correct: true, xp: 10 },
          { text: "Can I looked at it first?", correct: false }
        ],
        hintOnWrong: "Can I 后面跟动词原形 → Can I look at it first?",
        next: "n3"
      },
      n3: {
        npcLine: { en: "It only makes smoke, no flame. Now — when a woman thinks her house is burning, what does she run to save?", zh: "它只冒烟，不着火。那么——当一个女人以为自己家着火了，她会冲过去救什么？", voice: "holmes" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "She runs to the thing she values most.", zh: "她会冲向她最看重的东西。", correct: true, xp: 10 },
          { text: "She run to the thing she values most.", correct: false }
        ],
        hintOnWrong: "She 后面动词加 s → She runs to the thing.",
        next: "n4"
      },
      n4: {
        npcLine: { en: "And she will show us the hiding place with her own hands. Be at the window at seven.", zh: "她会亲手把藏东西的地方指给我们看。七点到窗户底下。", voice: "holmes" },
        skill: "case",
        grammarTag: "please-request",
        choices: [
          { text: "I'll be there. Please be careful, Holmes.", zh: "我会到。福尔摩斯，你自己小心。", correct: true, xp: 10 },
          { text: "I'll be there. Please being careful, Holmes.", correct: false }
        ],
        hintOnWrong: "Please 后面跟动词原形 → Please be careful.",
        next: null
      }
    }
  },
  {
    id: "the-false-fire",
    transition: {
      en: "Seven o'clock. Briony Lodge. A crowd, a short fight, and an old priest is carried inside — bleeding from the head. You wait by the open window.",
      zh: "七点。布里翁尼府。人群，一场短促的扭打，一个老牧师被人抬了进去——头上还在流血。你守在敞开的窗户旁边。"
    },
    title: "The False Fire",
    subtitle: "布里翁尼府 · 假火警",
    avatar: "🔥",
    startNode: "n1",
    nodes: {
      n1: {
        avatar: "👩",
        npcLine: { en: "Bring him to the sitting room. Open the window, he needs air. Poor old man.", zh: "把他扶到起居室来。把窗户打开，他需要空气。可怜的老人家。", voice: "irene" },
        skill: "case",
        grammarTag: "present-continuous",
        choices: [
          { text: "He's waving his hand — now!", zh: "他在举手——就是现在！", correct: true, xp: 10 },
          { text: "He's wave his hand — now!", correct: false }
        ],
        hintOnWrong: "He's 后面用 -ing 形式 → He's waving his hand.",
        next: "n2"
      },
      n2: {
        avatar: "👩",
        npcLine: { en: "Fire! There is smoke in the room! My papers — no, the panel above the bell!", zh: "着火了！屋里都是烟！我的文件——不，是拉铃上面那块木板！", voice: "irene" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "She opened the panel. Holmes saw it.", zh: "她打开了那块板。福尔摩斯看见了。", correct: true, xp: 10 },
          { text: "She opened the panel. Holmes seen it.", correct: false }
        ],
        hintOnWrong: "过去式用 saw，不是 seen → Holmes saw it.",
        next: "n3"
      },
      n3: {
        avatar: "🕵️",
        npcLine: { en: "It was only smoke, madam. A false alarm. I am sorry for the trouble. Good evening.", zh: "夫人，只是烟而已。虚惊一场。给您添麻烦了。晚安。", voice: "holmes" },
        skill: "case",
        grammarTag: "courtesy",
        choices: [
          { text: "Good evening, madam. Sorry again.", zh: "晚安，夫人。再次抱歉。", correct: true, xp: 10 },
          { text: "Good evening, madam. Sorry more.", correct: false }
        ],
        hintOnWrong: "再次道歉用 again → Sorry again.",
        next: "n4"
      },
      n4: {
        avatar: "🕵️",
        npcLine: { en: "Walk slowly, Watson. Do not look back. I know exactly where it is now.", zh: "慢慢走，华生。别回头。我现在完全知道它在哪儿了。", voice: "holmes" },
        skill: "case",
        grammarTag: "connector",
        choices: [
          { text: "It worked, so we can come back tomorrow.", zh: "成功了，所以我们明天可以再来。", correct: true, xp: 10 },
          { text: "It worked, so we can came back tomorrow.", correct: false }
        ],
        hintOnWrong: "can 后面跟动词原形 → so we can come back tomorrow.",
        next: null
      }
    }
  },
  {
    id: "goodnight-mister-holmes",
    title: "Good Night, Mister Holmes",
    subtitle: "回贝克街的路上 · 一句陌生的问候",
    avatar: "🌙",
    startNode: "n1",
    nodes: {
      n1: {
        avatar: "🧑",
        npcLine: { en: "Good night, Mister Sherlock Holmes.", zh: "晚安，夏洛克·福尔摩斯先生。", voice: "spaulding" },
        skill: "meeting",
        grammarTag: "wh-question",
        choices: [
          { text: "Who was that young man?", zh: "那个年轻人是谁？", correct: true, xp: 10 },
          { text: "Who were that young man?", correct: false }
        ],
        hintOnWrong: "单数主语用 was → Who was that young man?",
        next: "n2"
      },
      n2: {
        npcLine: { en: "I have heard that voice before, Watson. But I cannot place it. Never mind. Come, we have work in the morning.", zh: "华生，这个声音我以前听过。但一时想不起来在哪儿。算了。走吧，明天早上还有事。", voice: "holmes" },
        skill: "case",
        grammarTag: "do-question",
        choices: [
          { text: "Do we go there early?", zh: "我们要早点过去吗？", correct: true, xp: 10 },
          { text: "Do we goes there early?", correct: false }
        ],
        hintOnWrong: "Do 后面跟动词原形 → Do we go there early?",
        next: "n3"
      },
      n3: {
        npcLine: { en: "Eight o'clock, with the King. She will still be asleep. We take the photograph and it is finished.", zh: "八点，跟国王一起。那时她还在睡。我们把照片拿走，这事就了结了。", voice: "holmes" },
        skill: "case",
        grammarTag: "statement",
        choices: [
          { text: "It sounds too easy to me.", zh: "我倒觉得太顺利了点。", correct: true, xp: 10 },
          { text: "It sound too easy to me.", correct: false }
        ],
        hintOnWrong: "It 后面动词加 s → It sounds too easy.",
        next: "n4"
      },
      n4: {
        npcLine: { en: "You worry too much, my friend. Good night.", zh: "我的朋友，你想太多了。晚安。", voice: "holmes" },
        skill: "meeting",
        grammarTag: "courtesy",
        choices: [
          { text: "Good night, Holmes. Sleep well.", zh: "晚安，福尔摩斯。好好睡。", correct: true, xp: 10 },
          { text: "Good night, Holmes. Sleep good.", correct: false }
        ],
        hintOnWrong: "睡得好用 well，不是 good → Sleep well.",
        next: null
      }
    }
  },
  {
    id: "the-empty-panel",
    transition: {
      en: "Eight in the morning. The King's carriage waits outside Briony Lodge. An old servant opens the door, smiling.",
      zh: "早上八点。国王的马车停在布里翁尼府外。一个上了年纪的仆人笑着开了门。"
    },
    title: "The Empty Panel",
    subtitle: "布里翁尼府 · 空了的暗格",
    avatar: "🏠",
    startNode: "n1",
    nodes: {
      n1: {
        avatar: "👵",
        npcLine: { en: "Mrs Norton? She left England this morning, sir. On the five fifteen train.", zh: "诺顿太太吗？先生，她今天早上离开英国了。坐五点一刻那班火车。", voice: "hudson" },
        skill: "case",
        grammarTag: "past-simple",
        choices: [
          { text: "She left? When did she decide that?", zh: "她走了？什么时候决定的？", correct: true, xp: 10 },
          { text: "She left? When did she decided that?", correct: false }
        ],
        hintOnWrong: "did 后面跟动词原形 → When did she decide that?",
        next: "n2"
      },
      n2: {
        avatar: "🕵️",
        npcLine: { en: "The panel is open. The photograph is gone. There is a letter here — addressed to me.", zh: "暗格开着。照片不见了。这里有一封信——写给我的。", voice: "holmes" },
        skill: "case",
        grammarTag: "can-modal",
        choices: [
          { text: "Can you read it out loud?", zh: "你能念出来吗？", correct: true, xp: 10 },
          { text: "Can you read it out loudly?", correct: false }
        ],
        hintOnWrong: "固定搭配是 read it out loud → Can you read it out loud?",
        next: "n3"
      },
      n3: {
        npcLine: { en: "'My dear Mr Sherlock Holmes. You did it very well. I was the young man who said good night to you.'", zh: "「亲爱的夏洛克·福尔摩斯先生。你做得非常漂亮。跟你道晚安的那个年轻人就是我。」", voice: "irene" },
        skill: "story",
        grammarTag: "statement",
        choices: [
          { text: "She followed you home in disguise.", zh: "她乔装跟着你回了家。", correct: true, xp: 10 },
          { text: "She followed you home in disguised.", correct: false }
        ],
        hintOnWrong: "in disguise 是固定说法 → She followed you home in disguise.",
        next: "n4"
      },
      n4: {
        npcLine: { en: "'I love my husband, and he loves me. The King may rest in peace. I keep the photograph only to protect myself.'", zh: "「我爱我的丈夫，他也爱我。国王大可放心。我留着这张照片，只是为了保护自己。」", voice: "irene" },
        skill: "story",
        grammarTag: "connector",
        choices: [
          { text: "So she will never use it against him.", zh: "所以她不会用它去害他。", correct: true, xp: 10 },
          { text: "So she will never used it against him.", correct: false }
        ],
        hintOnWrong: "will 后面跟动词原形 → she will never use it.",
        next: null
      }
    }
  },
  {
    id: "the-king-is-satisfied",
    title: "The King Is Satisfied",
    subtitle: "布里翁尼府门口 · 国王的谢意",
    avatar: "👑",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "She is gone? Then I am safe! What a woman she was!", zh: "她走了？那我就安全了！她真是个了不起的女人！", voice: "king" },
        skill: "meeting",
        grammarTag: "statement",
        choices: [
          { text: "She kept her word, Your Majesty.", zh: "陛下，她说话算话。", correct: true, xp: 10 },
          { text: "She keeped her word, Your Majesty.", correct: false }
        ],
        hintOnWrong: "keep 的过去式是 kept → She kept her word.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "She did. I am sorry she was not of my own rank. She would have made a fine queen.", zh: "确实。可惜她跟我不是同一个阶层。她本来会是位出色的王后。", voice: "king" },
        skill: "meeting",
        grammarTag: "wh-question",
        choices: [
          { text: "How can we thank you, Your Majesty?", zh: "陛下，我们该怎么谢您？", correct: true, xp: 10 },
          { text: "How we can thank you, Your Majesty?", correct: false }
        ],
        hintOnWrong: "疑问句里 can 提到主语前面 → How can we thank you?",
        next: "n3"
      },
      n3: {
        avatar: "🕵️",
        npcLine: { en: "There is one thing I would value more than a ring, Your Majesty. This photograph — the one of her alone.", zh: "陛下，有样东西我看得比戒指更重。这张照片——她一个人的那张。", voice: "holmes" },
        skill: "case",
        grammarTag: "do-question",
        choices: [
          { text: "Do you really want only that?", zh: "你真的只要这个？", correct: true, xp: 10 },
          { text: "Do you really wants only that?", correct: false }
        ],
        hintOnWrong: "Do you 后面用动词原形 → Do you really want only that?",
        next: "n4"
      },
      n4: {
        avatar: "🕵️",
        npcLine: { en: "Only that. Good morning, Your Majesty.", zh: "只要这个。告辞了，陛下。", voice: "holmes" },
        skill: "meeting",
        grammarTag: "courtesy",
        choices: [
          { text: "Good morning, Your Majesty. Safe travels.", zh: "告辞，陛下。一路平安。", correct: true, xp: 10 },
          { text: "Good morning, Your Majesty. Safe travel.", correct: false }
        ],
        hintOnWrong: "祝一路平安固定说 safe travels → Safe travels.",
        next: null
      }
    }
  },
  {
    id: "the-woman",
    transition: {
      en: "Back at Baker Street. Holmes puts the photograph of Irene Adler on the mantelpiece and looks at it for a long moment.",
      zh: "回到贝克街。福尔摩斯把艾琳·艾德勒的照片摆在壁炉架上，久久地看着它。"
    },
    title: "The Woman",
    subtitle: "贝克街 221B · 壁炉架上的照片",
    avatar: "🕵️",
    startNode: "n1",
    nodes: {
      n1: {
        npcLine: { en: "She beat me, Watson. She saw through the priest, and she was on the train before I woke.", zh: "华生，她赢了我。她看穿了那个牧师，而且在我醒来之前就上了火车。", voice: "holmes" },
        skill: "story",
        grammarTag: "past-simple",
        choices: [
          { text: "She saw through the whole plan.", zh: "她把整个计划都看穿了。", correct: true, xp: 10 },
          { text: "She seen through the whole plan.", correct: false }
        ],
        hintOnWrong: "see 的过去式是 saw，不是 seen → She saw through the whole plan.",
        next: "n2"
      },
      n2: {
        npcLine: { en: "I used to laugh at women's reasoning. I will not do that again.", zh: "我以前总笑话女人的推理。以后不会了。", voice: "holmes" },
        skill: "story",
        grammarTag: "will-future",
        choices: [
          { text: "You'll remember this one for years.", zh: "这一次你会记很多年。", correct: true, xp: 10 },
          { text: "You'll remembered this one for years.", correct: false }
        ],
        hintOnWrong: "You'll 后面跟动词原形 → You'll remember this one.",
        next: "n3"
      },
      n3: {
        npcLine: { en: "I will. And from now on, when I speak of her, I say only 'the woman'.", zh: "会的。从今往后，我提起她时，只说「那位女士」。", voice: "holmes" },
        skill: "story",
        grammarTag: "statement",
        choices: [
          { text: "I never heard you talk like this.", zh: "我从没听你这样说过话。", correct: true, xp: 10 },
          { text: "I never heared you talk like this.", correct: false }
        ],
        hintOnWrong: "hear 的过去式是 heard，不是 heared → I never heard you talk like this.",
        next: "n4"
      },
      n4: {
        avatar: "👩‍🦳",
        npcLine: { en: "Mr Holmes, a telegram. A young lady is coming at eleven, and she says it is a matter of life and death.", zh: "福尔摩斯先生，一封电报。有位年轻小姐十一点要来，她说这是生死攸关的事。", voice: "hudson" },
        skill: "case",
        grammarTag: "lets-suggestion",
        choices: [
          { text: "Let's hear what she has to say.", zh: "我们听听她怎么说吧。", correct: true, xp: 10 },
          { text: "Let's hearing what she has to say.", correct: false }
        ],
        hintOnWrong: "Let's 后面跟动词原形 → Let's hear what she has to say.",
        next: null
      }
    }
  }
);
