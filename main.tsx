/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  FileText,
  Sparkles,
  ClipboardCheck,
  Scale,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign,
  Briefcase,
  Layers,
  MapPin,
  Users,
  Copy,
  ChevronRight,
  Eye,
  FileCheck
} from "lucide-react";
import {
  FormData,
  Shareholder,
  CurrentDirector,
  OfficerChange,
  ArticleChange,
  BranchChange,
  formatDateJa,
  formatCurrencyJa,
  generateMinutesOfShareholders,
  generateMinutesOfBoard,
  generateShareholderConsent,
  generateResignationLetter,
  generateAcceptanceLetter,
  generateShareholderList,
  generateOcrText,
  generatePowerOfAttorney,
  generateSealRegistration,
  calculateRegistrationTax
} from "./lib/templates";

// Sample scenario presets for user testing
const SAMPLE_SCENARIOS = {
  officerOnly: {
    title: "役員の追加と辞任 (標準)",
    text: `【登記簿のコピペ / メモ】
商号：株式会社テックフロンティア
本店：東京都渋谷区道玄坂二丁目2番2号
資本金の額：金500万円
発行済株式の総数：100株
取締役会：なし
現在の取締役：
・代表取締役　渋谷 太郎（住所：東京都渋谷区代々木一丁目1番1号）
・取締役　道玄坂 次郎

【変更したい内容】
・令和8年7月1日に取締役の道玄坂次郎が辞任する。
・代わりに、令和8年7月1日付で「青山 健一」（住所：東京都港区南青山三丁目3番3号）が新たに取締役に選任・就任する。
・同日の株主総会および取締役の互選にて決定。`
  },
  articlesOnly: {
    title: "商号変更と本店移転",
    text: `【自社のメモ】
現在：
・商号：スマートロジ合同会社から株式会社へ組織変更した「スマートロジ株式会社」
・本店：神奈川県横浜市中区元町一丁目1番地
・取締役会：なし
・代表取締役：元町 玲子

【決議内容】
・令和8年8月1日付で商号を「スマートロジ・グローバル株式会社」に変更。
・同日付で、本店を「東京都品川区大崎一丁目1番1号」に移転する。
・株主総会は令和8年7月25日に開催して定款変更を決議する。`
  },
  branchOnly: {
    title: "支店の設置",
    text: `【会社メモ】
商号：フューチャーアスリート株式会社
本店：大阪府大阪市中央区心斎橋筋一丁目1番1号
代表取締役：難波 栄一
取締役会：設置あり
取締役：難波 栄一、梅田 佳子、天王寺 茂

【決議内容】
・令和8年7月15日の取締役会において、令和8年8月1日付で京都に新しい支店を設置することを決議した。
・支店の名称：京都四条支店
・支店の所在地：京都府京都市下京区四条通烏丸東入ル一丁目1番地`
  }
};

const INITIAL_FORM_DATA: FormData = {
  companyName: "株式会社アンティグラビティ",
  headOffice: "東京都千代田区大手町一丁目1番1号",
  representativeTitle: "代表取締役",
  representativeName: "登記 太郎",
  hasBoard: true,
  hasAudit: false,
  capital: 10000000,
  totalShares: 200,
  shareholders: [
    { name: "登記 太郎", shares: 140, address: "東京都千代田区大手町一丁目1番1号" },
    { name: "創業者 次郎", shares: 60, address: "東京都新宿区西新宿二丁目2番2号" }
  ],
  currentDirectors: [
    { title: "代表取締役", name: "登記 太郎", address: "東京都千代田区大手町一丁目1番1号" },
    { title: "取締役", name: "創業者 次郎" },
    { title: "取締役", name: "監査 幸子" }
  ],
  changeType: "mixed",
  decisionDate: "2026-06-24",
  effectiveDate: "2026-07-01",
  meetingPlace: "当会社本店会議室",
  meetingTime: "午前10時00分",
  changeDetails: {
    officerChanges: [
      { name: "監査 幸子", type: "resignation", title: "取締役" },
      { name: "新任 健一", type: "election", title: "取締役", newAddress: "東京都港区六本木三丁目3番3号" }
    ],
    articleChanges: [
      { item: "name", oldValue: "株式会社アンティグラビティ", newValue: "株式会社アンティグラビティ・テクノロジーズ" }
    ],
    branchChanges: [
      { type: "establish", branchName: "大阪支店", location: "大阪府大阪市北区梅田二丁目2番2号" }
    ]
  }
};

