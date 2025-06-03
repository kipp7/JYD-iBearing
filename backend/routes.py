from flask import Blueprint, request, jsonify
from file_handler import save_uploaded_file, load_csv
from analyzer import analyze_dataframe
from preprocessing import clean_signal
import numpy as np
from scipy.signal import hilbert
from analyzer import compute_rms

api = Blueprint('api', __name__)

@api.route('/analyze', methods=['POST'])
def analyze_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': '未找到上传的文件'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '未选择文件名'}), 400

        filepath = save_uploaded_file(file)
        df = load_csv(filepath)

        # 获取采样率参数
        sampling_rate = request.form.get('samplingRate')
        if sampling_rate:
            try:
                sampling_rate = float(sampling_rate)
            except:
                sampling_rate = None

        # 获取滑动窗口参数
        window = request.form.get('window')
        try:
            window = int(window)
        except:
            window = 200  # 默认滑动窗口为200

        results, err = analyze_dataframe(df, sampling_rate, window)
        if err:
            return jsonify({'error': err}), 400

        return jsonify({"success": True, "results": results})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"服务端异常: {str(e)}"}), 500


@api.route('/spectrum', methods=['POST'])
def analyze_spectrum():
    from preprocessing import clean_signal_robust as clean_signal
    import numpy as np
    from scipy.signal import hilbert

    try:
        if 'file' not in request.files:
            return jsonify({'error': '未找到上传的文件'}), 400

        file = request.files['file']
        filepath = save_uploaded_file(file)
        df = load_csv(filepath)

        # 参数处理
        try:
            sampling_rate = float(request.form.get('samplingRate', ''))
        except:
            sampling_rate = 1024.0
        if not sampling_rate or sampling_rate <= 0:
            sampling_rate = 1024.0

        def parse_freq(v):
            try:
                return float(v)
            except:
                return None

        base_freqs = {
            "内圈": parse_freq(request.form.get("innerFreq")),
            "外圈": parse_freq(request.form.get("outerFreq")),
            "滚动体": parse_freq(request.form.get("ballFreq"))
        }

        multiples = [1, 2, 3]
        feature_freq_list = []
        for name, base in base_freqs.items():
            if base:
                for m in multiples:
                    feature_freq_list.append({
                        "type": name,
                        "freq": round(base * m, 2)
                    })

        accel_cols = [col for col in df.columns if '加速度' in col or col.strip() == 'value']
        if not accel_cols:
            return jsonify({'error': '未识别到加速度列'}), 400

        results = []
        for col in accel_cols:
            raw = clean_signal(df[col].astype(float))
            sig = np.array(raw[:4096])
            if len(sig) < 100:
                continue

            N = len(sig)
            freqs_full = np.fft.rfftfreq(N, d=1 / sampling_rate)
            spec_full = np.abs(np.fft.rfft(sig))

            freqs = freqs_full[1:]
            spectrum = spec_full[1:]

            results.append({
                'type': 'fft',
                'axis': f"{col} 频谱",
                'data': [(float(f), float(a)) for f, a in zip(freqs, spectrum)]
            })

            # 包络谱
            envelope = np.abs(hilbert(sig))
            envelope = np.clip(envelope, 0, np.percentile(envelope, 99.5))
            envelope = clean_signal(envelope)
            if len(envelope) < 10:
                continue

            env_spec_full = np.abs(np.fft.rfft(envelope))
            env_spec = env_spec_full[1:]
            freqs_env = freqs_full[1:]

            step = freqs_env[1] - freqs_env[0] if len(freqs_env) > 1 else 1.0
            tolerance = max(step * 5, 5.0)

            # 特征频率标记
            marks = []
            for item in feature_freq_list:
                f = item["freq"]
                fault_type = item["type"]
                base = base_freqs.get(fault_type) or 1.0
                multiple = round(f / base, 1)
                label = f"{col} - {fault_type} {multiple:.0f}X（{f:.2f}Hz）"

                # 匹配容差范围内“距离最近”的点，而不是幅值最大
                candidates = [
                    (i, fr, amp) for i, (fr, amp) in enumerate(zip(freqs_env, env_spec))
                    if abs(fr - f) < tolerance
                ]

                if not candidates:
                    print(f"[未命中] {label} 未匹配")
                    continue

                # 找最近的点
                i_best, fr_best, amp_best = min(candidates, key=lambda x: abs(x[1] - f))

                # 可选：加上幅值下限，避免噪声误标
                if amp_best < 1e-2:
                    print(f"[忽略] {label} 幅值过小：{amp_best:.4f}")
                    continue

                # 可选：加上频率偏移上限，避免标到偏离太大的点
                if abs(fr_best - f) > tolerance * 0.6:
                    print(f"[忽略] {label} 偏移过大：目标={f:.2f}Hz，实际={fr_best:.2f}Hz")
                    continue

                print(f"[匹配] {label} → {fr_best:.2f}Hz，幅值={amp_best:.4f}")
                marks.append({
                    "freq": fr_best,
                    "amp": amp_best,
                    "name": label
                })
                

            results.append({
                'type': 'envelope',
                'axis': f"{col} 包络谱",
                'data': [(float(f), float(a)) for f, a in zip(freqs_env, env_spec)],
                'featureMarks': marks
            })

        return jsonify({'success': True, 'results': results})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500



