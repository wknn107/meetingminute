/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Define interfaces for corporate and change details
export interface Shareholder {
  name: string;
  shares: number;
  address: string;
}

export interface CurrentDirector {
  title: string;
  name: string;
  address?: string;
}

export interface OfficerChange {
  name: string;
  type: "election" | "resignation" | "reappointment" | "retirement" | "dismissal";
  title: string;
  newAddress?: string;
}

export interface ArticleChange {
  item: "name" | "purpose" | "relocation" | "shares" | "other";
  oldValue: string;
  newValue: string;
}

export interface BranchChange {
  type: "establish" | "relocate" | "abolish";
  branchName: string;
  location: string;
  newLocation?: string;
}

export interface FormData {
  companyName: string;
  headOffice: string;
  representativeTitle: string;
  representativeName: string;
  hasBoard: boolean;
  hasAudit: boolean;
  capital: number;
  totalShares: number;
  shareholders: Shareholder[];
  currentDirectors: CurrentDirector[];
  changeType: "officer" | "articles" | "branch" | "mixed";
  decisionDate: string;
  effectiveDate: string;
  meetingPlace: string;
  meetingTime: string;
  changeDetails: {
    officerChanges: OfficerChange[];
    articleChanges: ArticleChange[];
    branchChanges: BranchChange[];
  };
}

// Utility to format Japanese dates
export function formatDateJa(dateStr: string): string {
  if (!dateStr) return "[ 年 月 日 ]";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  } catch (e) {
    return dateStr;
  }
}

// Format Currency to Japanese Yen notation
export function formatCurrencyJa(amount: number): string {
  if (!amount) return "0円";
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount).replace("￥", "") + "円";
}

