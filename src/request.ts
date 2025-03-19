
import axios from "axios";

const MODEL_CONFIG = {
  doubao: {
    url: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    model: "ZXAtMjAyNTAyMTUwMTAyMTAtYmpyd3A=",
    token: "YTlkN2IyMTctNGZjYS00ZTg1LWEwMmEtMmExMGJjM2IzZjU5",
  },
};

const decode = (encodedString: string) => {
  return atob(encodedString);
};
export async function handleDoubao(names: string) {
  const content = `请根据以下每个名称进行语义匹配，推荐8个相关的Emoji，只需返回JSON二维数组，确保每个根据每个名称都有匹配的Emoji：\n${names}\n要求：\n1. 严格使用["🚀","🌲"]格式\n2. 选择与名称语义最匹配的Emoji\n3. 不要添加任何解释\n4. 忽略名称中已有的Emoji`;
  const requestBody = {
    model: decode(MODEL_CONFIG.doubao.model),
    messages: [{ role: "user", content }],
  };

  const res = await axios.post(MODEL_CONFIG.doubao.url, requestBody, {
    headers: {
      Authorization: `Bearer ${decode(MODEL_CONFIG.doubao.token)}`,
      "Content-Type": "application/json",
    },
  });

  return res.data;
}

export const formatJsonString = (jsonString: string) => {
  // 去除 Markdown 代码块标记
  const cleanedString = jsonString.replace(/```json/g, "").replace(/```/g, "");

  const formattedStr = cleanedString
    .replace(/\s/g, "")
    .replace(/(\w+):/g, '"$1":');

  try {
    // 解析修正后的字符串为对象
    const obj = JSON.parse(formattedStr);
    // console.log(obj);
    return obj;
  } catch (error) {
    console.error("解析 JSON 时出错:", error);
  }
};