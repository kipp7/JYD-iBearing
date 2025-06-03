import os
import pandas as pd

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def save_uploaded_file(file):
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)
    return filepath

def load_csv(filepath):
    """尝试用 GBK 或 UTF-8 编码打开 CSV 文件"""
    try:
        return pd.read_csv(filepath, encoding='gbk', engine='python')
    except:
        return pd.read_csv(filepath, encoding='utf-8', engine='python')