// Documents templates generation
export function generateMinutesOfShareholders(data: FormData): string {
  const dateJa = formatDateJa(data.decisionDate);
  const effectiveDateJa = formatDateJa(data.effectiveDate);
  const company = data.companyName || "[ 会社名 ]";
  const head = data.headOffice || "[ 本店所在地 ]";
  
  // Calculate default values if not set
  const totalShareholdersCount = data.shareholders.length > 0 ? data.shareholders.length : 3;
  const totalVotingRightsCount = data.totalShares || 100;
  const attendingShareholdersCount = data.shareholders.length > 0 ? Math.ceil(data.shareholders.length * 0.8) : 2;
  const attendingVotingRightsCount = data.totalShares ? Math.ceil(data.totalShares * 0.9) : 90;

  let agendaAndResolutions = "";

  // Officer changes resolution text
  const elections = data.changeDetails.officerChanges.filter(c => c.type === "election" || c.type === "reappointment");
  const resignations = data.changeDetails.officerChanges.filter(c => c.type === "resignation" || c.type === "retirement" || c.type === "dismissal");

  let agendaNum = 1;

  if (elections.length > 0 || resignations.length > 0) {
    agendaAndResolutions += `第${agendaNum}号議案　役員選任の件

    議長は、当会社の現任役員のうち[ 以下役員名 ]が${effectiveDateJa}をもって[ 辞任・任期満了 ]により退任することとなるため、新たに役員の選任をする必要がある旨を述べ、その選任方法を諮ったところ、満場一致をもって議長の一任とすることに決し、議長は以下の通り指名した。

${elections.map((ele, idx) => `    ${ele.title}　${ele.name || "[ 候補者氏名 ]"}（${ele.type === "reappointment" ? "重任" : "新任"}）`).join("\n")}

    議長が、上記被選任者らにつきその承認を求めたところ、満場一致をもってこれに賛成した。
    なお、被選任者らは、いずれも即座にその就任を承諾した。
\n`;
    agendaNum++;
  }

  // Article changes resolution text
  const articleChanges = data.changeDetails.articleChanges;
  if (articleChanges.length > 0) {
    agendaAndResolutions += `第${agendaNum}号議案　定款一部変更の件

    議長は、当会社の事業運営および今後の発展に鑑み、以下の通り定款の一部を変更したい旨を提案し、その詳細を説明した。

    【変更内容】
${articleChanges.map(change => {
  let itemTitle = "定款の変更";
  if (change.item === "name") itemTitle = "商号の変更";
  if (change.item === "purpose") itemTitle = "目的の変更";
  if (change.item === "relocation") itemTitle = "本店の移転";
  
  return `    ＜${itemTitle}＞
    変更前：
    ${change.oldValue || "[ 旧内容 ]"}
    変更後：
    ${change.newValue || "[ 新内容 ]"}`;
}).join("\n\n")}

    議長がその賛否を諮ったところ、出席株主全員の賛成（または特別決議に必要な多数の賛成）をもって、原案通り承認可決された。
    なお、本定款変更の効力は、${effectiveDateJa}より発生するものとする。
\n`;
    agendaNum++;
  }

  // Fallback if no specific agenda
  if (agendaAndResolutions === "") {
    agendaAndResolutions += `第1号議案　[ 議案名称の件 ]

    議長は、[ 決議事項の具体的な内容 ]について詳細に説明し、その承認を求めたところ、満場一致（または必要な多数の賛成）をもって、原案通り承認可決された。
\n`;
  }

  return `臨時株主総会議事録

1. 本店所在地　${head}
2. 商号　　　　${company}
3. 開催日時　　${dateJa}　${data.meetingTime || "午前10時00分"}
4. 開催場所　　${data.meetingPlace || "当会社本店会議室"}
5. 株主の総数　　　　　　　　${totalShareholdersCount}名
6. 発行済株式の総数　　　　　${totalVotingRightsCount}株
7. 議決権を行使できる株主の総数　${totalShareholdersCount}名
8. その議決権の総数　　　　　${totalVotingRightsCount}個
9. 出席株主数（委任状による者を含む）　${attendingShareholdersCount}名
10. 出席株主の議決権数　　　　${attendingVotingRightsCount}個
11. 出席取締役　${data.representativeName || "[ 代表取締役氏名 ]"}（議長）
    （他出席者：${data.currentDirectors.filter(d => d.name !== data.representativeName).map(d => d.name).join("、") || "なし"}）

以上の通り株主の出席があったので、代表取締役 ${data.representativeName || "[ 代表取締役氏名 ]"} は議長席に就き、本総会は適法に成立した旨を宣言して開会した。

【決議事項】

${agendaAndResolutions}
以上をもって本日の議事を終了したので、議長は閉会を宣言した。
上記決議を明確にするため、この議事録を作成し、出席取締役が次に記名押印する。

${dateJa}

　　${company}　臨時株主総会

　　　　議長・出席取締役　${data.representativeName || "[ 代表取締役氏名 ]"}　(代表印)

${data.currentDirectors.filter(d => d.name !== data.representativeName).map(d => `　　　　出席取締役　　　　${d.name}　(認印)`).join("\n")}
`;
}

