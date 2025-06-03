import { NextResponse } from 'next/server';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

interface DiagnosisDataFromFrontend {
  id: string;
  device_id: string;
  timestamp: string;
  risk_level: 'normal' | 'waning' | 'danger' | string | null;
  fault_location: string | null;
  reasons: string | null;
  confidence?: number; // 可选的AI诊断置信度
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const logPrefix = `[${new Date().toISOString()}] /nextjs-api/diagnose:`;

  console.log(`${logPrefix} Received request.`);

  if (!DEEPSEEK_API_KEY) {
    console.error(`${logPrefix} DeepSeek API key is not configured.`);
    return new Response(
      JSON.stringify({ error: 'AI diagnosis service is not configured: Missing API Key.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const diagnosisData = await request.json() as DiagnosisDataFromFrontend;
    console.log(`${logPrefix} Parsed request body. Duration: ${Date.now() - startTime}ms`);

    const systemPrompt = `你是工业设备故障诊断领域的 AI 专家。
请根据以下提供的信息生成一份结构化的诊断报告，格式必须固定为以下七个部分标题，每一部分按顺序输出：

---
一、数据摘要  
二、可能故障原因分析  
三、问题严重性评估  
四、建议排查步骤  
五、推荐解决方案  
六、预防性维护建议  
七、备注

【格式要求】：
1. 所有内容以“工程报告风格”编写，禁止使用对话语气。
2. 第三部分“问题严重性评估”必须采用如下卡片式格式，不允许使用表格线或竖线（|）：
  
【立即停机】  
- 等级：紧急  
- 原因：持续运行将导致轴承完全失效

【维修紧迫性】  
- 等级：紧急  
- 原因：振动能量持续升高，可能造成轴系损伤

【设备安全性】  
- 等级：危险  
- 原因：多参数严重超标，可能引发连锁故障

【生产影响】  
- 等级：严重  
- 原因：剩余寿命预计 <24 小时，基于峭度指标恶化速率预测

3. 所有标题和项目必须严格输出，不可省略，不可变换顺序。
4. 最终内容必须适合直接用于 PDF 报告生成或在网页中美观展示。
`;


    const userInput = `以下是待诊断的设备故障信息：
- 设备编号: ${diagnosisData.device_id}
- 故障时间: ${diagnosisData.timestamp}
- 风险等级: ${diagnosisData.risk_level || '未指定'}
- 故障位置: ${diagnosisData.fault_location || '未指定'}
- 现象描述: ${diagnosisData.reasons || '无额外描述'}
- 模型诊断置信度（如有）: ${diagnosisData.confidence ?? '未知'}

请根据以上信息，结合你的领域知识，生成标准化诊断报告。`;

    const payload = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ],
      max_tokens: 1800,
      temperature: 0.5,
    };

    console.log(`${logPrefix} Calling DeepSeek API...`);
    const deepSeekApiStartTime = Date.now();

    const apiResponse = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`${logPrefix} Received response. Status: ${apiResponse.status}. Time: ${Date.now() - deepSeekApiStartTime}ms`);

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error(`${logPrefix} DeepSeek API Error ${apiResponse.status}: ${errorBody}`);
      return new Response(
        JSON.stringify({ error: `DeepSeek API 返回错误（状态 ${apiResponse.status}）：${errorBody}` }),
        { status: apiResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const responseText = await apiResponse.text();
    console.log(`${logPrefix} Response text received. Length: ${responseText.length}`);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error(`${logPrefix} JSON parse error: ${parseError.message}. Response: ${responseText.slice(0, 500)}`);
      return new Response(
        JSON.stringify({ error: 'AI diagnosis service returned invalid JSON.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const diagnosisText = result.choices?.[0]?.message?.content?.trim();
    if (!diagnosisText) {
      console.error(`${logPrefix} No content in response.`);
      return new Response(
        JSON.stringify({ error: 'AI diagnosis service returned an empty or invalid response structure.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`${logPrefix} Diagnosis complete. Returning result.`);
    return new Response(
      JSON.stringify({ diagnosis: diagnosisText }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`${logPrefix} Unhandled error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
