// 语法标签推断规则（共享模块）：给一句"玩家正确选项"推断它可能属于哪些 grammarTag。
// 用途：
//   1. validate-curriculum.mjs 用它检查"标签与句子是否一致"——标签只能标玩家产出的
//      语法（设计精华第 8 条），NPC 句里有比较级、玩家回"That's fine"不能标 comparative。
//   2. retag-grammar.mjs 用它给标错的节点重新选标签。
// 规则是正则近似，不是完整句法分析：一个句子推不出任何具体结构时归到 statement。
// 返回的数组按"越具体越靠前"排序（见 PRIORITY），retag 时取第一个在 tier 内且已引入的。

// 常见不规则过去分词（完成时/被动用），最后的 \w+ed 兜底规则动词
const PP = "been|done|gone|seen|made|taken|given|known|come|left|put|kept|told|thought|found|got|gotten|written|read|heard|felt|met|said|sold|bought|brought|built|paid|run|won|lost|held|begun|spoken|forgotten|decided|chosen|broken|shown|grown|thrown|caught|taught|sent|spent|lent|meant|led|fed|hidden|driven|ridden|risen|fallen|eaten|drunk|sung|swum|worn|torn|born|hurt|cut|set|let|hit|shut|become|beaten|bitten|blown|drawn|flown|frozen|stolen|struck|stuck|sworn|woken|understood|withdrawn|forgiven|slept|swept|wept|dealt|dreamt|learnt|lit|slid|spun|sprung|stood|stung|sunk|shrunk|shot|sought|fought|bound|wound|hung|dug|clung|flung|spread|bet|burst|cost|quit|shed|\\w+ed";
// 常见不规则过去式（一般过去时用）。跟原形同形的（put/set/let/cut/hit/read…）不放，避免误判
const PAST = "was|were|went|came|saw|made|took|got|said|told|thought|found|knew|gave|left|felt|kept|met|ran|paid|bought|brought|sold|built|won|lost|held|began|spoke|forgot|wrote|heard|did|ate|drank|slept|woke|stood|sat|became|broke|chose|drew|drove|fell|flew|grew|hid|led|lay|rode|rose|sang|sent|shook|shot|showed|sank|spent|swam|taught|threw|understood|wore|caught|fought|hung|lit|meant|rang|sought|swept|wept|dealt|fed|bent|lent|\\w+ed";
// 形容词化的 -ed（"I'm excited"），不算被动/过去时
const ADJ_ED = new Set(["tired","excited","surprised","interested","bored","worried","scared","pleased","relieved","exhausted","thrilled","amazed","confused","embarrassed","disappointed","annoyed","satisfied","delighted","touched","honored","honoured","impressed","overwhelmed","shocked","stressed","stunned","attached","determined","devoted","dedicated","married","engaged","retired","closed","crowded","complicated","detailed","limited","located","supposed","used","allowed","welcomed","prepared","organized","organised","settled","relaxed","focused","packed","loaded","tested","frightened","terrified","fascinated","motivated","inspired","blessed","hooked","spoiled","tempted","concerned","involved","committed","qualified","experienced","talented","gifted","skilled","aged","named","called","shaped","sized","colored","coloured","wanted","needed"]);
// 不及物/状态类分词：be + 这些不算被动（"she's gone", "we're done" 例外算口语状态，不算被动）
const NOT_PASSIVE = /^(gone|come|become|been|begun|grown|fallen|risen|run|slept|arrived|happened|started|finished|ended|turned|changed|worked|moved|lived|stayed|waited|talked|walked|laughed|smiled|cried|looked|seemed|died|passed|gotten|got|left|done|set|ready|agreed|based)$/;
const COMP_ADJ = "bigger|smaller|faster|slower|easier|harder|cheaper|closer|nearer|warmer|colder|older|younger|stronger|weaker|louder|quieter|longer|shorter|higher|lower|better|worse|busier|happier|earlier|safer|nicer|softer|sweeter|simpler|finer|brighter|darker|deeper|wider|richer|poorer|luckier|funnier|cuter|kinder|cooler|hotter|fresher|cleaner|tougher|calmer|prouder|healthier|heavier|lighter|thicker|thinner|tighter|looser|bolder|braver|clearer|fuller|greater|newer|larger|smarter|wiser|gentler|fairer|taller|quicker|steadier|smoother|rougher|sharper|prettier|fancier|sturdier|handier|cozier|tastier|crispier|fluffier|juicier|sunnier|rainier|windier|noisier|messier|tidier|riper|milder|wilder|fitter|slimmer|firmer|stiffer|stricter|lazier|hungrier|sleepier|friendlier|lovelier|likelier|tinier|lengthier|pricier|dearer|sooner|later|further|farther|fewer|lesser|more|less";
const NOT_SUPERLATIVE = /^(test|rest|west|east|guest|chest|nest|pest|vest|quest|forest|honest|modest|interest|harvest|request|suggest|digest|contest|protest|invest|arrest|priest|feast|beast|least|toast|coast|roast|boost|ghost|host|post|lest|jest|zest|crest|attest|detest|infest|manifest|tempest|conquest|inquest|earnest|yeast|breast|northwest|southwest|northeast|southeast|midwest|reinvest|divest|molest|congest|ingest|reforest|deforest)$/;

