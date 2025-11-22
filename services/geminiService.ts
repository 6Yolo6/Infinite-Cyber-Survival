
import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// Deep Analysis using Thinking Model
export const analyzeBattle = async (
  timeAlive: number,
  kills: number,
  score: number,
  deathReason: string,
  playerLevel: number,
  weaponName: string
): Promise<string> => {
  const client = getClient();
  if (!client) {
    return "分析模块离线: 未检测到神经链接密钥 (API Key Missing)。";
  }

  try {
    const prompt = `
      你是一位在赛博朋克世界中，极其硬核、冷酷但富有洞察力的“战术AI教官”。
      一名新兵在虚拟生存模拟中阵亡了。
      
      战斗数据:
      - 武器系统: ${weaponName}
      - 最终等级: ${playerLevel}
      - 存活时间: ${timeAlive.toFixed(1)} 秒
      - 击杀敌军: ${kills}
      - 战斗评分: ${score}
      - 阵亡原因: ${deathReason}
      
      请进行深度的战术复盘。
      1. 首先，犀利地点评他的表现。如果表现很差（<60秒），尽情嘲讽；如果表现优秀（>300秒），给予强者间的认可。
      2. 分析他的武器选择与生存时间的匹配度。
      3. 给出一条极具操作性、针对性的战术建议，帮助他下次活得更久。
      4. 语气要像科幻电影里的高级AI，字数控制在 150 字以内。
    `;

    const response = await client.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 } // Max thinking budget
      }
    });

    return response.text || "数据传输中断，分析报告丢失。";
  } catch (error) {
    console.error("Gemini Analysis Failed", error);
    return "指挥部连接失败，无法获取战术分析。";
  }
};

// Image Generation for Avatars (Flash Image Version)
export const generateAvatar = async (prompt: string): Promise<string | null> => {
    const client = getClient();
    if (!client) return null;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash-image', // Kept as requested
            contents: {
                parts: [{ text: `A pixel art or vector style cyberpunk character face icon, futuristic, glowing details, high contrast. Context: ${prompt}` }]
            },
            config: {
                imageConfig: {
                    aspectRatio: '1:1'
                }
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (error) {
        console.error("Avatar Generation Failed", error);
        throw error;
    }
}
