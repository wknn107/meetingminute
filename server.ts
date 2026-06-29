import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API Endpoint: Parse unstructured raw text into structured corporate and change data
app.post("/api/gemini/parse", async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "rawText parameter is required." });
    }

    const systemInstruction = `あなたは日本国内の商業登記・会社法に精通した司法書士・法務エキスパートです。
ユーザーから提供される登記簿のコピペ、定款のメモ、引継ぎ資料などの雑多で不完全なテキストデータから、
会社情報（商号、本店、役員構成、機関構成など）および今回の変更事項（役員変更、定款変更、支店変更など）を特定し、
正確なJSONデータとして抽出してください。
テキストに存在しない項目は、推測できる場合は補完し、全く不明な場合は空文字またはデフォルト値にしてください。
日本の元号（令和、平成など）や和暦は、可能な限り西暦に変換して出力してください。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `以下のテキストを解析し、構造化された会社登記情報および変更内容を抽出してください。

【対象テキスト】
${rawText}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyName: { type: Type.STRING, description: "商号（株式会社○○など）" },
            headOffice: { type: Type.STRING, description: "本店所在地（フル住所）" },
            representativeTitle: { type: Type.STRING, description: "代表者の役職名（代表取締役など）" },
            representativeName: { type: Type.STRING, description: "代表者の氏名" },
            hasBoard: { type: Type.BOOLEAN, description: "取締役会設置会社であるかどうか" },
            hasAudit: { type: Type.BOOLEAN, description: "監査役設置会社であるかどうか" },
            capital: { type: Type.STRING, description: "資本金の額（例: 10000000）" },
            totalShares: { type: Type.STRING, description: "発行済株式の総数" },
            shareholders: {
              type: Type.ARRAY,
              description: "主要な株主のリスト（判明している場合）",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  shares: { type: Type.INTEGER },
                  address: { type: Type.STRING }
                }
              }
            },
            currentDirectors: {
              type: Type.ARRAY,
              description: "現在の役員（取締役、監査役等）のリスト",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "役職（取締役、代表取締役、監査役など）" },
                  name: { type: Type.STRING, description: "氏名" },
                  address: { type: Type.STRING, description: "住所（代表取締役は必須、一般取締役は省略可）" }
                }
              }
            },
            changeType: {
              type: Type.STRING,
              description: "変更登記の主な種類（役員変更: 'officer', 定款変更: 'articles', 支店変更: 'branch', 複数/その他: 'mixed'）"
            },
            decisionDate: { type: Type.STRING, description: "株主総会または取締役会の開催（決議）年月日（YYYY-MM-DD）" },
            effectiveDate: { type: Type.STRING, description: "登記原因（変更効力発生）年月日（YYYY-MM-DD）" },
            changeDetails: {
              type: Type.OBJECT,
              description: "変更の具体的な詳細",
              properties: {
                officerChanges: {
                  type: Type.ARRAY,
                  description: "役員の変更情報リスト",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: "対象役員名" },
                      type: { type: Type.STRING, description: "変更区分（選任: 'election', 辞任: 'resignation', 重任: 'reappointment', 退任: 'retirement', 解任: 'dismissal'）" },
                      title: { type: Type.STRING, description: "役職（代表取締役、取締役、監査役など）" },
                      newAddress: { type: Type.STRING, description: "住所（新任代表取締役などの場合は必須）" }
                    }
                  }
                },
                articleChanges: {
                  type: Type.ARRAY,
                  description: "定款の変更情報リスト",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      item: { type: Type.STRING, description: "変更対象（商号: 'name', 目的: 'purpose', 本店移転: 'relocation', 株式: 'shares', その他: 'other'）" },
                      oldValue: { type: Type.STRING, description: "変更前の内容" },
                      newValue: { type: Type.STRING, description: "変更後の具体的な内容" }
                    }
                  }
                },
                branchChanges: {
                  type: Type.ARRAY,
                  description: "支店の変更情報リスト",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, description: "変更区分（設置: 'establish', 移転: 'relocate', 廃止: 'abolish'）" },
                      branchName: { type: Type.STRING, description: "支店名（例: 大阪支店）" },
                      location: { type: Type.STRING, description: "支店所在地（住所）" },
                      newLocation: { type: Type.STRING, description: "移転先所在地（移転時のみ）" }
                    }
                  }
                }
              }
            }
          },
          required: ["companyName", "headOffice", "representativeTitle", "representativeName"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Parse Error:", error);
    res.status(500).json({ error: error.message || "Failed to parse text with Gemini." });
  }
});

// API Endpoint: Legal checklist and analysis based on current configuration
app.post("/api/gemini/legal-check", async (req, res) => {
  try {
    const { formData } = req.body;
    if (!formData) {
      return res.status(400).json({ error: "formData parameter is required." });
    }

    const systemInstruction = `あなたは日本国内の会社法および商業登記実務に精通した、極めて厳格かつ優秀なリーガルチェックAIアシスタントです。
入力された会社登記申請データ（役員構成、変更の事実など）を検証し、会社法および登記手続き上の観点から、
矛盾点、法的なエラー、必要書類の落とし穴、注意すべき実務上のプロセスなどをチェックリスト形式で整理して出力してください。

【検証すべき重要ルール（例）】
- 取締役会設置会社には、取締役3名以上、監査役1名以上が必要である（特例有限会社を除く）。
- 取締役会非設置会社における代表取締役の選定手続き（定款の規定、株主総会決議、取締役の互選などに応じた印鑑証明書の要件の違いなど）。
- 役員変更（選任・辞任等）における本人確認証明書（住民票の写し等）や実印＋印鑑証明書の提出が必要になる要件。
- 定款変更において、株主総会の特別決議（議決権の過半数を有する株主が出席し、3分の2以上の多数で決議）が必要となること。
- 本店移転において、管轄内移転（登録免許税3万円）と管轄外移転（登録免許税6万円、新旧管轄に各3万円）の違い、および決議機関（定款に所在市区町村の記載がある場合の、株主総会＋取締役会等）。
- 役員の任期（原則2年、非公開会社は最長10年まで伸長可能）についての注意喚起。

出力は、ユーザーに分かりやすいようにMarkdown形式で行ってください。
「チェックステータス（OK/要確認/警告）」、「論点・解説」、「具体的な解決策または確認事項」を明示すること。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `以下の登記申請データについて、会社法・商業登記実務上の法的チェックを実施し、レポートを作成してください。

【会社データ】
${JSON.stringify(formData, null, 2)}`,
      config: { systemInstruction }
    });

    res.json({ report: response.text });
  } catch (error: any) {
    console.error("Legal Check Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate legal check report." });
  }
});

// Serve assets and handle Vite in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