export default function App() {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [rawText, setRawText] = useState<string>("");
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"draft" | "tax" | "legal">("draft");
  const [selectedDocId, setSelectedDocId] = useState<string>("minutes_shareholders");
  const [useWrittenResolution, setUseWrittenResolution] = useState<boolean>(false);

  // Legal check report states
  const [legalReport, setLegalReport] = useState<string>("");
  const [isCheckingLegal, setIsCheckingLegal] = useState<boolean>(false);
  const [legalError, setLegalError] = useState<string | null>(null);

  // Copy feedback state
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  // Trigger default legal check once on load if report is empty
  useEffect(() => {
    handleLegalCheckSilent();
  }, []);

  const handleApplyPreset = (key: keyof typeof SAMPLE_SCENARIOS) => {
    setRawText(SAMPLE_SCENARIOS[key].text);
  };

  const handleParseText = async () => {
    if (!rawText.trim()) {
      alert("テキストを入力またはサンプルを選択してください。");
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const response = await fetch("/api/gemini/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });

      if (!response.ok) {
        throw new Error("AIによる解析に失敗しました。サーバーの稼働状態を確認してください。");
      }

      const data = await response.json();
      
      // Merge with default config to avoid missing default fields
      const merged: FormData = {
        ...INITIAL_FORM_DATA,
        ...data,
        capital: Number(data.capital) || INITIAL_FORM_DATA.capital,
        totalShares: Number(data.totalShares) || INITIAL_FORM_DATA.totalShares,
        changeDetails: {
          officerChanges: data.changeDetails?.officerChanges || [],
          articleChanges: data.changeDetails?.articleChanges || [],
          branchChanges: data.changeDetails?.branchChanges || []
        }
      };

      setFormData(merged);
      
      // Auto switch doc if types have changed
      if (merged.changeType === "branch") {
        setSelectedDocId("minutes_board");
      } else {
        setSelectedDocId("minutes_shareholders");
      }

      // Re-trigger legal check for new state
      handleLegalCheck(merged);
    } catch (err: any) {
      setParseError(err.message || "予期しないエラーが発生しました。");
    } finally {
      setIsParsing(false);
    }
  };

  const handleLegalCheckSilent = async (customData?: FormData) => {
    try {
      const targetData = customData || formData;
      const response = await fetch("/api/gemini/legal-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: targetData }),
      });
      if (response.ok) {
        const data = await response.json();
        setLegalReport(data.report);
      }
    } catch (e) {
      // Silent catch on init
    }
  };

  const handleLegalCheck = async (customData?: FormData) => {
    setIsCheckingLegal(true);
    setLegalError(null);
    try {
      const targetData = customData || formData;
      const response = await fetch("/api/gemini/legal-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: targetData }),
      });

      if (!response.ok) {
        throw new Error("リーガルチェックの生成に失敗しました。");
      }

      const data = await response.json();
      setLegalReport(data.report);
      setActiveTab("legal");
    } catch (err: any) {
      setLegalError(err.message || "エラーが発生しました。");
    } finally {
      setIsCheckingLegal(false);
    }
  };

  // Form manipulation helpers
  const updateFormField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddOfficerChange = () => {
    setFormData(prev => ({
      ...prev,
      changeDetails: {
        ...prev.changeDetails,
        officerChanges: [
          ...prev.changeDetails.officerChanges,
          { name: "", type: "election", title: "取締役", newAddress: "" }
        ]
      }
    }));
  };

  const handleRemoveOfficerChange = (idx: number) => {
    setFormData(prev => {
      const copy = [...prev.changeDetails.officerChanges];
      copy.splice(idx, 1);
      return {
        ...prev,
        changeDetails: { ...prev.changeDetails, officerChanges: copy }
      };
    });
  };

  const handleUpdateOfficerChange = (idx: number, field: keyof OfficerChange, value: any) => {
    setFormData(prev => {
      const copy = [...prev.changeDetails.officerChanges];
      copy[idx] = { ...copy[idx], [field]: value };
      return {
        ...prev,
        changeDetails: { ...prev.changeDetails, officerChanges: copy }
      };
    });
  };

  const handleAddArticleChange = () => {
    setFormData(prev => ({
      ...prev,
      changeDetails: {
        ...prev.changeDetails,
        articleChanges: [
          ...prev.changeDetails.articleChanges,
          { item: "other", oldValue: "", newValue: "" }
        ]
      }
    }));
  };

  const handleRemoveArticleChange = (idx: number) => {
    setFormData(prev => {
      const copy = [...prev.changeDetails.articleChanges];
      copy.splice(idx, 1);
      return {
        ...prev,
        changeDetails: { ...prev.changeDetails, articleChanges: copy }
      };
    });
  };

  const handleUpdateArticleChange = (idx: number, field: keyof ArticleChange, value: any) => {
    setFormData(prev => {
      const copy = [...prev.changeDetails.articleChanges];
      copy[idx] = { ...copy[idx], [field]: value };
      return {
        ...prev,
        changeDetails: { ...prev.changeDetails, articleChanges: copy }
      };
    });
  };

  const handleAddBranchChange = () => {
    setFormData(prev => ({
      ...prev,
      changeDetails: {
        ...prev.changeDetails,
        branchChanges: [
          ...prev.changeDetails.branchChanges,
          { type: "establish", branchName: "", location: "", newLocation: "" }
        ]
      }
    }));
  };

  const handleRemoveBranchChange = (idx: number) => {
    setFormData(prev => {
      const copy = [...prev.changeDetails.branchChanges];
      copy.splice(idx, 1);
      return {
        ...prev,
        changeDetails: { ...prev.changeDetails, branchChanges: copy }
      };
    });
  };

  const handleUpdateBranchChange = (idx: number, field: keyof BranchChange, value: any) => {
    setFormData(prev => {
      const copy = [...prev.changeDetails.branchChanges];
      copy[idx] = { ...copy[idx], [field]: value };
      return {
        ...prev,
        changeDetails: { ...prev.changeDetails, branchChanges: copy }
      };
    });
  };

  const handleAddShareholder = () => {
    setFormData(prev => ({
      ...prev,
      shareholders: [...prev.shareholders, { name: "", shares: 10, address: "" }]
    }));
  };

  const handleRemoveShareholder = (idx: number) => {
    setFormData(prev => {
      const copy = [...prev.shareholders];
      copy.splice(idx, 1);
      return { ...prev, shareholders: copy };
    });
  };

  const handleUpdateShareholder = (idx: number, field: keyof Shareholder, value: any) => {
    setFormData(prev => {
      const copy = [...prev.shareholders];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...prev, shareholders: copy };
    });
  };

  const handleAddDirector = () => {
    setFormData(prev => ({
      ...prev,
      currentDirectors: [...prev.currentDirectors, { title: "取締役", name: "" }]
    }));
  };

  const handleRemoveDirector = (idx: number) => {
    setFormData(prev => {
      const copy = [...prev.currentDirectors];
      copy.splice(idx, 1);
      return { ...prev, currentDirectors: copy };
    });
  };

  const handleUpdateDirector = (idx: number, field: keyof CurrentDirector, value: any) => {
    setFormData(prev => {
      const copy = [...prev.currentDirectors];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...prev, currentDirectors: copy };
    });
  };

  // Generate dynamic list of available documents
  const getAvailableDocuments = () => {
    const docs = [];

    if (useWrittenResolution) {
      docs.push({ id: "shareholder_consent", name: "株主総会同意書 (書面決議)" });
    } else {
      docs.push({ id: "minutes_shareholders", name: "臨時株主総会議事録" });
    }

    if (formData.hasBoard) {
      docs.push({ id: "minutes_board", name: "取締役会議事録" });
    }

    docs.push({ id: "ocr_text", name: "登記すべき事項 (OCR用別紙)" });
    docs.push({ id: "power_of_attorney", name: "委任状 (登記代理用)" });
    docs.push({ id: "shareholders_list", name: "株主リスト (添付書類)" });
    docs.push({ id: "seal_registration", name: "印鑑届書 (法務局提出)" });

    // Conditional: Resignation letters
    const resignations = formData.changeDetails.officerChanges.filter(c => c.type === "resignation" || c.type === "retirement");
    resignations.forEach(r => {
      if (r.name) {
        docs.push({ id: `resignation_${r.name}`, name: `辞任届 (${r.name})` });
      }
    });

    // Conditional: Acceptance letters
    const elections = formData.changeDetails.officerChanges.filter(c => c.type === "election" || c.type === "reappointment");
    elections.forEach(e => {
      if (e.name) {
        docs.push({ id: `acceptance_${e.name}`, name: `就任承諾書 (${e.name})` });
      }
    });

    return docs;
  };

  const getDocumentContent = (id: string): string => {
    if (id === "minutes_shareholders") return generateMinutesOfShareholders(formData);
    if (id === "shareholder_consent") return generateShareholderConsent(formData);
    if (id === "minutes_board") return generateMinutesOfBoard(formData);
    if (id === "ocr_text") return generateOcrText(formData);
    if (id === "power_of_attorney") return generatePowerOfAttorney(formData);
    if (id === "shareholders_list") return generateShareholderList(formData);
    if (id === "seal_registration") return generateSealRegistration(formData);

    if (id.startsWith("resignation_")) {
      const name = id.replace("resignation_", "");
      return generateResignationLetter(formData, name);
    }
    if (id.startsWith("acceptance_")) {
      const name = id.replace("acceptance_", "");
      return generateAcceptanceLetter(formData, name);
    }

    return "文書が選択されていません。";
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDocId(id);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  // Helper to visually highlight [ ... ] bracketed placeholder texts inside generated documents for preview
  const renderDocumentWithHighlights = (text: string) => {
    const parts = text.split(/(\[.*?\])/g);
    return parts.map((part, index) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        return (
          <span
            key={index}
            className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-semibold border border-amber-300"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const taxCalculation = calculateRegistrationTax(formData);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-lg shadow-sm">
              <FileCheck className="w-6 h-6" id="header_icon" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                商業登記書類作成アシスタント
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-normal">
                  会社法・商業登記規則準拠
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                簡単な会社情報やコピペメモから、法的に整合性の取れた株主総会議事録や登記申請用別紙（OCR）の原案を即座に生成。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto">
            <button
              onClick={() => handleLegalCheck()}
              disabled={isCheckingLegal}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {isCheckingLegal ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Scale className="w-4 h-4" />
              )}
              AIリーガル監査を実行
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Input & Settings (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Section 1: Raw Parser */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>AI情報抽出（登記簿や手書きメモの貼り付け）</span>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="text-xs text-slate-500">
                履歴事項全部証明書のテキストや、変更予定の簡易的なメモを貼り付けて「解析」を押すと、下の入力フォームへ自動展開します。
              </div>

              {/* Sample Presets Shortcuts */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-xs text-slate-400 self-center mr-1">サンプル：</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("officerOnly")}
                  className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 px-2 py-1 rounded transition border border-slate-200 cursor-pointer"
                >
                  役員変更
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("articlesOnly")}
                  className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 px-2 py-1 rounded transition border border-slate-200 cursor-pointer"
                >
                  商号・本店
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("branchOnly")}
                  className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 px-2 py-1 rounded transition border border-slate-200 cursor-pointer"
                >
                  支店設置
                </button>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="ここに登記簿データや『取締役の○○さんが辞任して、新しく○○さんが代表に就任する。日時は令和8年7月1日。』といった大まかなメモを貼り付けてください..."
                className="w-full h-40 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-sans resize-y"
              />

              <button
                type="button"
                onClick={handleParseText}
                disabled={isParsing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gemini AIが解析中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>この情報を解析してフォームに入力する</span>
                  </>
                )}
              </button>

              {parseError && (
                <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded border border-red-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Precise Form Editor */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>登記申請・会社情報の詳細編集</span>
              </span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-5 max-h-[600px]">
              
              {/* Basic Fields */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">会社基本構成</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">商号（会社名）</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => updateFormField("companyName", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:outline-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">本店所在地</label>
                    <input
                      type="text"
                      value={formData.headOffice}
                      onChange={(e) => updateFormField("headOffice", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:outline-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">代表者役職</label>
                    <input
                      type="text"
                      value={formData.representativeTitle}
                      onChange={(e) => updateFormField("representativeTitle", e.target.value)}
                      placeholder="代表取締役"
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:outline-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">代表者氏名</label>
                    <input
                      type="text"
                      value={formData.representativeName}
                      onChange={(e) => updateFormField("representativeName", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:outline-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">資本金の額（円）</label>
                    <input
                      type="number"
                      value={formData.capital}
                      onChange={(e) => updateFormField("capital", Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:outline-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">発行済株式の総数</label>
                    <input
                      type="number"
                      value={formData.totalShares}
                      onChange={(e) => updateFormField("totalShares", Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:outline-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasBoard}
                      onChange={(e) => updateFormField("hasBoard", e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>取締役会設置会社</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasAudit}
                      onChange={(e) => updateFormField("hasAudit", e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>監査役設置会社</span>
                  </label>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Resolution Dates & Place */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">決議日・効力発生日・開催場所</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">総会・決議年月日</label>
                    <input
                      type="date"
                      value={formData.decisionDate}
                      onChange={(e) => updateFormField("decisionDate", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:outline-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">登記原因（効力発生）日</label>
                    <input
                      type="date"
                      value={formData.effectiveDate}
                      onChange={(e) => updateFormField("effectiveDate", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:outline-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">総会開催場所</label>
                    <input
                      type="text"
                      value={formData.meetingPlace}
                      onChange={(e) => updateFormField("meetingPlace", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:outline-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">開催時刻</label>
                    <input
                      type="text"
                      value={formData.meetingTime}
                      onChange={(e) => updateFormField("meetingTime", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm focus:outline-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useWrittenResolution}
                      onChange={(e) => setUseWrittenResolution(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-indigo-700 font-semibold flex items-center gap-1">
                      株主総会の書面決議を利用する（同意書を生成）
                    </span>
                  </label>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Dynamic: Officer Changes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">役員の変更内容</h3>
                  <button
                    type="button"
                    onClick={handleAddOfficerChange}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 追加
                  </button>
                </div>

                {formData.changeDetails.officerChanges.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">役員の変更はありません。</p>
                ) : (
                  <div className="space-y-3">
                    {formData.changeDetails.officerChanges.map((change, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveOfficerChange(idx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-medium">氏名</label>
                            <input
                              type="text"
                              value={change.name}
                              onChange={(e) => handleUpdateOfficerChange(idx, "name", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                              placeholder="役員氏名"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-medium">変更の区分</label>
                            <select
                              value={change.type}
                              onChange={(e) => handleUpdateOfficerChange(idx, "type", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                            >
                              <option value="election">選任（新任）</option>
                              <option value="resignation">辞任</option>
                              <option value="reappointment">重任（再任）</option>
                              <option value="retirement">退任（任期満了）</option>
                              <option value="dismissal">解任</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-medium">役職名</label>
                            <select
                              value={change.title}
                              onChange={(e) => handleUpdateOfficerChange(idx, "title", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                            >
                              <option value="代表取締役">代表取締役</option>
                              <option value="取締役">取締役</option>
                              <option value="監査役">監査役</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-medium">新住所（代表等の就任時のみ）</label>
                            <input
                              type="text"
                              value={change.newAddress || ""}
                              onChange={(e) => handleUpdateOfficerChange(idx, "newAddress", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                              placeholder="東京都港区..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-slate-100" />

              {/* Dynamic: Article Changes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">定款の変更内容（商号・本店・目的等）</h3>
                  <button
                    type="button"
                    onClick={handleAddArticleChange}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 追加
                  </button>
                </div>

                {formData.changeDetails.articleChanges.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">定款の変更はありません。</p>
                ) : (
                  <div className="space-y-3">
                    {formData.changeDetails.articleChanges.map((change, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveArticleChange(idx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-medium">変更項目</label>
                          <select
                            value={change.item}
                            onChange={(e) => handleUpdateArticleChange(idx, "item", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                          >
                            <option value="name">商号（社名）</option>
                            <option value="relocation">本店移転</option>
                            <option value="purpose">事業目的</option>
                            <option value="shares">発行可能株式 / 株式数</option>
                            <option value="other">その他定款の規定</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-medium">変更前の表記</label>
                            <textarea
                              value={change.oldValue}
                              onChange={(e) => handleUpdateArticleChange(idx, "oldValue", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-xs h-12 font-sans resize-none"
                              placeholder="旧社名や旧本店など"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-medium">変更後の表記</label>
                            <textarea
                              value={change.newValue}
                              onChange={(e) => handleUpdateArticleChange(idx, "newValue", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-xs h-12 font-sans resize-none"
                              placeholder="新社名や新本店など"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-slate-100" />

              {/* Dynamic: Branch Changes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">支店の変更内容</h3>
                  <button
                    type="button"
                    onClick={handleAddBranchChange}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 追加
                  </button>
                </div>

                {formData.changeDetails.branchChanges.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">支店の変更はありません。</p>
                ) : (
                  <div className="space-y-3">
                    {formData.changeDetails.branchChanges.map((change, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveBranchChange(idx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-medium">区分</label>
                            <select
                              value={change.type}
                              onChange={(e) => handleUpdateBranchChange(idx, "type", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                            >
                              <option value="establish">支店設置</option>
                              <option value="relocate">支店移転</option>
                              <option value="abolish">支店廃止</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-medium">支店名</label>
                            <input
                              type="text"
                              value={change.branchName}
                              onChange={(e) => handleUpdateBranchChange(idx, "branchName", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                              placeholder="大阪支店"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-medium">所在地（移転時は従前地）</label>
                          <input
                            type="text"
                            value={change.location}
                            onChange={(e) => handleUpdateBranchChange(idx, "location", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                            placeholder="大阪府大阪市北区..."
                          />
                        </div>
                        {change.type === "relocate" && (
                          <div>
                            <label className="block text-[10px] text-slate-400 font-medium">新所在地（移転先）</label>
                            <input
                              type="text"
                              value={change.newLocation || ""}
                              onChange={(e) => handleUpdateBranchChange(idx, "newLocation", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                              placeholder="新住所..."
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-slate-100" />

              {/* Shareholders List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">主要な株主（株主リスト添付用）</h3>
                  <button
                    type="button"
                    onClick={handleAddShareholder}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 追加
                  </button>
                </div>

                {formData.shareholders.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">登録された株主はいません。</p>
                ) : (
                  <div className="space-y-2">
                    {formData.shareholders.map((sh, idx) => (
                      <div key={idx} className="bg-slate-50 p-2.5 rounded border border-slate-200 relative space-y-1">
                        <button
                          type="button"
                          onClick={() => handleRemoveShareholder(idx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <input
                            type="text"
                            value={sh.name}
                            onChange={(e) => handleUpdateShareholder(idx, "name", e.target.value)}
                            className="bg-white border border-slate-200 rounded p-1 text-xs"
                            placeholder="株主氏名"
                          />
                          <input
                            type="number"
                            value={sh.shares}
                            onChange={(e) => handleUpdateShareholder(idx, "shares", Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded p-1 text-xs"
                            placeholder="持株数"
                          />
                        </div>
                        <input
                          type="text"
                          value={sh.address}
                          onChange={(e) => handleUpdateShareholder(idx, "address", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                          placeholder="住所"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-slate-100" />

              {/* Current Directors List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">現任役員（議事録出席者・署名用）</h3>
                  <button
                    type="button"
                    onClick={handleAddDirector}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 追加
                  </button>
                </div>

                {formData.currentDirectors.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">登録された現任役員はいません。</p>
                ) : (
                  <div className="space-y-2">
                    {formData.currentDirectors.map((d, idx) => (
                      <div key={idx} className="bg-slate-50 p-2.5 rounded border border-slate-200 relative space-y-1">
                        <button
                          type="button"
                          onClick={() => handleRemoveDirector(idx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <input
                            type="text"
                            value={d.name}
                            onChange={(e) => handleUpdateDirector(idx, "name", e.target.value)}
                            className="bg-white border border-slate-200 rounded p-1 text-xs"
                            placeholder="役員氏名"
                          />
                          <select
                            value={d.title}
                            onChange={(e) => handleUpdateDirector(idx, "title", e.target.value)}
                            className="bg-white border border-slate-200 rounded p-1 text-xs"
                          >
                            <option value="代表取締役">代表取締役</option>
                            <option value="取締役">取締役</option>
                            <option value="監査役">監査役</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={d.address || ""}
                          onChange={(e) => handleUpdateDirector(idx, "address", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                          placeholder="住所（代表取締役は登記事項になるため入力推奨）"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Right Side: Output Documents & Reports (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col">
          
          {/* Main Action Tabs */}
          <div className="flex border-b border-slate-200 bg-white rounded-t-xl overflow-hidden shadow-xs">
            <button
              onClick={() => setActiveTab("draft")}
              className={`flex-1 py-3 text-center text-sm font-medium border-b-2 transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "draft"
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/20"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>作成された書類一覧</span>
            </button>
            <button
              onClick={() => setActiveTab("tax")}
              className={`flex-1 py-3 text-center text-sm font-medium border-b-2 transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "tax"
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/20"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>登録免許税シミュレータ</span>
            </button>
            <button
              onClick={() => setActiveTab("legal")}
              className={`flex-1 py-3 text-center text-sm font-medium border-b-2 transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "legal"
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/20"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>AIリーガルチェック</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="bg-white border-x border-b border-slate-200 rounded-b-xl flex-1 flex flex-col shadow-sm min-h-[700px]">
            
            {/* Tab 1: Documents Preview */}
            {activeTab === "draft" && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden">
                
                {/* Left Mini Rail of docs */}
                <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/50 p-2 flex flex-col gap-1 overflow-y-auto">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
                    添付・申請書類一覧
                  </div>
                  {getAvailableDocuments().map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                        selectedDocId === doc.id
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate pr-1">{doc.name}</span>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${selectedDocId === doc.id ? "text-white" : "text-slate-400"}`} />
                    </button>
                  ))}
                </div>

                {/* Main Preview */}
                <div className="md:col-span-8 p-4 flex flex-col gap-4 bg-slate-100/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        プレビュー
                      </h4>
                      <h3 className="text-sm font-bold text-slate-700">
                        {getAvailableDocuments().find(d => d.id === selectedDocId)?.name || "書類"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(getDocumentContent(selectedDocId), selectedDocId)}
                      className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      {copiedDocId === selectedDocId ? (
                        <>
                          <ClipboardCheck className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-600">コピーしました！</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>テキストをコピー</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Document container styled as a true blank sheet of legal paper */}
                  <div className="bg-white shadow-sm border border-slate-300 rounded-lg p-6 md:p-8 flex-1 overflow-auto max-h-[600px] relative">
                    <div className="absolute top-2 right-2 bg-slate-100 text-slate-500 font-mono text-[9px] px-1.5 py-0.5 rounded uppercase border border-slate-200 tracking-wider">
                      Draft Text
                    </div>
                    <pre className="font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap break-all select-all">
                      {renderDocumentWithHighlights(getDocumentContent(selectedDocId))}
                    </pre>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 flex gap-2.5 text-xs text-amber-950">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">ご利用上のヒント</p>
                      <p className="mt-0.5">
                        背景が <span className="bg-amber-100 px-1 py-0.2 rounded font-semibold border border-amber-300 text-amber-900">黄色でハイライトされた部分</span> は、実際の詳細情報に基づいて適宜書き換えるか、管轄の登記所に合わせて修正してご使用ください。
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Tab 2: Tax Estimator */}
            {activeTab === "tax" && (
              <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 text-green-700 p-2 rounded-lg">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">登録免許税（手数料）の概算額</h3>
                      <p className="text-xs text-slate-500">
                        商業登記の申請時に、法務局へ納付する登録免許税（国税）の目安額です。
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-600">合計登録免許税</span>
                      <span className="text-2xl font-black text-slate-900">
                        {formatCurrencyJa(taxCalculation.tax)}
                      </span>
                    </div>
                    
                    <div className="border-t border-slate-200 pt-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">算定の内訳：</div>
                      <pre className="text-xs font-mono text-slate-700 bg-white p-3 rounded border border-slate-200 whitespace-pre-wrap">
                        {taxCalculation.basis}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-indigo-50 text-indigo-950 p-4 rounded-lg border border-indigo-100 space-y-2 text-xs">
                    <h4 className="font-bold flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-indigo-700" />
                      <span>納付方法と準備について：</span>
                    </h4>
                    <p className="leading-relaxed">
                      1. <strong>収入印紙での納付：</strong> 登記申請書（または白紙の台紙）に、算定額と同額の「収入印紙」を貼り付けて法務局へ提出します（消印はしないでください）。<br />
                      2. <strong>オンライン納付：</strong> e-Govや登記ねっと等で電子申請する場合は、ネットバンキング等からの電子納付も可能です。<br />
                      3. <strong>注意：</strong> 本店移転が他の法務局管轄へまたがる場合、旧管轄と新管轄の両方にそれぞれ30,000円、計60,000円の登録免許税が必要になります。
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-400">
                  <span>算出基準: 登録免許税法（別表第一）に基づく現行法規</span>
                  <span>※実際の管轄・案件状況により変わる場合があります。</span>
                </div>
              </div>
            )}

            {/* Tab 3: AI Legal Audit */}
            {activeTab === "legal" && (
              <div className="p-6 flex-1 flex flex-col gap-4 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-base font-bold text-slate-800">AIリーガルチェック・コンプライアンスレポート</h3>
                      <p className="text-xs text-slate-500">
                        会社法や商業登記実務との整合性をリアルタイム監査しています。
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLegalCheck()}
                    disabled={isCheckingLegal}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingLegal ? "animate-spin" : ""}`} />
                    再監査を実行
                  </button>
                </div>

                {isCheckingLegal ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-lg border border-slate-200">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700">リーガルチェック解析中...</p>
                      <p className="text-xs text-slate-400 mt-1">会社法との適合性や登記不備がないか検証しています</p>
                    </div>
                  </div>
                ) : legalError ? (
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="font-semibold">監査に失敗しました</p>
                      <p className="text-xs mt-0.5">{legalError}</p>
                    </div>
                  </div>
                ) : legalReport ? (
                  <div className="bg-white rounded-lg border border-slate-200 p-6 overflow-y-auto max-h-[620px] shadow-2xs">
                    <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {/* Stylize lists and markdown titles within the Gemini response manually for pristine output */}
                      {legalReport.split("\n").map((line, idx) => {
                        if (line.startsWith("### ")) {
                          return <h4 key={idx} className="text-sm font-bold text-slate-800 mt-4 mb-2 border-l-4 border-indigo-500 pl-2">{line.replace("### ", "")}</h4>;
                        }
                        if (line.startsWith("## ")) {
                          return <h3 key={idx} className="text-base font-bold text-indigo-950 mt-5 mb-2 pb-1 border-b border-slate-100">{line.replace("## ", "")}</h3>;
                        }
                        if (line.startsWith("# ")) {
                          return <h2 key={idx} className="text-lg font-bold text-indigo-900 mt-6 mb-3">{line.replace("# ", "")}</h2>;
                        }
                        if (line.startsWith("- [ ]") || line.startsWith("- [x]")) {
                          return (
                            <div key={idx} className="flex items-start gap-2.5 my-2 pl-2">
                              <input type="checkbox" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" defaultChecked={line.includes("- [x]")} disabled />
                              <span className="text-slate-700">{line.replace("- [ ]", "").replace("- [x]", "").trim()}</span>
                            </div>
                          );
                        }
                        if (line.startsWith("-") || line.startsWith("*")) {
                          return <li key={idx} className="ml-5 my-1 text-slate-700 list-disc">{line.substring(1).trim()}</li>;
                        }
                        if (line.includes("警告") || line.includes("【警告】") || line.includes("⚠️")) {
                          return (
                            <div key={idx} className="bg-red-50 border-l-4 border-red-500 p-3 my-2 text-red-950 rounded-r text-xs flex gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              <div>{line}</div>
                            </div>
                          );
                        }
                        if (line.includes("要確認") || line.includes("【要確認】") || line.includes("❓")) {
                          return (
                            <div key={idx} className="bg-amber-50 border-l-4 border-amber-500 p-3 my-2 text-amber-950 rounded-r text-xs flex gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <div>{line}</div>
                            </div>
                          );
                        }
                        if (line.includes("OK") || line.includes("【OK】") || line.includes("✅")) {
                          return (
                            <div key={idx} className="bg-green-50 border-l-4 border-green-500 p-3 my-2 text-green-950 rounded-r text-xs flex gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                              <div>{line}</div>
                            </div>
                          );
                        }
                        return <p key={idx} className="my-1.5 text-slate-700">{line}</p>;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-200 rounded-lg">
                    <Scale className="w-12 h-12 text-slate-300" />
                    <p className="mt-2 text-sm font-medium">監査データがありません</p>
                    <p className="text-xs mt-1">「再監査を実行」ボタンを押してください</p>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </main>

      {/* Page Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto space-y-2">
          <p>
            © 2026 商業登記書類作成アシスタント (AI Studio 登記支援ツール)
          </p>
          <p className="text-slate-400 font-sans leading-relaxed max-w-2xl mx-auto">
            免責事項：本ツールが生成する文書は日本の商業登記規則・会社法の一般的なフォーマットに基づくテキスト原案です。個別の複雑な組織再編や特定事案については、法務局、または弁護士・司法書士などの専門家にご相談の上、慎重にご準備ください。
          </p>
        </div>
      </footer>
    </div>
  );
}
