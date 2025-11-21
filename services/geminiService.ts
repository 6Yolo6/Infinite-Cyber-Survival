
import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzeBattle = async (
  timeAlive: number,
  kills: number,
  score: number,
  deathReason: string
): Promise<string> => {
  const client = getClient();
  if (!client) {
    return "分析模块离线: 未检测到神经链接密钥 (API Key Missing)。";
  }

  try {
    const prompt = `
      你是一位在赛博朋克世界中，性格毒舌、冷酷但专业的“新兵训练教官”。
      刚刚一名新兵在虚拟生存模拟中阵亡了。
      
      战斗数据:
      - 存活时间: ${timeAlive.toFixed(1)} 秒
      - 击杀敌军: ${kills}
      - 战斗评分: ${score}
      - 阵亡原因: ${deathReason}
      
      请用**中文**对该新兵的表现进行评价。
      
      要求：
      1. 如果存活时间少于 60 秒，尽情嘲讽他的无能。
      2. 如果存活时间超过 180 秒，勉强认可他的潜力，但要指出不足。
      3. 最后必须给出一个具体的、有用的俯视射击游戏(Top-down Shooter)战术建议（例如：放风筝、优先处理高速敌人、不要停下脚步等）。
      4. 保持字数在 80 字以内。风格要科幻、硬核。
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "数据传输中断，分析报告丢失。";
  } catch (error) {
    console.error("Gemini Analysis Failed", error);
    return "指挥部连接失败，无法获取战术分析。";
  }
};
