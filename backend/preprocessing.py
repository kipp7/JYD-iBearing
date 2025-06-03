import numpy as np
import pandas as pd

def clean_signal(signal):
    """清洗异常值，去除 NaN、inf 和极端值"""
    signal = pd.Series(signal).dropna()
    signal = signal[np.isfinite(signal)]
    signal = signal[abs(signal) < 10]  # 默认过滤 ±10g 外的极值
    return signal

def compute_rms(signal, window=200):
    """滑动 RMS 值计算"""
    signal = np.array(signal)
    if len(signal) < window:
        return []
    return [np.sqrt(np.mean(signal[i:i+window] ** 2)) 
            for i in range(len(signal) - window + 1)]

def compute_stats(signal):
    """统计特征值：均值、标准差、峭度、偏度"""
    signal = np.array(signal)
    return [
        {"name": "均值", "value": float(np.mean(signal))},
        {"name": "标准差", "value": float(np.std(signal))},
        {"name": "峭度", "value": float(pd.Series(signal).kurtosis())},
        {"name": "偏度", "value": float(pd.Series(signal).skew())}
    ]

def compute_moving_mean(signal, window=200):
    """滑动均值"""
    signal = np.array(signal)
    if len(signal) < window:
        return []
    return [np.mean(signal[i:i+window]) for i in range(len(signal) - window + 1)]

def compute_moving_std(signal, window=200):
    """滑动标准差"""
    signal = np.array(signal)
    if len(signal) < window:
        return []
    return [np.std(signal[i:i+window]) for i in range(len(signal) - window + 1)]


def hampel_filter(signal, window_size=20, n_sigmas=3):
    x = signal.copy()
    L = 1.4826
    for i in range(window_size, len(x) - window_size):
        window = x[i - window_size:i + window_size]
        med = np.median(window)
        mad = L * np.median(np.abs(window - med))
        if np.abs(x[i] - med) > n_sigmas * mad:
            x[i] = med
    return x

def clean_signal_robust(signal, clip_range=10, hampel_window=20, hampel_nsig=3):
    """专业信号清洗（Hampel + Clip），用于频谱/包络谱分析"""
    signal = pd.Series(signal).dropna()
    signal = signal[np.isfinite(signal)]

    if len(signal) < hampel_window * 2:
        return signal

    signal = hampel_filter(signal.values, window_size=hampel_window, n_sigmas=hampel_nsig)
    signal = np.clip(signal, -clip_range, clip_range)
    return signal