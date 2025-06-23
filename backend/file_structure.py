from typing import Dict, List, Optional
import pandas as pd
import json
import os

class FileStructureManager:
    def __init__(self):
        self.structure_template = {
            "required_columns": [],
            "optional_columns": [],
            "column_types": {},
            "column_descriptions": {}
        }
    
    def analyze_file_structure(self, file_path: str) -> Dict:
        """分析CSV文件结构并返回结构信息"""
        try:
            df = pd.read_csv(file_path, encoding='gbk', engine='python')
        except:
            df = pd.read_csv(file_path, encoding='utf-8', engine='python')
        
        structure = self.structure_template.copy()
        structure["required_columns"] = list(df.columns)
        structure["column_types"] = {col: str(df[col].dtype) for col in df.columns}
        
        return structure
    
    def save_structure_template(self, structure: Dict, template_name: str) -> str:
        """保存文件结构模板"""
        template_path = f"templates/{template_name}.json"
        os.makedirs("templates", exist_ok=True)
        
        with open(template_path, 'w', encoding='utf-8') as f:
            json.dump(structure, f, ensure_ascii=False, indent=2)
        
        return template_path
    
    def load_structure_template(self, template_name: str) -> Optional[Dict]:
        """加载文件结构模板"""
        template_path = f"templates/{template_name}.json"
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return None
    
    def validate_file_structure(self, file_path: str, template: Dict) -> tuple[bool, List[str]]:
        """验证文件结构是否符合模板要求"""
        try:
            df = pd.read_csv(file_path, encoding='gbk', engine='python')
        except:
            df = pd.read_csv(file_path, encoding='utf-8', engine='python')
        
        missing_columns = []
        for col in template["required_columns"]:
            if col not in df.columns:
                missing_columns.append(col)
        
        return len(missing_columns) == 0, missing_columns 