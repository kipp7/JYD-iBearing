from flask import Flask, jsonify
from flask_cors import CORS
from routes import api

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 限制最大100MB
CORS(app)
app.register_blueprint(api, url_prefix='/api')

@app.errorhandler(413)
def handle_large_file(e):
    return jsonify({'error': '上传文件过大，最大支持 100MB'}), 413

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