export function generateMinutesOfBoard(data: FormData): string {
  const dateJa = formatDateJa(data.decisionDate);
  const effectiveDateJa = formatDateJa(data.effectiveDate);
  const company = data.companyName || "[ 会社名 ]";
  const head = data.headOffice || "[ 本店所在地 ]";

  const totalDirectors = data.currentDirectors.filter(d => d.title.includes("取締役")).length || 3;
  const attendingDirectors = data.currentDirectors.filter(d => d.title.includes("取締役")).map(d => d.name).join("、") || "[ 取締役全員 ]";

  let agendaAndResolutions = "";
  let agendaNum = 1;

  // Rep selection (if rep has changed or newly selected)
  const repChange = data.changeDetails.officerChanges.find(c => c.title === "代表取締役" && (c.type === "election" || c.type === "reappointment"));
  if (repChange) {
    agendaAndResolutions += `第${agendaNum}号議案　代表取締役選定の件

    議長は、当会社の代表取締役を選定する必要がある旨を述べ、その選定方法を諮ったところ、満場一致をもって取締役の互選により選定することに決決し、全員の合意をもって、次の者を選定した。

    　　代表取締役　${repChange.name || "[ 代表取締役氏名 ]"}

    被選定者は即座にその就任を承諾した。
\n`;
    agendaNum++;
  }

  // Branch establishment/relocation/abolishment
  const branches = data.changeDetails.branchChanges;
  if (branches.length > 0) {
    agendaAndResolutions += `第${agendaNum}号議案　支店に関する決議の件

    議長は、当会社の業務拡大および経営効率化のため、支店の設置・移転または廃止について以下の通り行いたい旨を提案した。

${branches.map(branch => {
  if (branch.type === "establish") {
    return `    ＜支店の設置＞
    1. 支店の名称：${branch.branchName || "支店"}
    2. 所在地：${branch.location || "[ 支店設置場所 ]"}
    3. 設置年月日：${effectiveDateJa}`;
  } else if (branch.type === "relocate") {
    return `    ＜支店の移転＞
    1. 支店の名称：${branch.branchName || "支店"}
    2. 従前の所在地：${branch.location || "[ 旧支店所在地 ]"}
    3. 移転先：${branch.newLocation || "[ 新支店所在地 ]"}
    4. 移転年月日：${effectiveDateJa}`;
  } else {
    return `    ＜支店の廃止＞
    1. 支店の名称：${branch.branchName || "支店"}
    2. 所在地：${branch.location || "[ 旧支店所在地 ]"}
    3. 廃止年月日：${effectiveDateJa}`;
  }
}).join("\n\n")}

    議長がその賛否を諮ったところ、出席取締役の満場一致をもって、原案通り決議された。
\n`;
    agendaNum++;
  }

  // Head office relocation decision (if relocate within same judicial district/determines detail address)
  const relocation = data.changeDetails.articleChanges.find(c => c.item === "relocation");
  if (relocation) {
    agendaAndResolutions += `第${agendaNum}号議案　本店移転先および移転時期決定の件

    議長は、[ 日付 ]開催の臨時株主総会において、本店の移転について定款変更が決議されたことを受け、その具体的な移転先住所および移転日を決定したい旨を提案した。

    1. 移転先本店所在地：${relocation.newValue || "[ 新本店所在地 ]"}
    2. 移転期日：${effectiveDateJa}

    議長がその賛否を諮ったところ、出席取締役の満場一致をもって、原案通り決議された。
\n`;
    agendaNum++;
  }

  if (agendaAndResolutions === "") {
    agendaAndResolutions += `第1号議案　[ 取締役会決議事項の件 ]

    議長より、[ 決議事項の詳細 ]について提案があり、出席取締役にて慎重に審議した結果、出席取締役の満場一致をもって、原案通り承認決議された。
\n`;
  }

  return `取締役会議事録

1. 開催日時　　${dateJa}　${data.meetingTime || "午前11時30分"}
2. 開催場所　　${data.meetingPlace || "当会社本店会議室"}
3. 出席取締役　${attendingDirectors} (総数 ${totalDirectors}名)
4. 出席監査役　${data.hasAudit ? "[ 監査役氏名 ]" : "なし"}
5. 議長　　　　代表取締役　${data.representativeName || "[ 代表取締役氏名 ]"}

上記の通り取締役および監査役の出席があったので、代表取締役 ${data.representativeName || "[ 代表取締役氏名 ]"} は議長席に就き、本取締役会は適法に成立した旨を宣言して開会した。

【決議事項】

${agendaAndResolutions}
以上をもって本日の議事を終了したので、議長は閉会を宣言した。
上記決議を明確にするため、この議事録を作成し、出席取締役および出席監査役が次に記名押印する。

${dateJa}

　　${company}　取締役会

　　　　代表取締役　${data.representativeName || "[ 代表取締役氏名 ]"}　(代表印)

${data.currentDirectors.filter(d => d.name !== data.representativeName && d.title.includes("取締役")).map(d => `　　　　取締役　　　${d.name}　(認印)`).join("\n")}
`;
}

