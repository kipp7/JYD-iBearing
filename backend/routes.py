# -------------------- routes.py (完整版) --------------------

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
import os
import requests
from datetime import datetime, timedelta, timezone
import io
import base64

# SciPy and other science libs
from scipy.signal import hilbert, stft
try:
    from vmdpy import VMD
except ImportError:
    VMD = None # Allows app to run even if not installed
try:
    import pywt
except ImportError:
    pywt = None # Allows app to run even if not installed

# Your local modules
# (Please ensure these files and functions exist in your project)
from file_handler import save_uploaded_file, load_csv
from analyzer import analyze_dataframe
from preprocessing import clean_signal
try:
    from preprocessing import clean_signal_robust
except ImportError:
    clean_signal_robust = clean_signal # Fallback
from model_infer import predict
from file_structure import FileStructureManager


api = Blueprint('api', __name__)
file_structure_manager = FileStructureManager()

@api.route('/analyze', methods=['POST'])
def analyze_file():
    """
    一个统一的分析接口，合并了时域图表分析和模型推理。
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': '未找到上传的文件'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '未选择文件名'}), 400

        filepath = save_uploaded_file(file)
        filename = file.filename
        df = load_csv(filepath)

        # === Part 1: 时域分析 (生成图表数据) ===
        sampling_rate_str = request.form.get('samplingRate')
        sampling_rate = float(sampling_rate_str) if sampling_rate_str and sampling_rate_str.strip() else None
        
        window = int(request.form.get('window', 200))

        # 调用您原始的核心分析函数
        time_domain_results, err = analyze_dataframe(df, sampling_rate, window)
        if err:
            return jsonify({'error': err}), 400

        # === Part 2: 模型推理 (生成结构化诊断数据) ===
        pred_result = predict(filepath)
        label = pred_result['label'][0]
        prob_list = pred_result['prob'][0]
        
        label_mapping = {
            0: "正常", 1: "7mm内圈故障", 2: "7mm滚动体故障", 3: "7mm外圈故障", 4: "14mm内圈故障",
            5: "14mm滚动体故障", 6: "14mm外圈故障", 7: "21mm内圈故障", 8: "21mm滚动体故障", 9: "21mm外圈故障",
        }
        probabilities = [{"label": label_mapping.get(i, str(i)), "value": float(p)} for i, p in enumerate(prob_list)]
        confidence = float(prob_list[label])
        faultType = label_mapping.get(label, str(label))

        china_tz = timezone(timedelta(hours=8))
        diagnosis_time = datetime.now(china_tz).strftime('%Y-%m-%d %H:%M:%S %Z')

        model_features = {}
        for col_name in df.columns:
            try:
                arr = pd.to_numeric(df[col_name], errors='coerce').dropna()
                if not arr.empty:
                    model_features[str(col_name)] = {
                        'mean': float(arr.mean()), 'std': float(arr.std()),
                        'kurtosis': float(arr.kurtosis()), 'skewness': float(arr.skew()),
                    }
            except Exception:
                continue

        structured_data = {
            'diagnosis': {'result': faultType, 'confidence': confidence, 'probabilities': probabilities},
            'features': model_features,
            'file_info': {'filename': filename, 'columns': [str(c) for c in df.columns]},
            'diagnosis_time': diagnosis_time
        }

        return jsonify({
            "success": True, 
            "results": time_domain_results,
            "structured_data": structured_data
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"服务端异常: {str(e)}"}), 500

@api.route('/spectrum', methods=['POST'])
def analyze_spectrum():
    try:
        if 'file' not in request.files:
            return jsonify({'error': '未找到上传的文件'}), 400

        file = request.files['file']
        filepath = save_uploaded_file(file)
        df = load_csv(filepath)

        sampling_rate = float(request.form.get('samplingRate', 1024.0))

        def parse_freq(v):
            try: return float(v)
            except: return None

        base_freqs = {
            "内圈": parse_freq(request.form.get("innerFreq")),
            "外圈": parse_freq(request.form.get("outerFreq")),
            "滚动体": parse_freq(request.form.get("ballFreq"))
        }

        multiples = [1, 2, 3]
        feature_freq_list = [{"type": name, "freq": round(base * m, 2)} for name, base in base_freqs.items() if base for m in multiples]

        accel_cols = [col for col in df.columns if '加速度' in str(col) or str(col).strip() == 'value']
        if not accel_cols:
            return jsonify({'error': '未识别到加速度列'}), 400

        results = []
        for col in accel_cols:
            raw = clean_signal_robust(df[col].astype(float))
            sig = np.array(raw[:4096])
            if len(sig) < 100: continue

            N = len(sig)
            freqs_full = np.fft.rfftfreq(N, d=1 / sampling_rate)
            spec_full = np.abs(np.fft.rfft(sig))
            freqs, spectrum = freqs_full[1:], spec_full[1:]

            results.append({'type': 'fft', 'axis': f"{col} 频谱", 'data': [(float(f), float(a)) for f, a in zip(freqs, spectrum)]})

            envelope = np.abs(hilbert(sig))
            envelope = clean_signal_robust(envelope)
            if len(envelope) < 10: continue

            env_spec_full = np.abs(np.fft.rfft(envelope))
            env_spec, freqs_env = env_spec_full[1:], freqs_full[1:]
            
            step = freqs_env[1] - freqs_env[0] if len(freqs_env) > 1 else 1.0
            tolerance = max(step * 5, 5.0)

            marks = []
            for item in feature_freq_list:
                f = item["freq"]
                candidates = [(i, fr, amp) for i, (fr, amp) in enumerate(zip(freqs_env, env_spec)) if abs(fr - f) < tolerance]
                if not candidates: continue
                
                i_best, fr_best, amp_best = min(candidates, key=lambda x: abs(x[1] - f))
                if amp_best < 1e-2 or abs(fr_best - f) > tolerance * 0.6: continue
                
                base = base_freqs.get(item["type"]) or 1.0
                label = f"{col} - {item['type']} {round(f / base, 1):.0f}X ({f:.2f}Hz)"
                marks.append({"freq": fr_best, "amp": amp_best, "name": label})

            results.append({'type': 'envelope', 'axis': f"{col} 包络谱", 'data': [(float(f), float(a)) for f, a in zip(freqs_env, env_spec)], 'featureMarks': marks})

        return jsonify({'success': True, 'results': results})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@api.route('/stft', methods=['POST'])
def analyze_stft():
    try:
        if 'file' not in request.files: return jsonify({'error': '未上传文件'}), 400
        file = request.files['file']
        filepath = save_uploaded_file(file)
        df = load_csv(filepath)

        sampling_rate = float(request.form.get('samplingRate', 1024.0))
        accel_cols = [col for col in df.columns if '加速度' in str(col) or str(col).strip() == 'value']
        if not accel_cols: return jsonify({'error': '未识别到加速度列'}), 400

        results = []
        for col in accel_cols:
            signal = np.array(clean_signal(df[col].astype(float))[:4096])
            if len(signal) < 256: continue

            f, t, Zxx = stft(signal, fs=sampling_rate, nperseg=1024, noverlap=768)
            Z = np.abs(Zxx)
            if np.max(Z) > 0: Z = Z / np.max(Z)

            stft_data = [{'time': float(ti), 'amplitudes': Z[:, i].tolist()} for i, ti in enumerate(t)]
            results.append({'type': 'stft', 'axis': f"{col} STFT 时频图", 'frequencies': f.tolist(), 'data': stft_data})

        return jsonify({'success': True, 'results': results})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@api.route('/vmd', methods=['POST'])
def analyze_vmd():
    if VMD is None: return jsonify({'error': 'VMD 库未安装'}), 500
    try:
        file = request.files['file']
        filepath = save_uploaded_file(file)
        df = load_csv(filepath)
        sampling_rate = float(request.form.get('samplingRate', 1024))
        
        col = [c for c in df.columns if '加速度' in str(c) or str(c).strip() == 'value'][0]
        raw = clean_signal(df[col].astype(float)).values
        signal = raw[:int(sampling_rate * 0.8)]
        if np.max(np.abs(signal)) > 0: signal = (signal - np.mean(signal)) / np.max(np.abs(signal))

        u, _, _ = VMD(signal, alpha=2000, tau=0., K=5, DC=0, init=1, tol=1e-6)
        results = []
        for i in range(u.shape[0]):
            results.append({'type': 'vmd_time', 'axis': f'{col} - VMD-{i+1} 时域分量', 'data': [[j / sampling_rate, float(val)] for j, val in enumerate(u[i, :2048])]})
        
        return jsonify({'success': True, 'results': results})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@api.route('/cwt', methods=['POST'])
def analyze_cwt():
    if pywt is None: return jsonify({'error': 'PyWavelets (pywt) 库未安装'}), 500
    try:
        file = request.files['file']
        filepath = save_uploaded_file(file)
        df = load_csv(filepath)
        sampling_rate = float(request.form.get('samplingRate', 1024))

        col = [c for c in df.columns if '加速度' in str(c) or str(c).strip() == 'value'][0]
        signal = clean_signal(df[col].astype(float)).values[:2048]
        if len(signal) < 100: return jsonify({'error': '数据长度不足'}), 400

        scales = np.arange(1, 128)
        coef, freqs = pywt.cwt(signal, scales, 'morl', sampling_period=1/sampling_rate)
        
        import matplotlib
        matplotlib.use('Agg') # Use non-interactive backend
        import matplotlib.pyplot as plt

        plt.figure(figsize=(10, 5))
        plt.imshow(np.abs(coef), extent=[0, len(signal)/sampling_rate, freqs.min(), freqs.max()], cmap='jet', aspect='auto', origin='lower')
        plt.xlabel("Time (s)"), plt.ylabel("Frequency (Hz)"), plt.title("Continuous Wavelet Transform"), plt.colorbar(label="Magnitude")
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150)
        plt.close()
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')

        return jsonify({'success': True, 'image': img_base64})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@api.route('/predict', methods=['POST'])
def predict_api():
    if 'file' not in request.files: return jsonify({'error': '未找到上传的文件'}), 400
    file = request.files['file']
    filepath = save_uploaded_file(file)
    try:
        result = predict(filepath)
        return jsonify({'success': True, 'result': result})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@api.route('/analyze-structure', methods=['POST'])
def analyze_file_structure():
    if 'file' not in request.files: return jsonify({'error': '未找到上传的文件'}), 400
    file = request.files['file']
    filepath = save_uploaded_file(file)
    try:
        structure = file_structure_manager.analyze_file_structure(filepath)
        return jsonify({"success": True, "structure": structure})
    except Exception as e:
        return jsonify({"error": f"服务端异常: {str(e)}"}), 500

@api.route('/save-structure-template', methods=['POST'])
def save_structure_template():
    try:
        data = request.get_json()
        if not data or 'structure' not in data or 'template_name' not in data:
            return jsonify({'error': '缺少必要参数'}), 400
        template_path = file_structure_manager.save_structure_template(data['structure'], data['template_name'])
        return jsonify({"success": True, "template_path": template_path})
    except Exception as e:
        return jsonify({"error": f"服务端异常: {str(e)}"}), 500

@api.route('/load-structure-template', methods=['GET'])
def load_structure_template():
    try:
        template_name = request.args.get('template_name')
        if not template_name: return jsonify({'error': '缺少模板名称'}), 400
        template = file_structure_manager.load_structure_template(template_name)
        if not template: return jsonify({'error': '模板不存在'}), 404
        return jsonify({"success": True, "template": template})
    except Exception as e:
        return jsonify({"error": f"服务端异常: {str(e)}"}), 500

@api.route('/validate-structure', methods=['POST'])
def validate_structure():
    try:
        if 'file' not in request.files: return jsonify({'error': '未找到上传的文件'}), 400
        template_name = request.form.get('template_name')
        if not template_name: return jsonify({'error': '缺少模板名称'}), 400
        template = file_structure_manager.load_structure_template(template_name)
        if not template: return jsonify({'error': '模板不存在'}), 404
        
        file = request.files['file']
        filepath = save_uploaded_file(file)
        is_valid, missing_columns = file_structure_manager.validate_file_structure(filepath, template)
        return jsonify({"success": True, "is_valid": is_valid, "missing_columns": missing_columns})
    except Exception as e:
        return jsonify({"error": f"服务端异常: {str(e)}"}), 500

@api.route('/ai-report', methods=['POST'])
def ai_report():
    try:
        structured_data = request.get_json()
        api_key = os.getenv('DEEPSEEK_API_KEY', 'sk-fd4e32d3c8a04f6d8674f9cbad867320') # Fallback key for convenience
        if not api_key: raise RuntimeError('DEEPSEEK_API_KEY 未配置')
        
        system_prompt = """你是工业设备故障诊断领域的 AI 专家。
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
1. 【非常重要】禁止使用任何Markdown格式化标记，例如“##”、“-”、“*”、“**”等。所有内容都必须是纯文本。
2. 所有内容以"工程报告风格"编写，禁止使用对话语气。
3. 第三部分"问题严重性评估"必须采用如下卡片式格式，不允许使用表格线或竖线（|）：