const W = (s) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[—–]/g, " ");
const realPP = (word) => !ADJ_ED.has(word);

export const PRIORITY = ["subjunctive", "conditional-advanced", "past-perfect", "reported-speech", "relative-clause", "concession", "passive", "present-perfect", "comparative", "conditional", "past-simple", "present-continuous", "will-future", "wh-question", "do-question", "can-modal", "phrasal-verb", "lets-suggestion", "please-request", "courtesy", "short-answer", "connector", "statement"];

export function inferGrammarTags(textRaw) {
  const s = W(textRaw);
  const tags = new Set();
  const isQuestion = /\?/.test(s);
  const sNoBetter = s.replace(/'d better/g, "had better");

  // —— L4 ——
  const pastPerfect = s.match(new RegExp(`\\b(had|'d)(n't)?\\s+(already\\s+|never\\s+|just\\s+|even\\s+|always\\s+|not\\s+|barely\\s+|only\\s+|really\\s+)?(${PP})\\b`));
  if (pastPerfect && realPP(pastPerfect[4]) && pastPerfect[4] !== "better" && !/\b(would|could|might|should)\s+$/.test(s.slice(0, pastPerfect.index))) tags.add("past-perfect");

  if (/\bwish(es|ed)?\s+(i|we|you|he|she|they|it|there|that)\b|\bif\s+(i|we|you|he|she|they|it|that|this|there)\s+(were|weren't)\b|\bif\s+only\b|\bwere\s+you\b/.test(s)) tags.add("subjunctive");

  if (/\bif\b/.test(s) && /\b(would|could|might|wouldn't|couldn't|mightn't|'d)\b/.test(sNoBetter) && !/\b(will|'ll|won't)\b/.test(s)) tags.add("conditional-advanced");
  else if (/\b(would|could|might)\s+(not\s+)?have\s+\w+/.test(s) && /\bif\b|\bhad\b|\botherwise\b/.test(s)) tags.add("conditional-advanced");
  else if (new RegExp(`\\bif\\s+(i|we|you|they|he|she|it|that|this|there|\\w+)\\s+(\\w+\\s+)?(${PAST}|wasn't|weren't|didn't|couldn't|hadn't)\\b`).test(s) && !/\b(will|'ll|won't)\b/.test(s)) tags.add("conditional-advanced");

  if (/\b(said|told|mentioned|asked|explained|promised|admitted|warned|reminded|assured|claimed|insisted|suggested|announced|replied|added)\s+(me\s+|us\s+|them\s+|him\s+|her\s+|everyone\s+)?(that\s+|if\s+|whether\s+)?(she|he|they|it|we|you|i|the|there|his|her|their|our|my|your|this|that)\b/.test(s) || /\b(asked|told|reminded|warned|begged|advised|invited|encouraged|wanted|expected)\s+(me|us|them|him|her|you|everyone|everybody|\w+)\s+(not\s+)?to\s+\w+/.test(s)) tags.add("reported-speech");

  if (/\b(although|though|even though|even if|despite|in spite of|however|whereas|nevertheless|nonetheless|still|no matter|anyway|regardless|even so|at least|on the other hand|instead|otherwise)\b/.test(s) || (/\byet\b/.test(s) && !/\b(n't|not|never|nothing|no)\b[^.!?]*\byet\b/.test(s.replace(/n't/g, ' n\'t'))) || /\bwhile\s+(i|we|you|they|he|she|it|the|that|this|some|others)\b/.test(s.replace(/^while\b/, ""))) tags.add("concession");

  if (!isQuestion) {
    if (/\b(who|whom|whose|which)\b/.test(s)) tags.add("relative-clause");
    else if (/\b(place|places|day|days|time|times|year|years|house|room|city|town|street|moment|moments|reason|reasons|way|spot|corner|kitchen|store|shop|night|morning|week|weekend|month|season|part|world|country|area|neighborhood|neighbourhood|point|stage|age)\s+(where|when|why)\b/.test(s)) tags.add("relative-clause");
    else {
      const STOP = /^(so|know|knows|knew|think|thinks|thought|hope|hoped|sure|glad|said|says|say|means|mean|meant|feel|feels|felt|believe|believed|guess|guessed|is|was|are|were|be|been|being|and|but|now|not|all|of|in|on|at|to|for|with|about|seems|seem|seemed|happy|sorry|afraid|worried|clear|true|hear|heard|see|saw|seen|realize|realized|forget|forgot|remember|remembered|wish|bet|admit|show|shows|showed|prove|proves|proved|found|find|noticed|notice|like|except|given|knowing|understand|understood|agree|agreed|doubt|imagine|suppose|promise|promised|told|tell|ensure|make|made|making|hoping|thinking|saying|feeling|worry|fact|just|only|really|it|that|this|there|here|lucky|amazing|obvious|possible|likely|proud|grateful|surprised|convinced|certain|confident|aware|assuming|assume|assumed|decided|decide|learned|learn|explained|explain|mentioned|mention|figured|figure|wondering|wonder|wondered|checking|check|checked|confirm|confirmed|adding|add|added|worth|note|noted|point|joke|reminder|way|too|enough|out|up|even|maybe|probably|honestly|mean|means|hopefully|clearly|definitely|absolutely|exactly|glad|scared|nervous|excited|relieved|sad|thankful|touched|surprised|shocked|convinced|impressed|reason|reasons|chance|chances|idea|ideas|news|good|great|nice|fine|funny|strange|weird|wild|crazy|odd|sweet|kind|generous|smart|brave|wonderful|perfect|important|interesting|wrong|right|okay|ok|understood|understand|remind|reminds|reminded|suggest|suggests|suggested|insist|insists|insisted|pretend|pretends|pretended|wish|wishes|wished|deserve|deserves|deserved|except|so|now|then|also|still|only|already|somehow|something|anything|everything|nothing)$/;
      const VERBISH = /^(is|was|are|were|has|have|had|can|could|will|would|should|might|may|does|did|do|isn't|wasn't|aren't|weren't|doesn't|didn't|hasn't|haven't|won't|can't|couldn't|\w+s|\w+ed|\w+ing|made|kept|left|took|gave|got|came|went|brought|built|held|meant|felt|knew|saw|said|told|found|lost|won|ran|sat|stood|grew|drew|broke|chose|fell|flew|hid|led|rose|sent|shook|sang|spent|swam|taught|threw|wore|woke|wrote|read|put|set|let|hit|cut|cost|shut|hurt)$/;
      const frags = s.match(/\b([a-z']+)\s+(that|which)\s+([a-z']+)\b/g) || [];
      if (frags.some((f) => { const [n, , v] = f.split(/\s+/); return !STOP.test(n) && VERBISH.test(v) && !/^(this|that|it|is|was|us|me|him|her|them|you)$/.test(v); })) tags.add("relative-clause");
      else if (/\b(whoever|whatever|whichever|whenever|wherever)\b/.test(s) || /\b(exactly|precisely|right|just|is|are|was|were|know|knows|remember|forget|that's|this is|it's)\s+(where|when|why|how)\s+(i|we|you|they|he|she|it|everyone|people|things|the|my|our|your)\b/.test(s)) tags.add("relative-clause");
    }
  }

  if (/\b(come|came|comes|coming) across\b|\blook(ed|s|ing)? (into|after|forward to|up|out for|out)\b|\bbr(ing|ought|ings) (it |that |this |them )?up\b|\bfigur(e|ed|es|ing) (it |that |this |them )?out\b|\bcarr(y|ied|ies|ying) on\b|\bdeal(t|s|ing)? with\b|\br(u|a)n(ning|s)? (into|out of|out)\b|\bpick(ed|s|ing)? (it |that |this |them |him |her |you |me )?up\b|\bset(s|ting)? (it |that |this |them )?up\b|\bg(i|a)v(e|es|ing|en) (it |that |this |them )?up\b|\bturn(ed|s|ing)? (it |that |this |them )?(off|on|out|down|around)\b|\bput(s|ting)? (it |that |this |them )?(off|on|away|down|together|back)\b|\b(tak(e|es|ing|en)|took) (it |that |this |them )?(off|over|out|apart|back)\b|\bg(e|o)t(s|ting)? (up|along|over|through|back|rid of|used to|away|by|around)\b|\b(wak(e|es|ing)|woke) up\b|\bh(a|u)ng(s|ing)? (out|on|up)\b|\bf(i|ou)nd(s|ing)? out\b|\bcheck(ed|s|ing)? (it |that |this |them )?(out|in|on)\b|\bwork(ed|s|ing)? (it |that |this |them )?out\b|\bshow(ed|s|ing)? up\b|\bend(ed|s|ing)? up\b|\bgo(es|ing)? on\b|\bwent on\b|\bhold on\b|\bkeep(s|ing)? (it |that |this |them )?(up|on|going)\b|\bkept (it |that |this |them )?(up|on|going)\b|\bmak(e|es|ing) (it |that |this |them )?up\b|\bmade (it |that |this |them )?up\b|\bpass(ed|es|ing)? out\b|\bpoint(ed|s|ing)? (it |that |this |them )?out\b|\bsort(ed|s|ing)? (it |that |this |them )?out\b|\btak(e|es|ing) care of\b|\btook care of\b|\bthr(o|e)w(s|ing|n)? (it |that |this |them )?(away|out)\b|\btr(y|ied|ies|ying) (it |that |this |them )?on\b|\bturn(ed|s|ing)? out\b|\bcalm(ed|s|ing)? down\b|\bcheer(ed|s|ing)? (up|on)\b|\bcom(e|es|ing) up with\b|\bcame up with\b|\bgr(o|e)w(s|ing|n)? up\b|\blet(s|ting)? (me |us |you |them |him |her )?down\b|\bsettl(e|ed|es|ing) (in|down)\b|\bsign(ed|s|ing)? up\b|\bstand(s|ing)? out\b|\bstood out\b|\bwarm(ed|s|ing)? up\b|\bwr(i|o)t(e|es|ing|ten) (it |that |this |them )?down\b|\bfill(ed|s|ing)? (it |that |this |them )?(out|in)\b|\bdrop(ped|s|ping)? (it |that |this |them |him |her |you |me )?off\b|\bhand(ed|s|ing)? (it |that |this |them )?(in|out|over)\b|\bmov(e|ed|es|ing) (in|out|on)\b|\bbr(eak|oke|eaks|eaking|oken) down\b|\bcatch(es|ing)? up\b|\bcaught up\b|\bcount(ed|s|ing)? on\b|\bcut(s|ting)? (it |that |this |them )?(back|down|off|out)\b|\bback (it |that |this |them |him |her |you |me )?up\b|\bbring(s|ing)? (it |that |this |them )?(back|along|over)\b|\bbrought (it |that |this |them )?(back|along|over)\b|\bstick(s|ing)? (with|to|around)\b|\bstuck (with|to|around)\b|\bopen(ed|s|ing)? up\b|\bspeak(s|ing)? up\b|\bspoke up\b|\bslow(ed|s|ing)? down\b|\bstay(ed|s|ing)? (up|in|over|away)\b|\bcome (over|along|back|by)\b|\bcame (over|along|back|by)\b|\bpay(s|ing)? (it |that |this |them )?(off|back)\b|\bpaid (it |that |this |them )?(off|back)\b|\bplug(ged|s|ging)? (it |that |this |them )?in\b|\bswitch(ed|es|ing)? (it |that |this |them )?(off|on|over)\b|\bshut(s|ting)? (it |that |this |them )?(off|down)\b|\bwind(s|ing)? down\b|\bwound down\b|\bdig(s|ging)? (in|into)\b|\bdug (in|into)\b|\bwear(s|ing)? (it |that |this |them )?(out|off)\b|\bwore (it |that |this |them )?(out|off)\b|\bwrap(ped|s|ping)? (it |that |this |them )?up\b|\b(tidy|tidied|tidies) (it |that |this |them )?up\b|\bclean(ed|s|ing)? (it |that |this |them )?(up|out)\b/.test(s)) tags.add("phrasal-verb");

  // —— L3 ——
  const passive = s.match(new RegExp(`\\b(is|are|was|were|be|been|being|get|gets|got|getting|gotten|'s|'re|'m|am)\\s+(\\w+ly\\s+|not\\s+|all\\s+|also\\s+|still\\s+|already\\s+|just\\s+|being\\s+|never\\s+|even\\s+|so\\s+|really\\s+)?(${PP})\\b`));
  if (passive && realPP(passive[3]) && !NOT_PASSIVE.test(passive[3])) tags.add("passive");
  else if (/\b(has|have|had)\s+(also\s+|just\s+|already\s+|never\s+|all\s+)?been\s+(\w+ly\s+)?(\w+ed|\w+en|made|done|taken|given|seen|told|kept|left|put|held|found|lost|won|paid|sent|shown|built|sold|bought|brought|written|read|heard|felt|met|chosen|broken|thrown|caught|taught|hurt|cut|set)\b/.test(s)) tags.add("passive");

  const presPerf = s.match(new RegExp(`(?<!\\b(?:would|could|might|should|must|may|'d|to)\\s)\\b(have|has|'ve|haven't|hasn't)\\s+(never\\s+|ever\\s+|already\\s+|just\\s+|always\\s+|also\\s+|only\\s+|not\\s+|really\\s+|finally\\s+|barely\\s+|both\\s+|all\\s+|even\\s+|actually\\s+|definitely\\s+|clearly\\s+|totally\\s+|completely\\s+|truly\\s+|certainly\\s+|honestly\\s+|probably\\s+|still\\s+)?(${PP})\\b`));
  if (presPerf && (realPP(presPerf[3]) || /\b(have|has|'ve)\s+(never|ever|already|just|always)\b/.test(s))) tags.add("present-perfect");
  else if (/,\s+(have|haven't|has|hasn't)\s+(you|we|they|he|she|it|i)\?/.test(s)) tags.add("present-perfect");
  else if (/\b(he|she|it|that|this|there|who|everyone|someone|nobody|everything|nothing)'s\s+(never\s+|already\s+|just\s+|always\s+|also\s+|only\s+|finally\s+)?(been|done|gone|seen|made|taken|given|known|come|left|kept|told|thought|found|got|gotten|written|read|heard|felt|met|said|sold|bought|brought|built|paid|run|won|lost|held|begun|spoken|forgotten|decided|chosen|broken|shown|grown|thrown|caught|taught|sent|spent|become|changed|helped|turned|worked|improved|passed|started|finished|happened|arrived)\b/.test(s)) tags.add("present-perfect");

  const sc = s.replace(/\b(had|'d) better\b/g, "had rather");
  if (new RegExp(`\\b(${COMP_ADJ}|\\w+er)\\s+(\\w+\\s+){0,3}than\\b`).test(sc) || /\bthan\b/.test(sc)
    || new RegExp(`\\b(${COMP_ADJ})\\b`).test(sc)
    || /\bthe\s+(\w+\s+)?(most|least|best|worst|\w+est)\b/.test(s) && !NOT_SUPERLATIVE.test((s.match(/\bthe\s+(\w+\s+)?(most|least|best|worst|\w+est)\b/) || [])[2] || "")
    || /\bas\s+\w+\s+as\b/.test(s)
    || (() => { const m = s.match(/(^|[.!?,]\s*|\b(my|our|your|his|her|their|its|second|third)\s+)(best|worst|\w+est)\b/); return !!m && !NOT_SUPERLATIVE.test(m[3]); })()) tags.add("comparative");

  if (/\bif\b|\bunless\b|\bas long as\b|\bin case\b/.test(s)) tags.add("conditional");

  // —— L2 ——
  const PAST_SET = new Set([...PAST.split("|").filter((w) => !w.startsWith("\\")), "wasn't", "weren't", "didn't", "couldn't", "hadn't"]);
  const AUX = /^(have|has|had|'ve|'d|is|are|was|were|be|been|being|am|'m|'re|'s|get|got|gets|getting|to)$/;
  const ADV = /^(not|never|already|just|always|also|really|ever|barely|finally|even|only|all|both|still|actually|definitely|totally|completely|truly|certainly|honestly|probably)$/;
  const words = s.replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
  let realPast = false;
  for (let i = 0; i < words.length && !realPast; i++) {
    const w = words[i];
    const isPastForm = PAST_SET.has(w) || (w.endsWith("ed") && w.length > 3 && !ADJ_ED.has(w) && !/^(need|feed|seed|bleed|breed|speed|weed|deed|reed|indeed|red|bed|shed|wed|fled|sled|led|ted|med|zed|hundred|sacred|naked|wicked|rugged|ragged|crooked|jagged|beloved|aged)$/.test(w));
    if (!isPastForm) continue;
    const prev = words[i - 1] || "", prev2 = words[i - 2] || "";
    const selfAux = /^(was|were|wasn't|weren't|had|hadn't|got|did|didn't)$/.test(w);
    if (!selfAux && AUX.test(prev)) continue;
    if (!selfAux && ADV.test(prev) && AUX.test(prev2)) continue;
    if ((w === "was" || w === "were") && passive && realPP(passive[3]) && !NOT_PASSIVE.test(passive[3])) continue;
    if (w === "had" && pastPerfect && realPP(pastPerfect[4])) continue;
    realPast = true;
  }
  if (realPast && !tags.has("conditional-advanced")) tags.add("past-simple");

  if (/\bbecause\b|\bso\s+(i|we|you|they|he|she|it|let's|that's|we'll|i'll|we're|i'm|there|this|that|maybe|the|my|our|your)\b|\bbut\b|\band then\b|\bsince\s+(i|we|you|they|he|she|it|the|that|this|last|then)\b|\buntil\b|\bbefore\s+(i|we|you|they|he|she|it|the|that|this)\b|\bafter\s+(i|we|you|they|he|she|it|the|that|this)\b|\bwhen\s+(i|we|you|they|he|she|it|the|that|this)\b(?![^?]*\?)|\bwhile\s+(i|we|you|they|he|she|it|the|that|this)\b|,\s+and\s+(i|we|you|they|he|she|it|let's|that|this|the|my|our|your|there|now|then|maybe|i'll|we'll|i'm|we're|it's|that's)\b|\bso that\b|\bthat's why\b|\bas soon as\b/.test(s)) tags.add("connector");

  // —— L1 ——
  const pc = s.match(/\b(am|is|are|'m|'re|'s)\s+(i\s+|you\s+|we\s+|they\s+|he\s+|she\s+|it\s+|there\s+)?(\w+ly\s+|not\s+|still\s+|just\s+|already\s+|all\s+|also\s+|really\s+|actually\s+|finally\s+)?(\w+ing)\b/);
  if (pc && !/^(morning|evening|something|anything|nothing|everything|thing|during|ceiling|building|wedding|feeling|meeting|clothing|sibling|darling|pudding|filling|topping|stuffing|dressing|seasoning|opening|beginning|ending|setting|painting|drawing|writing|reading|cooking|baking|shopping|parking|swimming|skating|camping|hiking|fishing|gardening|knitting|sewing|cleaning|training|planning|spring|king|ring|string|wing|bring|sing|swing|sting|being|amazing|interesting|exciting|boring|surprising|charming|stunning|willing|missing|outstanding|rewarding|tiring|relaxing|refreshing|inspiring|touching|promising|encouraging|overwhelming|comforting|soothing|fitting|becoming|thrilling|terrifying|frightening|worrying|annoying|confusing|embarrassing|disappointing|satisfying|freezing|boiling|burning|blinding|deafening|glowing|shining|striking|lasting|leading|living|loving|caring|daring|forgiving|understanding|demanding|pending|upcoming|ongoing|everything|nothing|anything|something)$/.test(pc[4])) tags.add("present-continuous");
  if (/\b(will|'ll|won't|going to|gonna)\b/.test(s)) tags.add("will-future");
  if (/(^|[.!?]\s+|,\s+|\b(and|but|so|or)\s+)(what|where|who|whom|whose|when|why|how|which)\b[^.!?]*\?/.test(s)) tags.add("wh-question");
  if (isQuestion && !tags.has("wh-question")) tags.add("do-question");
  else if (/(^|[.!?]\s+|,\s+)(do|does|did|don't|doesn't|didn't|are|is|am|was|were|aren't|isn't|wasn't|weren't|have|has|haven't|hasn't|can|can't|could|couldn't|will|won't|would|wouldn't|should|shouldn't|shall|may|might)\s+(you|we|i|they|he|she|it|there|that|this|everyone|anyone|someone|the|your|my|our|his|her|their)\b[^.!?]*\?/.test(s)) tags.add("do-question");
  if (/\b(can|can't|cannot|could|couldn't)\b/.test(s)) tags.add("can-modal");
  if (/\blet's\b|\blet us\b|\bshall we\b|\bwhy don't we\b|\bhow about\b|\bwhat about\b|\bwe should\b|\bmaybe we (can|could|should)\b/.test(s)) tags.add("lets-suggestion");
  if (/\bplease\b|\bcould you\b|\bcan you\b|\bwould you\b|\bmay i\b|\bcan i\b|\bcould i\b|\bcould we\b|\bcan we\b|\bwould you mind\b|\bdo you mind\b|\bi'd like\b|\bi would like\b/.test(s)) tags.add("please-request");
  if (/\b(thank you|thanks|sorry|excuse me|you're welcome|no problem|nice to meet you|how do you do|pleased to meet you|welcome|congratulations|congrats|good luck|bless you|pardon|my pleasure|appreciate it|much appreciated|no worries|cheers|goodnight|good night|good morning|good evening|good afternoon|bye|goodbye|see you|take care|have a good|have a great|have a nice|have a lovely|enjoy your|happy to help|anytime|don't mention it|you too|same to you|get well soon|safe travels|happy birthday|merry christmas|happy new year|well done|good job|nice work|thanks a lot|thank god)\b/.test(s)) tags.add("courtesy");
  const firstClause = s.split(/[.!?]/)[0].trim();
  if (/^(yes|no|yeah|yep|nope|sure|of course|absolutely|not really|maybe|definitely|exactly|right|okay|ok|fine|great|perfect|deal|agreed|true|correct|indeed|certainly|totally|probably|hopefully|not yet|not at all)\b/.test(firstClause) && (s.split(/\s+/).length <= 6 || /^(yes|no|yeah|yep|nope),?\s+(i|we|you|they|he|she|it)\s+(do|don't|does|doesn't|did|didn't|am|am not|is|isn't|are|aren't|was|wasn't|were|weren't|can|can't|could|couldn't|will|won't|would|wouldn't|have|haven't|has|hasn't|had|hadn't|should|shouldn't|'m|'m not|'s|'re)$/.test(firstClause))) tags.add("short-answer");

  tags.add("statement");
  return PRIORITY.filter((t) => tags.has(t));
}

// 各 tier 允许玩家产出的 grammarTag（累计）。跟 validate-curriculum.mjs 的 TIER_TAGS 保持一致。
export const TIER_TAGS = {
  L1: ["statement", "do-question", "wh-question", "can-modal", "will-future", "present-continuous", "short-answer", "please-request", "courtesy", "lets-suggestion"],
  L2: ["past-simple", "connector"],
  L3: ["present-perfect", "comparative", "conditional", "passive"],
  L4: ["past-perfect", "subjunctive", "reported-speech", "concession", "conditional-advanced", "relative-clause", "phrasal-verb"],
};
export const TIER_ORDER = ["L1", "L2", "L3", "L4"];
export function tagsUpTo(tier) {
  const idx = TIER_ORDER.indexOf(tier);
  return new Set(TIER_ORDER.slice(0, idx + 1).flatMap((t) => TIER_TAGS[t]));
}
export function tierOfTag(tag) {
  for (const t of TIER_ORDER) if (TIER_TAGS[t].includes(tag)) return t;
  return null;
}
// 标签是否被句子支持："statement" 永远可以（兜底结构）；其他标签必须能从句子推出来。
export function tagSupported(tag, text) {
  if (!tag) return false;
  if (tag === "statement") return true;
  return inferGrammarTags(text).includes(tag);
}

// —— 干扰项质量规则（设计精华第 5 条）——
export const BANNED_DISTRACTORS = new Set([
  "goodbye.", "goodbye forever.", "i don't know.", "no idea.", "i have no money.", "i don't need it.",
  "i'm not hungry.", "i don't care.", "whatever.", "leave me alone.", "go away.", "no, never.", "maybe not.",
  "i don't like rooms.", "nothing.", "no.", "yes.", "i don't understand.", "shut up.", "who are you?",
]);
export const MAX_LENGTH_RATIO = 1.75;
export function tokenize(text) { return (text || "").toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []; }
export function distractorIssues(node) {
  const issues = [];
  const correct = node.choices.find((c) => c.correct);
  const wrong = node.choices.filter((c) => !c.correct);
  if (!correct || wrong.length === 0) return ["节点缺少正确/错误选项"];
  for (const w of wrong) {
    const key = w.text.trim().toLowerCase();
    if (BANNED_DISTRACTORS.has(key)) issues.push(`错误选项 "${w.text}" 在荒谬干扰项黑名单里`);
    if (key === correct.text.trim().toLowerCase()) issues.push(`错误选项与正确选项相同："${w.text}"`);
  }
  const cl = tokenize(correct.text).length;
  const maxWrong = Math.max(...wrong.map((w) => tokenize(w.text).length));
  if (cl >= 4 && cl > maxWrong * MAX_LENGTH_RATIO) issues.push(`正确选项 ${cl} 词，最长错误选项 ${maxWrong} 词，长度泄露答案`);
  return issues;
}