// Written consent of all shareholders (Company Law Section 319-1) - written resolution
export function generateShareholderConsent(data: FormData): string {
  const effectiveDateJa = formatDateJa(data.effectiveDate);
  const company = data.companyName || "[ 会社名 ]";
  const head = data.headOffice || "[ 本店所在地 ]";

  const officerElections = data.changeDetails.officerChanges.filter(c => c.type === "election" || c.type === "reappointment");
  const articleChanges = data.changeDetails.articleChanges;

  let proposals = "";
  if (officerElections.length > 0) {
    proposals += `【提案事項：役員選任の件】
以下の者を役員に選任すること。
${officerElections.map(ele => `・${ele.title}　${ele.name || "[ 氏名 ]"}（就任予定日：${effectiveDateJa}）`).join("\n")}
`;
  }

  if (articleChanges.length > 0) {
    if (proposals !== "") proposals += "\n";
    proposals += `【提案事項：定款一部変更の件】
以下の通り定款を変更すること（効力発生日：${effectiveDateJa}）。
${articleChanges.map(change => `・${change.item === "name" ? "商号" : change.item === "purpose" ? "事業目的" : "本店所在地"}を「${change.newValue || "[ 新内容 ]"}」に変更する。`).join("\n")}
`;
  }

  if (proposals === "") {
    proposals = `【提案事項：[ 議案名称 ]の件】
[ 提案事項の具体的な内容 ]を決定すること。`;
  }

  return `株主総会議決事項に関する同意書

当会社の取締役より、会社法第３１９条第１項に基づく以下の提案がありました。当株主は、当該提案事項について全員異議なく同意いたします。

【提案事項】
${proposals}

${formatDateJa(data.decisionDate)}

　　${company}　御中

　　　　株主の住所：${data.shareholders[0]?.address || "[ 株主住所 ]"}
　　　　株主の氏名：${data.shareholders[0]?.name || "[ 株主氏名または会社名 ]"}　(印)
        （保有株式数：${data.shareholders[0]?.shares || "[ 株式数 ]"}株）
`;
}

// Letter of Resignation
export function generateResignationLetter(data: FormData, officerName: string): string {
  const effectiveDateJa = formatDateJa(data.effectiveDate);
  const company = data.companyName || "[ 会社名 ]";
  
  const officer = data.changeDetails.officerChanges.find(c => c.name === officerName && c.type === "resignation");
  const title = officer ? officer.title : "取締役";

  return `辞　任　届

私は、令和[  ]年[  ]月[  ]日（または ${effectiveDateJa}）をもって、都合により貴社の ${title} を辞任いたします。

${formatDateJa(data.decisionDate)}

　　株主の住所（または辞任役員の住所）：${officer?.newAddress || "[ 辞任役員の住所 ]"}
　　氏名：${officerName || "[ 辞任役員の氏名 ]"}　(印)

${company}　御中
`;
}

// Letter of Acceptance of Office
export function generateAcceptanceLetter(data: FormData, officerName: string): string {
  const effectiveDateJa = formatDateJa(data.effectiveDate);
  const company = data.companyName || "[ 会社名 ]";
  
  const officer = data.changeDetails.officerChanges.find(c => c.name === officerName && (c.type === "election" || c.type === "reappointment"));
  const title = officer ? officer.title : "取締役";

  return `就　任　承　諾　書

私は、令和[  ]年[  ]月[  ]日（または ${formatDateJa(data.decisionDate)}）開催の貴社株主総会（または取締役会）において、貴社の ${title} に選任されましたので、その就任を承諾いたします。

${formatDateJa(data.decisionDate)}

　　住所：${officer?.newAddress || "[ 就任役員の住所 ]"}
　　氏名：${officerName || "[ 就任役員の氏名 ]"}　(印)

${company}　御中
`;
}

