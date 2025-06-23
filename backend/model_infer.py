import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from PyEMD import EMD
from file_handler import load_csv

# ------------------ 1. 模型结构定义 ------------------
class EMDCNNTransformer(nn.Module):
    def __init__(self, batch_size, input_channels, conv_archs, output_dim, hidden_dim, num_layers, num_heads, dropout_rate=0.5):
        super().__init__()
        self.batch_size = batch_size
        self.conv_arch = conv_archs
        self.input_channels = input_channels
        self.cnn_features = self.make_layers()
        self.hidden_dim = hidden_dim
        self.transformer = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(conv_archs[-1][-1], num_heads, hidden_dim, dropout=dropout_rate, batch_first=True),
            num_layers
        )
        self.avgpool = nn.AdaptiveAvgPool1d(1)
        self.classifier = nn.Linear(conv_archs[-1][-1], output_dim)
    
    def make_layers(self):
        layers = []
        for (num_convs, out_channels) in self.conv_arch:
            for _ in range(num_convs):
                layers.append(nn.Conv1d(self.input_channels, out_channels, kernel_size=3, padding=1))
                layers.append(nn.ReLU(inplace=True))
                self.input_channels = out_channels
            layers.append(nn.MaxPool1d(kernel_size=2, stride=2))
        return nn.Sequential(*layers)
    
    def forward(self, input_seq): 
        input_seq = input_seq.view(self.batch_size, -1, 128)
        cnn_features = self.cnn_features(input_seq)
        cnn_features = cnn_features.permute(0,2,1)
        transformer_output = self.transformer(cnn_features)
        output_avgpool = self.avgpool(transformer_output.transpose(1, 2))
        output_avgpool = output_avgpool.reshape(self.batch_size, -1)
        output = self.classifier(output_avgpool)
        return output

# ------------------ 2. 预处理函数 ------------------
def normalize(data):
    s = (data - np.min(data)) / (np.max(data) - np.min(data) + 1e-8)
    return s

def split_data_with_overlap(data, time_steps, overlap_ratio=0.5):
    stride = int(time_steps * (1 - overlap_ratio))
    samples = (len(data) - time_steps) // stride + 1
    data_list = []
    for i in range(samples):
        start_idx = i * stride
        end_idx = start_idx + time_steps
        temp_data = data[start_idx:end_idx].tolist()
        data_list.append(temp_data)
    return data_list

def imf_make_unify(data, imfs_unify=7):
    emd = EMD()
    IMFs = emd(data)
    if len(IMFs) == imfs_unify:
        return IMFs
    elif len(IMFs) > imfs_unify:
        data_front = IMFs[:imfs_unify-1, :]
        data_latter = IMFs[imfs_unify:, :]
        data_latter = np.sum(data_latter, 0)
        merged_data = np.vstack((data_front, data_latter))
        return merged_data
    else:
        # 分量不足，补零
        pad = np.zeros((imfs_unify - len(IMFs), IMFs.shape[1]))
        return np.vstack((IMFs, pad))

def preprocess_csv(filepath):
    """
    输入：原始csv文件路径
    输出：shape = (batch, 7, 1024) 的 numpy 数组
    - 已集成健壮的CSV加载来解决编码和数据类型错误。
    """
    try:
        # 1. 使用pandas健壮地加载CSV
        #    - `encoding='gbk'`：解决编码错误
        #    - `skiprows=10`：跳过文件顶部的文本表头，解决DtypeWarning
        df = pd.read_csv(
            filepath,
            header=None,
            encoding='gbk',
            skiprows=10, 
            low_memory=False
        )
        # 将所有数据转换为数值，无法转换的变为NaN，然后用0填充
        df_numeric = df.apply(pd.to_numeric, errors='coerce').fillna(0)

    except Exception as e:
        print(f"致命错误：加载CSV文件 {filepath} 失败: {e}")
        return None

    # 2. 只取前10列数据
    num_columns_to_take = min(10, df_numeric.shape[1])
    data = df_numeric.values[:, :num_columns_to_take]

    # 3. 每一列归一化
    for i in range(data.shape[1]):
        data[:, i] = normalize(data[:, i])

    # 4. 每一列滑窗切分
    all_samples = []
    for col in range(data.shape[1]):
        samples = split_data_with_overlap(data[:, col], 1024, overlap_ratio=0.5)
        all_samples.extend(samples)

    # 5. 只取前batch_size个样本
    batch_size = 32
    if len(all_samples) < batch_size:
        print(f"错误：生成的样本数量 ({len(all_samples)}) 不足 {batch_size} 个。")
        return None
        
    all_samples = all_samples[:batch_size]

    # 6. 对每个样本进行EMD分解
    emd_samples = []
    for sample in all_samples:
        imfs = imf_make_unify(np.array(sample), 7)
        emd_samples.append(imfs)

    # 7. 堆叠成最终的批次数据并返回
    emd_samples = np.stack(emd_samples)
    print(f"文件 {filepath} 预处理成功，输出形状: {emd_samples.shape}")
    
    return emd_samples

# ------------------ 3. 推理主函数 ------------------
def predict(filepath):
    # 模型参数
    batch_size = 32
    input_dim = 7 * 8
    conv_archs = ((1, 64), (1, 128))
    hidden_dim = 128
    output_dim = 10
    num_layers = 2
    num_heads = 4
    dropout_rate = 0.5

    # 加载模型
    model = EMDCNNTransformer(batch_size, input_dim, conv_archs, output_dim, hidden_dim, num_layers, num_heads, dropout_rate)
    torch.serialization.add_safe_globals({'EMDCNNTransformer': EMDCNNTransformer})
    model.load_state_dict(torch.load('best_model_emd_cnn_transformer_1.pt', map_location='cpu', weights_only=False))
    model.eval()

    # 数据预处理
    emd_samples = preprocess_csv(filepath)  # (batch, 7, 1024)
    # 转为 torch tensor
    x = torch.tensor(emd_samples, dtype=torch.float32)
    # 变形为 (batch, 7*8, 128)
    x = x.reshape(batch_size, 7*8, 128)
    with torch.no_grad():
        output = model(x)
        pred = torch.argmax(output, dim=1).cpu().numpy().tolist()
        prob = torch.softmax(output, dim=1).cpu().numpy().tolist()
    # 标签映射
    label_mapping = {
        0: "C1",1: "C2",2: "C3",3: "C4",4: "C5",
        5: "C6",6: "C7",7: "C8",8: "C9",9: "C10",
    }
    pred_label = [label_mapping.get(i, str(i)) for i in pred]
    return {'label': pred, 'label_name': pred_label, 'prob': prob}