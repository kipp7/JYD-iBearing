from preprocessing import (
    clean_signal,
    compute_rms,
    compute_stats,
    compute_moving_mean,
    compute_moving_std,
)

def analyze_dataframe(df, sampling_rate=None, window=200):
    expected_cols = [col for col in df.columns if '加速度' in col or col.strip() == 'value']

    if not expected_cols:
        return None, '未识别到可用的加速度列'

    results = []
    for col in expected_cols:
        raw = clean_signal(df[col].astype(float))
        signal = raw.tolist()

        print(f"[调试] {col} 原始数据点数: {len(signal)}")
        print(f"[调试] {col} 统计特征: {compute_stats(raw)}")

        #print(f"[特征频率调试] 输入特征频率: {feature_freq_list}")
        #print(f"[特征频率调试] FFT 频率轴起点: {freqs_env[0]:.2f}Hz，终点: {freqs_env[-1]:.2f}Hz，步长: {(freqs_env[1]-freqs_env[0]):.4f}Hz")


        results.append({
            "type": "waveform",
            "axis": col,
            "length": len(signal),
            "data": signal[:10000]
        })

        rms_data = compute_rms(raw)
        results.append({
            "type": "rms",
            "axis": f"{col} RMS",
            "data": rms_data[:10000]
        })

        results.append({
            "type": "stat",
            "axis": f"{col} 统计量",
            "data": compute_stats(raw)
        })

        moving_mean_data = compute_moving_mean(raw, window)
        results.append({
            "type": "moving_mean",
            "axis": f"{col} 滑动均值",
            "data": moving_mean_data[:10000]
        })

        moving_std_data = compute_moving_std(raw, window)
        results.append({
            "type": "moving_std",
            "axis": f"{col} 滑动标准差",
            "data": moving_std_data[:10000]
        })

    return results, None