// Shareholders List (株主リスト)
export function generateShareholderList(data: FormData): string {
  const company = data.companyName || "[ 会社名 ]";
  const dateJa = formatDateJa(data.decisionDate);

  let shareholdersText = "";
  if (data.shareholders.length > 0) {
    shareholdersText = data.shareholders.map((sh, idx) => `
${idx + 1}. 株主の氏名又は名称：${sh.name || "[ 株主名 ]"}
   住所：${sh.address || "[ 株主住所 ]"}
   株式数：${sh.shares || "[ 株式数 ]"}株
   議決権数：${sh.shares || "[ 議決権数 ]"}個 (割合: ${((sh.shares / (data.totalShares || 100)) * 100).toFixed(1)}%)`).join("\n");
  } else {
    shareholdersText = `
1. 株主の氏名又は名称：[ 代表株主氏名 ]
   住所：[ 代表株主住所 ]
   株式数：${data.totalShares ? Math.ceil(data.totalShares * 0.7) : "70"}株
   議決権数：${data.totalShares ? Math.ceil(data.totalShares * 0.7) : "70"}個 (割合: 70.0%)

2. 株主の氏名又は名称：[ 第二株主氏名 ]
   住所：[ 第二株主住所 ]
   株式数：${data.totalShares ? Math.floor(data.totalShares * 0.3) : "30"}株
   議決権数：${data.totalShares ? Math.floor(data.totalShares * 0.3) : "30"}個 (割合: 30.0%)`;
  }

  return `株　主　リ　ス　ト

当会社の総株主の議決権の数に対する割合が、いずれも上位１０名の株主又はその有する議決権の数の割合を順次加算してその割合が３分の２以上に達するまでの株主は、次のとおりです。

【会社概要】
・商号：${company}
・基準日（総会年月日）：${dateJa}
・発行済株式の総数：${data.totalShares || "[ 総株式数 ]"}株
・総株主の議決権の数：${data.totalShares || "[ 総議決権数 ]"}個

【株主一覧】
${shareholdersText}

上記の内容が真実であることを証明します。

${formatDateJa(data.decisionDate)}

　　商号：${company}
　　本店所在地：${data.headOffice || "[ 本店所在地 ]"}
　　代表取締役：${data.representativeName || "[ 代表取締役氏名 ]"}　(代表印)
`;
}

// Application Registration Annex (登記申請書の別紙 / OCRテキスト)
export function generateOcrText(data: FormData): string {
  const dateStr = data.effectiveDate ? data.effectiveDate.replace(/-/g, "") : "[年月日]";
  const dateFormatted = data.effectiveDate ? (() => {
    const d = new Date(data.effectiveDate);
    return `令和[ ]年${d.getMonth() + 1}月${d.getDate()}日`;
  })() : "令和[ ]年[ ]月[ ]日";

  let body = "";

  if (data.changeType === "officer" || data.changeType === "mixed") {
    body += `「役員に関する事項」
「資格」取締役
「氏名」[ 退任役員氏名 ]
「原因年月日」${dateFormatted}退任

「資格」取締役
「氏名」[ 新任役員氏名 ]
「原因年月日」${dateFormatted}就任

「資格」代表取締役
「住所」${data.headOffice || "[ 新代表取締役住所 ]"}
「氏名」${data.representativeName || "[ 新代表取締役氏名 ]"}
「原因年月日」${dateFormatted}選定（または就任）
`;
  }

  if (data.changeType === "articles" || data.changeType === "mixed") {
    const nameChange = data.changeDetails.articleChanges.find(c => c.item === "name");
    const purposeChange = data.changeDetails.articleChanges.find(c => c.item === "purpose");
    const relocationChange = data.changeDetails.articleChanges.find(c => c.item === "relocation");

    if (nameChange) {
      body += `\n「商号」${nameChange.newValue || "[ 新商号 ]"}
「原因年月日」${dateFormatted}変更
`;
    }
    if (purposeChange) {
      body += `\n「目的」
${purposeChange.newValue || "1. [ 事業目的１ ]\n2. [ 事業目的２ ]"}
「原因年月日」${dateFormatted}変更
`;
    }
    if (relocationChange) {
      body += `\n「本店所在地」${relocationChange.newValue || "[ 新本店所在地 ]"}
「原因年月日」${dateFormatted}移転
`;
    }
  }

  if (data.changeType === "branch") {
    const branch = data.changeDetails.branchChanges[0];
    if (branch) {
      body += `\n「支店に関する事項」
「支店番号」１
「支店の名称」${branch.branchName || "支店"}
「支店の所在地」${branch.type === "relocate" ? branch.newLocation : branch.location || "[ 支店住所 ]"}
「原因年月日」${dateFormatted}${branch.type === "establish" ? "設置" : branch.type === "relocate" ? "移転" : "廃止"}
`;
    }
  }

  if (body === "") {
    body = `「登記すべき事項」
[ 変更された登記の内容を日本の商業登記規則に従ってここに記入します。 ]
「原因年月日」${dateFormatted}変更
`;
  }

  return `【登記すべき事項】

${body.trim()}
`;
}