【立即停机】
等级：紧急
原因：持续运行将导致轴承完全失效

【维修紧迫性】
等级：紧急
原因：振动能量持续升高，可能造成轴系损伤

【设备安全性】
等级：危险
原因：多参数严重超标，可能引发连锁故障

【生产影响】
等级：严重
原因：剩余寿命预计 <24 小时，基于峭度指标恶化速率预测

4. 所有标题和项目必须严格输出，不可省略，不可变换顺序。
5. 最终内容必须适合直接用于 PDF 报告生成或在网页中美观展示。
"""
        diagnosis = structured_data.get('diagnosis', {})
        features = structured_data.get('features', {})
        file_info = structured_data.get('file_info', {})
        diagnosis_time = structured_data.get('diagnosis_time', '')
        user_prompt = f"""以下是待诊断的设备故障信息：\n- 诊断时间: {diagnosis_time}\n- 文件名: {file_info.get('filename', '未知')}\n- 数据列: {', '.join(file_info.get('columns', []))}\n- 诊断结论: {diagnosis.get('result', '未知')}\n- 置信度: {diagnosis.get('confidence', '未知')}\n- 各类别概率分布: {', '.join([f"{p['label']} {p['value']:.2f}" for p in diagnosis.get('probabilities', [])])}\n- 统计特征: {features if features else '无'}\n\n请根据以上信息，结合你的领域知识，生成标准化诊断报告。【注意】报告最后的“报告生成时间”请严格填写为：{diagnosis_time}，不要用你自己的时间。"""

        payload = {
            "model": "deepseek-chat",
            "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            "max_tokens": 1800, "temperature": 0.5
        }
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
        response = requests.post('https://api.deepseek.com/chat/completions', json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        
        ai_report_text = response.json().get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        return jsonify({"success": True, "ai_report": ai_report_text})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)})