@api.route('/stft', methods=['POST'])
def analyze_stft():
    from scipy.signal import stft
    import numpy as np

    try:
        if 'file' not in request.files:
            return jsonify({'error': '未上传文件'}), 400

        file = request.files['file']
        filepath = save_uploaded_file(file)
        df = load_csv(filepath)

        sampling_rate = float(request.form.get('samplingRate', 1024.0))

        accel_cols = [col for col in df.columns if '加速度' in col or col.strip() == 'value']
        if not accel_cols:
            return jsonify({'error': '未识别到加速度列'}), 400

        results = []
        for col in accel_cols:
            raw = clean_signal(df[col].astype(float))
            signal = np.array(raw[:4096])

            if len(signal) < 256:
                continue

            f, t, Zxx = stft(signal, fs=sampling_rate, nperseg=1024, noverlap=768)
            Z = np.abs(Zxx)
            Z = Z / np.max(Z)  # 归一化处理


            # 转为序列数据传给前端
            stft_data = []
            for i in range(len(t)):
                stft_data.append({
                    'time': float(t[i]),
                    'amplitudes': [float(a) for a in Z[:, i]],
                })

            results.append({
                'type': 'stft',
                'axis': f"{col} STFT 时频图",
                'frequencies': [float(freq) for freq in f],
                'data': stft_data  # 每个时刻的频率谱
            })

        return jsonify({'success': True, 'results': results})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@api.route('/vmd', methods=['POST'])
def analyze_vmd():
    from vmdpy import VMD
    from scipy.signal import hilbert
    import numpy as np

    try:
        file = request.files['file']
        filepath = save_uploaded_file(file)
        df = load_csv(filepath)
        sampling_rate = float(request.form.get('samplingRate', 1024))

        def parse_freq(v):
            try:
                return float(v)
            except:
                return None

        base_freqs = {
            "内圈": parse_freq(request.form.get("innerFreq")),
            "外圈": parse_freq(request.form.get("outerFreq")),
            "滚动体": parse_freq(request.form.get("ballFreq"))
        }

        multiples = [1, 2, 3]
        feature_freq_list = []
        for name, base in base_freqs.items():
            if base:
                for m in multiples:
                    feature_freq_list.append({
                        "type": name,
                        "freq": round(base * m, 2)
                    })

        tolerance = 5.0

        col = [c for c in df.columns if '加速度' in c or c.strip() == 'value'][0]
        raw = clean_signal(df[col].astype(float)).values
        segment_length = int(sampling_rate * 0.8)  # 只显示前 0.8 秒
        signal = raw[:segment_length]
        signal = signal - np.mean(signal)          # 去均值
        signal = signal / (np.max(np.abs(signal)) + 1e-8)  # 归一化

        alpha = 2000
        tau = 0.
        K = 5
        DC = 0
        init = 1
        tol = 1e-6

        u, _, _ = VMD(signal, alpha, tau, K, DC, init, tol)
        results = []

        for i in range(K):
            #  添加时域波形结果（用于“时域分析”）
            #  后端 VMD 时域分量部分优化
            results.append({
                'type': 'vmd_time',
                'axis': f'{col} - VMD-{i+1} 时域分量',
                'data': [[j / sampling_rate, float(val)] for j, val in enumerate(u[i, :2048])]
            })


            #  原有包络谱分析（用于“频谱分析”）
            envelope = np.abs(hilbert(u[i, :]))
            spec = np.abs(np.fft.rfft(envelope))
            freq = np.fft.rfftfreq(len(envelope), d=1/sampling_rate)

            spec = spec[1:]
            freq = freq[1:]

            marks = []
            for item in feature_freq_list:
                f = item["freq"]
                fault_type = item["type"]
                base = base_freqs.get(fault_type) or 1.0
                multiple = round(f / base, 1)
                label = f"VMD-{i+1} - {fault_type} {multiple:.0f}X（{f:.2f}Hz）"

                candidates = [
                    (j, fr, amp) for j, (fr, amp) in enumerate(zip(freq, spec))
                    if abs(fr - f) < tolerance
                ]
                if not candidates:
                    continue

                j_best, fr_best, amp_best = min(candidates, key=lambda x: abs(x[1] - f))
                if amp_best < 1e-2 or abs(fr_best - f) > tolerance * 0.6:
                    continue

                marks.append({
                    "freq": fr_best,
                    "amp": amp_best,
                    "name": label
                })

            results.append({
                'type': 'vmd_envelope',
                'axis': f'VMD-{i+1} 包络谱',
                'data': [(float(f), float(s)) for f, s in zip(freq, spec)],
                'featureMarks': marks
            })

        return jsonify({'success': True, 'results': results})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@api.route('/cwt', methods=['POST'])
def analyze_cwt():
    import pywt
    import numpy as np
    import matplotlib.pyplot as plt
    import io
    import base64

    if 'file' not in request.files:
        return jsonify({'error': '未找到文件'}), 400

    file = request.files['file']
    filepath = save_uploaded_file(file)
    df = load_csv(filepath)
    sampling_rate = float(request.form.get('samplingRate', 1024))

    col = [c for c in df.columns if '加速度' in c or c.strip() == 'value'][0]
    signal = clean_signal(df[col].astype(float)).values[:2048]

    if len(signal) < 100:
        return jsonify({'error': '数据长度不足'}), 400

    # 连续小波变换
    scales = np.arange(1, 128)
    coef, freqs = pywt.cwt(signal, scales, 'morl', sampling_period=1/sampling_rate)

    # 可选：转图像发送前端
    plt.figure(figsize=(10, 5))
    plt.imshow(np.abs(coef), extent=[0, len(signal)/sampling_rate, freqs.min(), freqs.max()],
               cmap='jet', aspect='auto', origin='lower')
    plt.xlabel("Time (s)")
    plt.ylabel("Frequency (Hz)")
    plt.title("Continuous Wavelet Transform")
    plt.colorbar(label="Magnitude")

    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close()

    return jsonify({'success': True, 'image': img_base64})