// Power of Attorney (委任状)
export function generatePowerOfAttorney(data: FormData): string {
  const company = data.companyName || "[ 会社名 ]";
  const dateJa = formatDateJa(data.decisionDate);

  return `委　任　状

代理人の住所：[ 代理人の住所（例：東京都千代田区麹町一丁目1番地）]
代理人の氏名：[ 代理人の氏名（例：司法書士　登記 太郎）]

私は、上記の者を代理人と定め、次の権限を委任します。

１．当会社の登記申請に関する一切の件
　　・商号：${company}
　　・登記の原因：${formatDateJa(data.effectiveDate)}[ 役員変更 / 定款変更 等 ]
　　・登記すべき事項：[ 別紙の通り ]
２．原本還付の請求および受領の件
３．登録免許税の還付金受領に関する一切の件

${dateJa}

　　委任者：
　　住所：${data.headOffice || "[ 本店所在地 ]"}
　　商号：${company}
　　代表取締役：${data.representativeName || "[ 代表取締役氏名 ]"}　(代表印)
`;
}

// Seal Registration Form (印鑑届書 - 代表的な項目)
export function generateSealRegistration(data: FormData): string {
  const company = data.companyName || "[ 会社名 ]";

  return `印　鑑　届　書

【届出印の表示】
(ここに直径1cm以上3cm以内の会社の代表社印（実印）を押印します)

【届出者（代表取締役等）の資格・氏名】
・資格：${data.representativeTitle || "代表取締役"}
・氏名：${data.representativeName || "[ 代表取締役氏名 ]"}
・生年月日：令和[ ]年[ ]月[ ]日（または西暦）

【当会社の概要】
・商号：${company}
・本店：${data.headOffice || "[ 本店所在地 ]"}

【市区町村長作成の印鑑証明書】
(代表取締役の個人の印鑑証明書（発行後3ヶ月以内）を添付、または市区町村コードと言い換え)

上記届出印に相違ないことを届け出ます。

${formatDateJa(data.decisionDate)}

　　届出人住所：[ 代表取締役の個人住所 ]
　　届出人氏名：${data.representativeName || "[ 代表取締役氏名 ]"}　(個人実印)

法務局　[ 管轄法務局（例：東京法務局）]　御中
`;
}

// Calculate Registration Tax (登録免許税シミュレーター)
export function calculateRegistrationTax(data: FormData): { tax: number; basis: string } {
  let tax = 0;
  let reasons: string[] = [];

  const isCapitalOver100M = data.capital >= 100000000;

  if (data.changeType === "officer" || data.changeType === "mixed") {
    const officerTax = isCapitalOver100M ? 30000 : 10000;
    tax += officerTax;
    reasons.push(`役員変更の登記（資本金1億円${isCapitalOver100M ? "超" : "以下"}）：${formatCurrencyJa(officerTax)}`);
  }

  if (data.changeType === "articles" || data.changeType === "mixed") {
    const articleChanges = data.changeDetails.articleChanges;
    
    // Check for relocation, name change, purpose change
    const hasRelocation = articleChanges.some(c => c.item === "relocation");
    const hasNameOrPurpose = articleChanges.some(c => c.item === "name" || c.item === "purpose");

    if (hasNameOrPurpose) {
      tax += 30000;
      reasons.push(`商号変更または目的変更の登記（定款変更1申請）：30,000円`);
    }

    if (hasRelocation) {
      // Check if relocation is inside or outside jurisdiction (if contains different prefecture/city, assume outside for warning)
      // For simplicity, provide options inside the UI, but here we can calculate standard管轄内 (30,000円) as default,
      // and note that if it is outside, it will be 60,000円 (30,000 yen each for old and new jurisdiction)
      tax += 30000;
      reasons.push(`本店移転の登記（同一管轄内の場合。他管轄移転は60,000円）：30,000円`);
    }
  }

  if (data.changeType === "branch") {
    // Branch change is 60,000 yen for establishment, 30,000 for relocate/abolish
    const branch = data.changeDetails.branchChanges[0];
    if (branch) {
      if (branch.type === "establish") {
        tax += 60000;
        reasons.push(`支店設置の登記：60,000円`);
      } else {
        tax += 30000;
        reasons.push(`支店の移転・廃止の登記：30,000円`);
      }
    }
  }

  if (tax === 0) {
    tax = 10000;
    reasons.push(`一般的なその他の登記申請：10,000円`);
  }

  return {
    tax,
    basis: reasons.join("\n")
  };
}
